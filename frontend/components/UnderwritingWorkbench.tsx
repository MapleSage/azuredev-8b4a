import { useState, useEffect } from 'react'

interface UnderwritingWorkbenchProps {}

export default function UnderwritingWorkbench({}: UnderwritingWorkbenchProps) {
  const [activeView, setActiveView] = useState<'workbench' | 'documents'>('workbench')
  const [workbenchUrl] = useState('https://dsu6ckke8guca.cloudfront.net')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {activeView === 'workbench' ? 'GenAI Underwriting Workbench' : 'Sample Documents'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {activeView === 'workbench' ? 'AI-powered document analysis and risk assessment' : 'Download sample documents for testing'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveView('workbench')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  activeView === 'workbench'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🔧 Workbench
              </button>
              <button
                onClick={() => setActiveView('documents')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  activeView === 'documents'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📄 Documents
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeView === 'workbench' ? (
        <>
          {isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Underwriting Workbench...</p>
              </div>
            </div>
          )}
          <div className={`flex-1 ${isLoading ? 'hidden' : 'block'}`}>
            <iframe
              src={workbenchUrl}
              className="w-full h-full border-0"
              title="GenAI Underwriting Workbench"
              allow="camera; microphone; clipboard-read; clipboard-write"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            />
          </div>
        </>
      ) : (
        <div className="flex-1 p-6 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-3">🏥</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Life Insurance Submission</h3>
                    <p className="text-sm text-gray-600">Sample life insurance application with medical history</p>
                  </div>
                </div>
                <a
                  href="/life_submission.pdf"
                  download
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  📥 Download Life Submission PDF
                </a>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-3">🏢</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">P&C Insurance Submission</h3>
                    <p className="text-sm text-gray-600">Sample property & casualty insurance application</p>
                  </div>
                </div>
                <a
                  href="/p&c_submission.pdf"
                  download
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  📥 Download P&C Submission PDF
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Info */}
      {activeView === 'workbench' && (
        <div className="flex-shrink-0 bg-gray-100 border-t border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>📄 Document Analysis</span>
              <span>🔍 Risk Assessment</span>
              <span>💬 AI Chat</span>
            </div>
            <div>
              Powered by AWS Bedrock & Step Functions
            </div>
          </div>
        </div>
      )}
    </div>
  )
}