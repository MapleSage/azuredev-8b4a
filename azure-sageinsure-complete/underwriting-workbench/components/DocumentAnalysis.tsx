'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faFileAlt, faExclamationCircle, faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons'

interface DocumentAnalysisProps {
  onAnalysisComplete: (data: any) => void
}

export default function DocumentAnalysis({ onAnalysisComplete }: DocumentAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [documentType, setDocumentType] = useState('life')

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsAnalyzing(true)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)

      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      setAnalysisResult(result)
      onAnalysisComplete(result)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Document Type Selection */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        padding: '24px' 
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Document Type
        </h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={() => setDocumentType('life')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              border: '1px solid',
              cursor: 'pointer',
              backgroundColor: documentType === 'life' ? '#dbeafe' : '#f3f4f6',
              color: documentType === 'life' ? '#1e40af' : '#374151',
              borderColor: documentType === 'life' ? '#3b82f6' : '#d1d5db'
            }}
          >
            Life Insurance
          </button>
          <button
            onClick={() => setDocumentType('pc')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              border: '1px solid',
              cursor: 'pointer',
              backgroundColor: documentType === 'pc' ? '#dbeafe' : '#f3f4f6',
              color: documentType === 'pc' ? '#1e40af' : '#374151',
              borderColor: documentType === 'pc' ? '#3b82f6' : '#d1d5db'
            }}
          >
            P&C Insurance
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        padding: '24px' 
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Upload Document
        </h2>
        
        <div style={{
          border: '2px dashed #d1d5db',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s'
        }}>
          <input 
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faUpload} style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '16px' }} />
            <p style={{ color: '#6b7280', marginBottom: '8px' }}>
              Drag and drop a document here, or click to select
            </p>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              Supports PDF, TXT, DOC, DOCX files
            </p>
          </label>
        </div>

        {isAnalyzing && (
          <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faSpinner} spin style={{ color: '#3b82f6', marginRight: '8px' }} />
            <span style={{ color: '#3b82f6' }}>Analyzing document with Azure OpenAI...</span>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          padding: '24px' 
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
            Analysis Results
          </h2>
          
          {/* Key Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <FontAwesomeIcon icon={faFileAlt} style={{ color: '#3b82f6', marginRight: '8px' }} />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Document Type</span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                {analysisResult.documentType || 'Unknown'}
              </p>
            </div>
            
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <FontAwesomeIcon icon={faExclamationCircle} style={{ color: '#f59e0b', marginRight: '8px' }} />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Risk Level</span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                {analysisResult.riskLevel || 'Pending'}
              </p>
            </div>
            
            <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981', marginRight: '8px' }} />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280' }}>Status</span>
              </div>
              <p style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                {analysisResult.status || 'Complete'}
              </p>
            </div>
          </div>

          {/* Extracted Information */}
          {analysisResult.extractedData && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                Extracted Information
              </h3>
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px' }}>
                <pre style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {JSON.stringify(analysisResult.extractedData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Analysis Summary */}
          {analysisResult.summary && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
                Analysis Summary
              </h3>
              <p style={{ color: '#374151', lineHeight: '1.6', margin: 0 }}>
                {analysisResult.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
