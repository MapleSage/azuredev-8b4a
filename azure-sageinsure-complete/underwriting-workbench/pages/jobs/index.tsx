'use client'

import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faList, 
  faCalendarAlt, 
  faCheckCircle, 
  faHourglassHalf,
  faExclamationCircle,
  faFileAlt,
  faArrowLeft,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons'

interface Job {
  jobId: string
  filename: string
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
  insuranceType: 'life' | 'property_casualty'
}

export default function JobsListPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs')
      if (response.ok) {
        const jobsData = await response.json()
        setJobs(jobsData)
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
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
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading jobs...</div>
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
          All Jobs
        </h1>
        <button
          onClick={() => window.location.href = '/'}
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
          Back to Upload
        </button>
      </div>

      {/* Jobs List */}
      <div>
        {jobs.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <FontAwesomeIcon icon={faFileAlt} style={{ fontSize: '48px', color: '#9ca3af', marginBottom: '16px' }} />
            <h3 style={{ color: '#374151', marginBottom: '8px' }}>No jobs found</h3>
            <p style={{ color: '#6b7280', marginBottom: '20px' }}>Upload a document to get started</p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Upload Document
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {jobs.map((job) => (
              <div 
                key={job.jobId} 
                onClick={() => window.location.href = `/jobs/${job.jobId}`}
                style={{
                  padding: '20px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
                      {job.filename}
                    </h3>
                    <span style={{ 
                      display: 'inline-block',
                      marginTop: '4px',
                      padding: '2px 8px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {job.insuranceType === 'life' ? 'Life Insurance' : 'Property & Casualty'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getStatusIcon(job.status)}
                    <span style={{ 
                      color: job.status === 'completed' ? '#10b981' : job.status === 'processing' ? '#f59e0b' : '#ef4444',
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {job.status}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '14px' }}>
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  <span>{formatDate(job.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
