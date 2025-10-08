'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faArrowLeft,
  faFileAlt,
  faCheckCircle,
  faHourglassHalf,
  faExclamationCircle,
  faShieldAlt,
  faCalendarAlt,
  faRobot
} from '@fortawesome/free-solid-svg-icons'

interface JobDetails {
  jobId: string
  filename: string
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
  insuranceType: 'life' | 'property_casualty'
  analysis?: {
    summary: string
    riskFactors: string[]
    recommendations: string[]
    extractedData: any
  }
}

export default function JobPage() {
  const router = useRouter()
  const { jobId } = router.query
  const [job, setJob] = useState<JobDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (jobId) {
      fetchJobDetails(jobId as string)
    }
  }, [jobId])

  const fetchJobDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`)
      if (response.ok) {
        const jobData = await response.json()
        setJob(jobData)
      } else {
        setError('Job not found')
      }
    } catch (error) {
      console.error('Failed to fetch job details:', error)
      setError('Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981' }} />
      case 'processing':
        return <FontAwesomeIcon icon={faHourglassHalf} style={{ color: '#f59e0b' }} />
      case 'failed':
        return <FontAwesomeIcon icon={faExclamationCircle} style={{ color: '#ef4444' }} />
      default:
        return <FontAwesomeIcon icon={faHourglassHalf} style={{ color: '#6b7280' }} />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading job details...</div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Error</h2>
          <p style={{ color: '#6b7280', marginBottom: '20px' }}>{error || 'Job not found'}</p>
          <button
            onClick={() => router.push('/jobs')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Back to Jobs
          </button>
        </div>
      </div>
    )
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
          <FontAwesomeIcon icon={faShieldAlt} />
          Job Details
        </h1>
        <button
          onClick={() => router.push('/jobs')}
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
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to Jobs
        </button>
      </div>

      {/* Job Info Card */}
      <div style={{
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#1f2937', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
              {job.filename}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ 
                padding: '4px 12px',
                backgroundColor: '#dbeafe',
                color: '#1e40af',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {job.insuranceType === 'life' ? 'Life Insurance' : 'Property & Casualty'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '14px' }}>
                <FontAwesomeIcon icon={faCalendarAlt} />
                <span>{formatDate(job.createdAt)}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getStatusIcon(job.status)}
            <span style={{ 
              color: job.status === 'completed' ? '#10b981' : job.status === 'processing' ? '#f59e0b' : '#ef4444',
              fontWeight: '600',
              textTransform: 'capitalize',
              fontSize: '16px'
            }}>
              {job.status}
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      {job.status === 'completed' && job.analysis ? (
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Summary */}
          <div style={{
            padding: '24px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ 
              margin: 0, 
              marginBottom: '16px', 
              color: '#1f2937', 
              fontSize: '18px', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FontAwesomeIcon icon={faRobot} style={{ color: '#2563eb' }} />
              AI Analysis Summary
            </h3>
            <p style={{ color: '#374151', lineHeight: '1.6', margin: 0 }}>
              {job.analysis.summary}
            </p>
          </div>

          {/* Risk Factors */}
          {job.analysis.riskFactors && job.analysis.riskFactors.length > 0 && (
            <div style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ 
                margin: 0, 
                marginBottom: '16px', 
                color: '#1f2937', 
                fontSize: '18px', 
                fontWeight: '600'
              }}>
                Risk Factors Identified
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {job.analysis.riskFactors.map((factor, index) => (
                  <li key={index} style={{ color: '#374151', marginBottom: '8px' }}>
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {job.analysis.recommendations && job.analysis.recommendations.length > 0 && (
            <div style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ 
                margin: 0, 
                marginBottom: '16px', 
                color: '#1f2937', 
                fontSize: '18px', 
                fontWeight: '600'
              }}>
                Recommendations
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {job.analysis.recommendations.map((rec, index) => (
                  <li key={index} style={{ color: '#374151', marginBottom: '8px' }}>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Extracted Data */}
          {job.analysis.extractedData && (
            <div style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ 
                margin: 0, 
                marginBottom: '16px', 
                color: '#1f2937', 
                fontSize: '18px', 
                fontWeight: '600'
              }}>
                Extracted Data
              </h3>
              <div style={{
                backgroundColor: '#f8f9fa',
                padding: '16px',
                borderRadius: '6px',
                border: '1px solid #e9ecef'
              }}>
                <pre style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: '#495057',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify(job.analysis.extractedData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : job.status === 'processing' ? (
        <div style={{
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <FontAwesomeIcon icon={faHourglassHalf} style={{ fontSize: '48px', color: '#f59e0b', marginBottom: '16px' }} />
          <h3 style={{ color: '#374151', marginBottom: '8px' }}>Processing Document</h3>
          <p style={{ color: '#6b7280' }}>Your document is being analyzed. This may take a few minutes.</p>
        </div>
      ) : (
        <div style={{
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <FontAwesomeIcon icon={faExclamationCircle} style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px' }} />
          <h3 style={{ color: '#374151', marginBottom: '8px' }}>Processing Failed</h3>
          <p style={{ color: '#6b7280' }}>There was an error processing your document. Please try uploading again.</p>
        </div>
      )}
    </div>
  )
}
