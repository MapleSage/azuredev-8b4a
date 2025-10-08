import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileAlt, faUpload, faCheckCircle, faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons'

export default function FNOLProcessor() {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    setFiles(selectedFiles)
  }

  const processDocuments = async () => {
    if (files.length === 0) return
    
    setProcessing(true)
    setResults([])
    
    // Simulate document processing
    const processedResults = await Promise.all(
      files.map(async (file, index) => {
        await new Promise(resolve => setTimeout(resolve, 1000 + index * 500))
        
        const isValidClaim = Math.random() > 0.3
        const docTypes = ['Auto Insurance Claim', 'Medical Bill', 'Police Report', 'Repair Estimate', 'Photo Evidence']
        const docType = docTypes[Math.floor(Math.random() * docTypes.length)]
        
        return {
          fileName: file.name,
          documentType: docType,
          confidence: (Math.random() * 20 + 80).toFixed(1),
          isValidClaim,
          extractedData: isValidClaim ? {
            claimNumber: `CLM-${Math.floor(Math.random() * 100000)}`,
            policyNumber: `POL-${Math.floor(Math.random() * 100000)}`,
            incidentDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
            estimatedDamage: `$${(Math.random() * 50000 + 5000).toLocaleString()}`
          } : null,
          processingTime: (Math.random() * 3 + 2).toFixed(1)
        }
      })
    )
    
    setResults(processedResults)
    setProcessing(false)
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '20px 40px',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ margin: 0, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '15px', fontSize: '2rem' }}>
          <img 
            src="/sageinsure_logo.png" 
            alt="SageInsure" 
            style={{ height: '100px', width: '100px' }}
            onError={(e) => e.currentTarget.style.display = 'none'}
          />
          DocStream FNOL Processor
        </h1>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Back to Workbench
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Upload Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '20px', 
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h2 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '1.8rem' }}>
            <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: '10px', color: '#3498db' }} />
            Upload Insurance Documents
          </h2>
          
          <div style={{
            border: '3px dashed #3498db',
            borderRadius: '15px',
            padding: '60px 20px',
            textAlign: 'center',
            background: '#f8f9fa',
            marginBottom: '20px'
          }}>
            <FontAwesomeIcon icon={faUpload} style={{ fontSize: '4rem', color: '#3498db', marginBottom: '20px' }} />
            <div style={{ fontSize: '1.2rem', color: '#2c3e50', marginBottom: '10px' }}>
              Drop PDF files here or click to browse
            </div>
            <div style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
              Supports: Auto Claims, Medical Bills, Police Reports, Repair Estimates
            </div>
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer'
              }}
            />
          </div>

          {files.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Selected Files:</h3>
              {files.map((file, index) => (
                <div key={index} style={{ 
                  padding: '10px', 
                  background: '#f8f9fa', 
                  borderRadius: '8px', 
                  marginBottom: '5px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{file.name}</span>
                  <span style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={processDocuments}
            disabled={files.length === 0 || processing}
            style={{
              width: '100%',
              padding: '18px',
              background: processing ? '#95a5a6' : 'linear-gradient(135deg, #3498db, #2980b9)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: processing ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
          >
            {processing ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '10px' }} />
                Processing Documents...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: '10px' }} />
                Process Documents with AI
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div style={{ 
            background: 'white', 
            borderRadius: '20px', 
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '30px', fontSize: '1.8rem' }}>
              📊 Processing Results
            </h2>

            {results.map((result, index) => (
              <div key={index} style={{
                background: result.isValidClaim ? '#e8f5e8' : '#fef9e7',
                border: `2px solid ${result.isValidClaim ? '#27ae60' : '#f39c12'}`,
                borderRadius: '15px',
                padding: '25px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#2c3e50' }}>{result.fileName}</h3>
                  <span style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    background: result.isValidClaim ? '#27ae60' : '#f39c12',
                    color: 'white'
                  }}>
                    {result.isValidClaim ? (
                      <>
                        <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '5px' }} />
                        Valid Claim
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '5px' }} />
                        Needs Review
                      </>
                    )}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                  <div>
                    <strong>Document Type:</strong><br />
                    {result.documentType}
                  </div>
                  <div>
                    <strong>Confidence:</strong><br />
                    {result.confidence}%
                  </div>
                  <div>
                    <strong>Processing Time:</strong><br />
                    {result.processingTime}s
                  </div>
                </div>

                {result.extractedData && (
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '20px', 
                    background: 'rgba(39, 174, 96, 0.1)', 
                    borderRadius: '10px' 
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', color: '#27ae60' }}>Extracted Claim Data:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      <div><strong>Claim Number:</strong> {result.extractedData.claimNumber}</div>
                      <div><strong>Policy Number:</strong> {result.extractedData.policyNumber}</div>
                      <div><strong>Incident Date:</strong> {result.extractedData.incidentDate}</div>
                      <div><strong>Estimated Damage:</strong> {result.extractedData.estimatedDamage}</div>
                    </div>
                  </div>
                )}

                {!result.isValidClaim && (
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '15px', 
                    background: 'rgba(243, 156, 18, 0.1)', 
                    borderRadius: '10px' 
                  }}>
                    <strong>Action Required:</strong> Document requires manual review for proper classification.
                  </div>
                )}
              </div>
            ))}

            <div style={{ 
              marginTop: '30px', 
              padding: '20px', 
              background: '#e8f4fd', 
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px' }}>Processing Summary</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3498db' }}>
                    {results.length}
                  </div>
                  <div style={{ color: '#7f8c8d' }}>Total Processed</div>
                </div>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>
                    {results.filter(r => r.isValidClaim).length}
                  </div>
                  <div style={{ color: '#7f8c8d' }}>Valid Claims</div>
                </div>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f39c12' }}>
                    {results.filter(r => !r.isValidClaim).length}
                  </div>
                  <div style={{ color: '#7f8c8d' }}>Need Review</div>
                </div>
                <div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#9b59b6' }}>
                    {(results.reduce((sum, r) => sum + parseFloat(r.processingTime), 0) / results.length).toFixed(1)}s
                  </div>
                  <div style={{ color: '#7f8c8d' }}>Avg Time</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}