'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowUp, faArrowDown, faUsers, faFileAlt, faClock, faDollarSign } from '@fortawesome/free-solid-svg-icons'

export default function PortfolioDashboard() {
  const mockData = {
    totalPolicies: 1247,
    activeClaims: 23,
    pendingReviews: 8,
    monthlyPremium: 2450000
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: 0 }}>Total Policies</h3>
            <FontAwesomeIcon icon={faUsers} style={{ color: '#3b82f6' }} />
          </div>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '8px' }}>
            {mockData.totalPolicies.toLocaleString()}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faArrowUp} style={{ color: '#10b981', fontSize: '14px' }} />
            <span style={{ fontSize: '14px', color: '#10b981' }}>+12% from last month</span>
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: 0 }}>Active Claims</h3>
            <FontAwesomeIcon icon={faFileAlt} style={{ color: '#f59e0b' }} />
          </div>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '8px' }}>
            {mockData.activeClaims}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faArrowDown} style={{ color: '#ef4444', fontSize: '14px' }} />
            <span style={{ fontSize: '14px', color: '#ef4444' }}>-3% from last month</span>
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: 0 }}>Pending Reviews</h3>
            <FontAwesomeIcon icon={faClock} style={{ color: '#f59e0b' }} />
          </div>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '8px' }}>
            {mockData.pendingReviews}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faArrowUp} style={{ color: '#10b981', fontSize: '14px' }} />
            <span style={{ fontSize: '14px', color: '#10b981' }}>+2 from yesterday</span>
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
          padding: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: 0 }}>Monthly Premium</h3>
            <FontAwesomeIcon icon={faDollarSign} style={{ color: '#10b981' }} />
          </div>
          <p style={{ fontSize: '32px', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '8px' }}>
            ${(mockData.monthlyPremium / 1000000).toFixed(1)}M
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FontAwesomeIcon icon={faArrowUp} style={{ color: '#10b981', fontSize: '14px' }} />
            <span style={{ fontSize: '14px', color: '#10b981' }}>+8% from last month</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
        padding: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
          Recent Activity
        </h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {[
            { action: 'New policy application submitted', time: '2 minutes ago', type: 'new' },
            { action: 'Claim #CLM-2024-001 approved', time: '15 minutes ago', type: 'approved' },
            { action: 'Underwriting review completed', time: '1 hour ago', type: 'completed' },
            { action: 'Risk assessment updated', time: '2 hours ago', type: 'updated' }
          ].map((activity, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <span style={{ color: '#374151', fontSize: '14px' }}>{activity.action}</span>
              <span style={{ color: '#6b7280', fontSize: '12px' }}>{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}