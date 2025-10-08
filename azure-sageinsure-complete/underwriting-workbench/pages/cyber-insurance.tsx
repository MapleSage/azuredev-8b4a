import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShield, faChartLine, faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons'

export default function CyberInsurance() {
  const [formData, setFormData] = useState({
    awsAccountId: '',
    region: 'us-east-1',
    companyName: ''
  })
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      const mockFindings = {
        critical: Math.floor(Math.random() * 3),
        high: Math.floor(Math.random() * 5) + 2,
        medium: Math.floor(Math.random() * 10) + 5,
        low: Math.floor(Math.random() * 15) + 10,
        informational: Math.floor(Math.random() * 20) + 15
      }
      
      const premium = 5000 + 
        mockFindings.critical * 2000 +
        mockFindings.high * 1000 +
        mockFindings.medium * 200 +
        mockFindings.low * 50 +
        mockFindings.informational * 5
      
      setQuote({
        premium: premium.toLocaleString(),
        findings: mockFindings,
        riskScore: Math.min(100, 20 + mockFindings.critical * 15 + mockFindings.high * 8)
      })
      setLoading(false)
    }, 2000)
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
          SageInsure Cyber Insurance
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
        {/* Main Content */}
        <div style={{ display: 'grid', gridTemplateColumns: quote ? '1fr 1fr' : '1fr', gap: '40px' }}>
          
          {/* Form Section */}
          <div style={{ 
            background: 'white', 
            borderRadius: '20px', 
            padding: '40px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '1.8rem' }}>
              <FontAwesomeIcon icon={faShield} style={{ marginRight: '10px', color: '#3498db' }} />
              Get Your Cyber Insurance Quote
            </h2>
            <p style={{ color: '#7f8c8d', marginBottom: '30px', fontSize: '1.1rem' }}>
              AI-powered risk assessment using AWS Security Hub findings
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
                  AWS Account ID
                </label>
                <input
                  type="text"
                  value={formData.awsAccountId}
                  onChange={(e) => setFormData({...formData, awsAccountId: e.target.value})}
                  placeholder="123456789012"
                  required
                  style={{
                    width: '100%',
                    padding: '15px',
                    border: '2px solid #ecf0f1',
                    borderRadius: '10px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
                  AWS Region
                </label>
                <select
                  value={formData.region}
                  onChange={(e) => setFormData({...formData, region: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '15px',
                    border: '2px solid #ecf0f1',
                    borderRadius: '10px',
                    fontSize: '16px'
                  }}
                >
                  <option value="us-east-1">US East (N. Virginia)</option>
                  <option value="us-west-2">US West (Oregon)</option>
                  <option value="eu-west-1">Europe (Ireland)</option>
                  <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                </select>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2c3e50' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Your Company Name"
                  required
                  style={{
                    width: '100%',
                    padding: '15px',
                    border: '2px solid #ecf0f1',
                    borderRadius: '10px',
                    fontSize: '16px'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '18px',
                  background: loading ? '#95a5a6' : 'linear-gradient(135deg, #3498db, #2980b9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {loading ? (
                  <>
                    <span style={{ marginRight: '10px' }}>🔄</span>
                    Analyzing Security Posture...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '10px' }} />
                    Get Cyber Insurance Quote
                  </>
                )}
              </button>
            </form>

            {/* Info Box */}
            <div style={{ 
              marginTop: '30px', 
              padding: '20px', 
              background: '#e8f4fd', 
              borderLeft: '4px solid #3498db',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>How it works:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#34495e' }}>
                <li>We analyze your AWS Security Hub findings</li>
                <li>AI calculates risk score based on security posture</li>
                <li>Instant quote generation with detailed breakdown</li>
                <li>Coverage recommendations tailored to your risks</li>
              </ul>
            </div>
          </div>

          {/* Quote Results */}
          {quote && (
            <div style={{ 
              background: 'white', 
              borderRadius: '20px', 
              padding: '40px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ color: '#27ae60', marginBottom: '20px', fontSize: '1.8rem' }}>
                <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '10px' }} />
                Your Cyber Insurance Quote
              </h2>

              <div style={{ 
                textAlign: 'center', 
                padding: '30px', 
                background: 'linear-gradient(135deg, #27ae60, #229954)',
                borderRadius: '15px',
                marginBottom: '30px'
              }}>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>
                  ${quote.premium}
                </div>
                <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.9)' }}>
                  Annual Premium
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Security Risk Assessment</h3>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '15px',
                  background: quote.riskScore > 70 ? '#fee' : quote.riskScore > 40 ? '#fef9e7' : '#f0fff4',
                  borderRadius: '10px',
                  border: `2px solid ${quote.riskScore > 70 ? '#e74c3c' : quote.riskScore > 40 ? '#f39c12' : '#27ae60'}`
                }}>
                  <span style={{ fontWeight: '600', color: '#2c3e50' }}>Risk Score:</span>
                  <span style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold',
                    color: quote.riskScore > 70 ? '#e74c3c' : quote.riskScore > 40 ? '#f39c12' : '#27ae60'
                  }}>
                    {quote.riskScore}/100
                  </span>
                </div>
              </div>

              <div>
                <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Security Findings Breakdown</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>Severity</th>
                      <th style={{ padding: '12px', textAlign: 'center', border: '1px solid #dee2e6' }}>Count</th>
                      <th style={{ padding: '12px', textAlign: 'right', border: '1px solid #dee2e6' }}>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { level: 'Critical', count: quote.findings.critical, color: '#e74c3c', cost: 2000 },
                      { level: 'High', count: quote.findings.high, color: '#f39c12', cost: 1000 },
                      { level: 'Medium', count: quote.findings.medium, color: '#f1c40f', cost: 200 },
                      { level: 'Low', count: quote.findings.low, color: '#2ecc71', cost: 50 },
                      { level: 'Info', count: quote.findings.informational, color: '#95a5a6', cost: 5 }
                    ].map((item, index) => (
                      <tr key={index}>
                        <td style={{ 
                          padding: '12px', 
                          border: '1px solid #dee2e6',
                          color: item.color,
                          fontWeight: '600'
                        }}>
                          {item.level}
                        </td>
                        <td style={{ 
                          padding: '12px', 
                          border: '1px solid #dee2e6',
                          textAlign: 'center',
                          fontWeight: '600'
                        }}>
                          {item.count}
                        </td>
                        <td style={{ 
                          padding: '12px', 
                          border: '1px solid #dee2e6',
                          textAlign: 'right'
                        }}>
                          ${(item.count * item.cost).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ 
                marginTop: '30px', 
                padding: '20px', 
                background: '#e8f5e8', 
                borderRadius: '10px',
                border: '1px solid #27ae60'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#27ae60' }}>
                  <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '8px' }} />
                  Quote Valid for 30 Days
                </h4>
                <p style={{ margin: 0, color: '#2c3e50' }}>
                  This quote is based on your current AWS Security Hub findings. 
                  Contact our team to finalize your cyber insurance policy.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}