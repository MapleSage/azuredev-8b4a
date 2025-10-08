import { useState, useEffect } from 'react'

interface DocumentUpload {
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'extracting' | 'classifying' | 'routing' | 'completed' | 'error'
  classification?: string
  extractedData?: any
  executionArn?: string
  claimId?: string
  routing?: string
}

export default function FNOLProcessor() {
  const [uploads, setUploads] = useState<DocumentUpload[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const monitorExecution = async (executionArn: string, uploadIndex: number) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/fnol-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ executionArn })
        })

        if (!response.ok) {
          clearInterval(pollInterval)
          return
        }

        const status = await response.json()
        
        setUploads(prev => prev.map((u, idx) => {
          if (idx === uploadIndex) {
            if (status.status === 'SUCCEEDED') {
              clearInterval(pollInterval)
              return {
                ...u,
                status: 'completed',
                claimId: status.output?.claimId,
                routing: status.output?.status
              }
            } else if (status.status === 'FAILED') {
              clearInterval(pollInterval)
              return { ...u, status: 'error' }
            } else {
              const stepStatus = getStepStatus(status.currentState)
              return { ...u, status: stepStatus }
            }
          }
          return u
        }))
      } catch (error) {
        console.error('Status polling error:', error)
        clearInterval(pollInterval)
      }
    }, 2000)

    setTimeout(() => clearInterval(pollInterval), 300000)
  }

  const getStepStatus = (stateName: string): DocumentUpload['status'] => {
    switch (stateName) {
      case 'ExtractText':
      case 'WaitForTextract':
      case 'GetTextractResults':
        return 'extracting'
      case 'ClassifyWithBedrock':
        return 'classifying'
      case 'StoreResults':
      case 'RouteDocument':
        return 'routing'
      default:
        return 'processing'
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const newUploads: DocumentUpload[] = Array.from(files).map(file => ({
      file,
      status: 'pending'
    }))

    setUploads(prev => [...prev, ...newUploads])
    setIsProcessing(true)

    // Process each file
    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i]
      
      try {
        // Update status to processing
        setUploads(prev => prev.map((u, idx) => 
          idx === prev.length - newUploads.length + i 
            ? { ...u, status: 'processing' }
            : u
        ))

        setUploads(prev => prev.map((u, idx) => 
          idx === prev.length - newUploads.length + i 
            ? { ...u, status: 'uploading' }
            : u
        ))

        const formData = new FormData()
        formData.append('document', upload.file)

        const response = await fetch('/api/fnol-processor', {
          method: 'POST',
          body: formData
        })

        if (!response.ok) throw new Error(`Processing failed: ${response.status}`)

        const result = await response.json()

        setUploads(prev => prev.map((u, idx) => 
          idx === prev.length - newUploads.length + i 
            ? { 
                ...u, 
                status: 'processing',
                classification: result.classification,
                extractedData: result.extractedData,
                executionArn: result.executionArn,
                routing: result.routing
              }
            : u
        ))

        if (result.executionArn) {
          monitorExecution(result.executionArn, uploads.length - newUploads.length + i)
        }

      } catch (error) {
        setUploads(prev => prev.map((u, idx) => 
          idx === prev.length - newUploads.length + i 
            ? { ...u, status: 'error' }
            : u
        ))
      }
    }

    setIsProcessing(false)
  }

  return (
    <div className="h-full bg-white overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">📄</div>
          <div>
            <h1 className="text-2xl font-bold">FNOL Document Processor</h1>
            <p className="text-green-100">Azure AI Document Intelligence powered classification</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Upload Area */}
        <div className="mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-semibold mb-2">Upload Insurance Documents</h3>
            <p className="text-gray-600 mb-4">
              Upload PDF documents for automatic classification and processing
            </p>
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
                isProcessing 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              } transition-colors`}
            >
              {isProcessing ? 'Processing...' : 'Select PDF Files'}
            </label>
          </div>
        </div>

        {/* Processing Pipeline */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">DocStream Processing Pipeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-xl mb-1">📤</div>
              <h4 className="font-medium text-sm">Upload</h4>
              <p className="text-xs text-gray-600">S3 Staging</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-xl mb-1">🔍</div>
              <h4 className="font-medium text-sm">Extract</h4>
              <p className="text-xs text-gray-600">Form Recognizer</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-xl mb-1">🤖</div>
              <h4 className="font-medium text-sm">Classify</h4>
              <p className="text-xs text-gray-600">Azure OpenAI</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-xl mb-1">📊</div>
              <h4 className="font-medium text-sm">Extract KV</h4>
              <p className="text-xs text-gray-600">Key-Values</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg text-center">
              <div className="text-xl mb-1">📋</div>
              <h4 className="font-medium text-sm">Route</h4>
              <p className="text-xs text-gray-600">Cosmos DB</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-xl mb-1">📦</div>
              <h4 className="font-medium text-sm">Archive</h4>
              <p className="text-xs text-gray-600">Blob Storage</p>
            </div>
          </div>
        </div>

        {/* Document Results */}
        {uploads.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Processing Results</h3>
            <div className="space-y-4">
              {uploads.map((upload, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">📄</div>
                      <div>
                        <h4 className="font-medium">{upload.file.name}</h4>
                        <p className="text-sm text-gray-600">
                          {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      upload.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                      upload.status === 'uploading' ? 'bg-blue-100 text-blue-800' :
                      upload.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      upload.status === 'extracting' ? 'bg-purple-100 text-purple-800' :
                      upload.status === 'classifying' ? 'bg-indigo-100 text-indigo-800' :
                      upload.status === 'routing' ? 'bg-orange-100 text-orange-800' :
                      upload.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {upload.status === 'pending' && '⏳ Pending'}
                      {upload.status === 'uploading' && '📤 Uploading'}
                      {upload.status === 'processing' && '🔄 Processing'}
                      {upload.status === 'extracting' && '🔍 Extracting Text'}
                      {upload.status === 'classifying' && '🤖 Classifying'}
                      {upload.status === 'routing' && '📋 Routing'}
                      {upload.status === 'completed' && '✅ Completed'}
                      {upload.status === 'error' && '❌ Error'}
                    </div>
                  </div>
                  
                  {upload.classification && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <p className="font-medium">Classification: {upload.classification}</p>
                      {upload.claimId && (
                        <p className="text-sm text-green-600 font-medium mt-1">Claim ID: {upload.claimId}</p>
                      )}
                      {upload.routing && (
                        <p className="text-sm text-blue-600 mt-1">Routing: {upload.routing}</p>
                      )}
                      {upload.extractedData && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p>Extracted {Object.keys(upload.extractedData).length} key-value pairs</p>
                          <div className="mt-2 max-h-32 overflow-y-auto">
                            {Object.entries(upload.extractedData).map(([key, value]) => (
                              <div key={key} className="flex justify-between py-1 border-b border-gray-200 last:border-b-0">
                                <span className="font-medium">{key}:</span>
                                <span className="text-gray-700">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* S3 Bucket Flow */}
        {uploads.some(u => u.status === 'completed') && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">S3 Bucket Flow</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <div className="bg-blue-100 p-3 rounded text-center">
                <div className="text-lg mb-1">📦</div>
                <p className="text-xs font-medium">scanning-staging</p>
                <p className="text-xs text-gray-600">Upload</p>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-gray-400">→</div>
              </div>
              <div className="bg-yellow-100 p-3 rounded text-center">
                <div className="text-lg mb-1">⚙️</div>
                <p className="text-xs font-medium">scanning-in-process</p>
                <p className="text-xs text-gray-600">Processing</p>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-gray-400">→</div>
              </div>
              <div className="bg-green-100 p-3 rounded text-center">
                <div className="text-lg mb-1">📊</div>
                <p className="text-xs font-medium">archive</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
            </div>
          </div>
        )}

        {/* Architecture Info */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3">DocStream Architecture</h3>
            <div className="text-blue-700 space-y-2 text-sm">
              <p>• <strong>Logic Apps:</strong> Orchestrates the entire processing workflow</p>
              <p>• <strong>Blob Storage:</strong> Staging → In-Process → Text → Archive</p>
              <p>• <strong>Azure Functions:</strong> 6 specialized processing functions</p>
              <p>• <strong>Cosmos DB:</strong> Stores extracted claim data and metadata</p>
              <p>• <strong>Event Grid:</strong> Scheduled processing (Mon-Fri 5PM EST)</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Processing Steps</h3>
            <div className="text-green-700 space-y-2 text-sm">
              <p>• <strong>Document Upload:</strong> PDFs uploaded to scanning-staging container</p>
              <p>• <strong>Text Extraction:</strong> Form Recognizer processes documents asynchronously</p>
              <p>• <strong>AI Classification:</strong> Azure OpenAI determines document type</p>
              <p>• <strong>Key-Value Extraction:</strong> Structured data extraction</p>
              <p>• <strong>Routing Decision:</strong> Claims vs non-insurance documents</p>
              <p>• <strong>Archive & Cleanup:</strong> Final storage and resource cleanup</p>
              <p>• <strong>Non-Insurance Docs:</strong> Routed to separate bucket for review</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}