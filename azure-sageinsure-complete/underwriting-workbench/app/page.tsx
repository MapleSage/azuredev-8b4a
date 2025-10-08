'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faShieldAlt, 
  faFileAlt, 
  faStethoscope, 
  faRobot, 
  faFileMedical, 
  faList, 
  faHeartbeat,
  faHome,
} from '@fortawesome/free-solid-svg-icons'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insuranceType, setInsuranceType] = useState<'life' | 'property_casualty'>('property_casualty')

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    setError(null)
    
    if (!selectedFile) {
      return
    }

    if (!selectedFile.type.includes('pdf')) {
      setError('Please select a PDF file')
      return
    }

    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('insuranceType', insuranceType)

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      // Navigate to job page
      window.location.href = `/jobs/${result.jobId}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
      }}>
        <h1 style={{ margin: 0, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/sageinsure_logo.png" 
            alt="SageInsure" 
            style={{ height: '100px', width: '100px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          SageInsure Workbench
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px',
              padding: '8px 12px',
              backgroundColor: insuranceType === 'life' ? '#2563eb' : '#e5e7eb',
              color: insuranceType === 'life' ? 'white' : '#374151',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="headerInsuranceType" 
                value="life" 
                checked={insuranceType === 'life'}
                onChange={() => setInsuranceType('life')}
                style={{ display: 'none' }}
              />
              <FontAwesomeIcon icon={faHeartbeat} />
              <span>Life</span>
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px',
              padding: '8px 12px',
              backgroundColor: insuranceType === 'property_casualty' ? '#2563eb' : '#e5e7eb',
              color: insuranceType === 'property_casualty' ? 'white' : '#374151',
              borderRadius: '6px',
              cursor: 'pointer'
            }}>
              <input 
                type="radio" 
                name="headerInsuranceType" 
                value="property_casualty" 
                checked={insuranceType === 'property_casualty'}
                onChange={() => setInsuranceType('property_casualty')}
                style={{ display: 'none' }}
              />
              <FontAwesomeIcon icon={faHome} />
              <span>P&C</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.location.href = '/underwriter'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <FontAwesomeIcon icon={faRobot} />
              Underwriter Agent
            </button>
            <button
              onClick={() => window.location.href = '/cyber-insurance'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <FontAwesomeIcon icon={faShieldAlt} />
              Cyber Insurance
            </button>
            <button
              onClick={() => window.location.href = '/fnol-processor'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#9b59b6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <FontAwesomeIcon icon={faFileAlt} />
              FNOL Processor
            </button>
            <button
              onClick={() => window.location.href = '/policy-assistant'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <FontAwesomeIcon icon={faRobot} />
              Policy Assistant
            </button>
            <button
              onClick={() => window.location.href = '/policy-assistant'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <FontAwesomeIcon icon={faRobot} />
              Policy Assistant
            </button>
            <button
              onClick={() => window.location.href = '/jobs'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <FontAwesomeIcon icon={faList} />
              View All Jobs
            </button>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#1f2937', marginBottom: '16px' }}>
          {insuranceType === 'life' 
            ? 'Streamline Your Life Insurance Underwriting' 
            : 'Streamline Your Property & Casualty Insurance Underwriting'}
        </h2>
        <p style={{ color: '#6b7280', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
          {insuranceType === 'life' 
            ? 'Transform complex life insurance applications and medical documents into actionable insights using advanced AI analysis powered by Azure OpenAI and GPT-4o. Purpose-built for life insurance underwriters to automatically extract, analyze, and evaluate risk factors from application packets.'
            : 'Transform complex property & casualty insurance applications and ACORD forms into actionable insights using advanced AI analysis powered by Azure OpenAI and GPT-4o. Purpose-built for P&C insurance underwriters to automatically extract, analyze, and evaluate property risk factors from application packets.'}
        </p>
        
        {/* Features Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1f2937', marginBottom: '12px' }}>
              <FontAwesomeIcon icon={faFileAlt} style={{ color: '#2563eb' }} />
              Document Analysis
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
              {insuranceType === 'life' ? (
                <>
                  <li>Process complete life insurance application packets</li>
                  <li>Extract medical history and risk factors</li>
                  <li>Automatic classification of APS and lab reports</li>
                </>
              ) : (
                <>
                  <li>Process complete P&C insurance application packets</li>
                  <li>Extract property details and risk factors</li>
                  <li>Automatic classification of ACORD forms</li>
                </>
              )}
            </ul>
          </div>

          <div style={{ 
            padding: '20px', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1f2937', marginBottom: '12px' }}>
              <FontAwesomeIcon icon={insuranceType === 'life' ? faStethoscope : faHome} style={{ color: '#2563eb' }} />
              {insuranceType === 'life' ? 'Underwriter Analysis' : 'Property Assessment'}
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
              {insuranceType === 'life' ? (
                <>
                  <li>AI-driven mortality risk assessment</li>
                  <li>Medical history timeline construction</li>
                  <li>Cross-reference discrepancies across documents</li>
                  <li>Automated medical condition evaluation</li>
                </>
              ) : (
                <>
                  <li>AI-driven property risk assessment</li>
                  <li>Detailed property characteristics analysis</li>
                  <li>Cross-reference discrepancies across documents</li>
                  <li>Environmental and geographical risk evaluation</li>
                </>
              )}
            </ul>
          </div>

          <div style={{ 
            padding: '20px', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1f2937', marginBottom: '12px' }}>
              <FontAwesomeIcon icon={faRobot} style={{ color: '#2563eb' }} />
              Interactive Assistant
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
              {insuranceType === 'life' ? (
                <>
                  <li>Query complex medical histories</li>
                  <li>Instant access to policy-relevant details</li>
                  <li>Navigate multi-document applications</li>
                </>
              ) : (
                <>
                  <li>Query property details and risk factors</li>
                  <li>Instant access to policy-relevant details</li>
                  <li>Navigate complex ACORD forms</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Supported Documents */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#1f2937', marginBottom: '12px' }}>Supported Documents</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {insuranceType === 'life' ? (
              <>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Life Insurance Applications</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Attending Physician Statements (APS)</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Lab Reports</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Pharmacy Records</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Financial Disclosures</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Medical History Questionnaires</span>
              </>
            ) : (
              <>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>ACORD Forms</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Property Inspections</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Claims History</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Property Valuations</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Flood Zone Certificates</span>
                <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>Building Code Compliance</span>
              </>
            )}
            <span style={{ padding: '4px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '14px' }}>And More</span>
          </div>
        </div>
      </div>
      
      {/* Upload Section */}
      <div style={{ 
        padding: '30px', 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1f2937', marginBottom: '20px' }}>
          <FontAwesomeIcon icon={faFileMedical} style={{ color: '#2563eb' }} />
          Upload Document
        </h2>
        
        {/* Insurance Type Selector */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#1f2937', marginBottom: '12px' }}>Insurance Type</h3>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: insuranceType === 'life' ? '#2563eb' : '#f3f4f6',
              color: insuranceType === 'life' ? 'white' : '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '2px solid',
              borderColor: insuranceType === 'life' ? '#2563eb' : '#d1d5db'
            }}>
              <input 
                type="radio" 
                name="insuranceType" 
                value="life" 
                checked={insuranceType === 'life'}
                onChange={() => setInsuranceType('life')}
                style={{ display: 'none' }}
              />
              <FontAwesomeIcon icon={faHeartbeat} />
              <span>Life Insurance</span>
            </label>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '12px 16px',
              backgroundColor: insuranceType === 'property_casualty' ? '#2563eb' : '#f3f4f6',
              color: insuranceType === 'property_casualty' ? 'white' : '#374151',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '2px solid',
              borderColor: insuranceType === 'property_casualty' ? '#2563eb' : '#d1d5db'
            }}>
              <input 
                type="radio" 
                name="insuranceType" 
                value="property_casualty" 
                checked={insuranceType === 'property_casualty'}
                onChange={() => setInsuranceType('property_casualty')}
                style={{ display: 'none' }}
              />
              <FontAwesomeIcon icon={faHome} />
              <span>Property & Casualty</span>
            </label>
          </div>
        </div>
        
        {/* File Input */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '12px',
              border: '2px dashed #d1d5db',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              cursor: 'pointer'
            }}
          />
        </div>
        
        {file && (
          <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #0ea5e9' }}>
            <p style={{ margin: 0, color: '#0c4a6e' }}>Selected file: {file.name}</p>
            <button 
              onClick={handleUpload}
              disabled={uploading}
              style={{
                marginTop: '10px',
                padding: '12px 24px',
                backgroundColor: uploading ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              {uploading ? 'Uploading...' : 'Analyze Document'}
            </button>
          </div>
        )}

        {error && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#fef2f2', 
            color: '#dc2626', 
            borderRadius: '6px', 
            border: '1px solid #fca5a5' 
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}