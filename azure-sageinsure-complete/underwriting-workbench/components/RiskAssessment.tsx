'use client'

import { useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle, faCheckCircle, faTimesCircle, faArrowUp } from '@fortawesome/free-solid-svg-icons'

interface RiskAssessmentProps {
  data?: any
}

export default function RiskAssessment({ data }: RiskAssessmentProps) {
  const riskData = useMemo(() => {
    if (!data) {
      return {
        overallRisk: 'Medium',
        riskScore: 65,
        factors: [
          { name: 'Age', value: 'Low Risk', score: 85 },
          { name: 'Health History', value: 'Medium Risk', score: 60 },
          { name: 'Lifestyle', value: 'Low Risk', score: 80 },
          { name: 'Financial Status', value: 'Low Risk', score: 90 }
        ]
      }
    }
    return data
  }, [data])

  const getRiskColor = (score: number) => {
    if (score >= 80) return '#10b981' // Green
    if (score >= 60) return '#f59e0b' // Yellow
    return '#ef4444' // Red
  }

  const getRiskIcon = (score: number) => {
    if (score >= 80) return faCheckCircle
    if (score >= 60) return faExclamationTriangle
    return faTimesCircle
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Overall Risk Score */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        padding: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Overall Risk Assessment
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: getRiskColor(riskData.riskScore),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px',
            fontWeight: '700'
          }}>
            {riskData.riskScore}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#1f2937' }}>
              {riskData.overallRisk} Risk
            </h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              Risk Score: {riskData.riskScore}/100
            </p>
          </div>
        </div>

        <div style={{ 
          width: '100%', 
          height: '8px', 
          backgroundColor: '#e5e7eb', 
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${riskData.riskScore}%`,
            height: '100%',
            backgroundColor: getRiskColor(riskData.riskScore),
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Risk Factors Breakdown */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        padding: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Risk Factors Breakdown
        </h3>
        
        <div style={{ display: 'grid', gap: '16px' }}>
          {riskData.factors.map((factor: any, index: number) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FontAwesomeIcon 
                  icon={getRiskIcon(factor.score)} 
                  style={{ color: getRiskColor(factor.score), fontSize: '20px' }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                    {factor.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                    {factor.value}
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: getRiskColor(factor.score)
                }}>
                  {factor.score}/100
                </span>
                <div style={{ 
                  width: '60px', 
                  height: '6px', 
                  backgroundColor: '#e5e7eb', 
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${factor.score}%`,
                    height: '100%',
                    backgroundColor: getRiskColor(factor.score)
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Trends */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        padding: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Risk Analysis Summary
        </h3>
        
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid #0ea5e9'
          }}>
            <FontAwesomeIcon icon={faArrowUp} style={{ color: '#0ea5e9' }} />
            <span style={{ fontSize: '14px', color: '#0c4a6e' }}>
              Risk assessment completed with high confidence
            </span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '12px',
            backgroundColor: '#f0fdf4',
            borderRadius: '6px',
            border: '1px solid #10b981'
          }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '14px', color: '#064e3b' }}>
              All required documentation reviewed
            </span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '12px',
            backgroundColor: '#fffbeb',
            borderRadius: '6px',
            border: '1px solid #f59e0b'
          }}>
            <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '14px', color: '#92400e' }}>
              Recommend additional medical screening
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}