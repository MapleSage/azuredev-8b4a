'use client'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faShieldAlt, 
  faUser, 
  faCalculator, 
  faSearch, 
  faFileAlt,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons'

export default function UnderwriterAgent() {
  const [activeTab, setActiveTab] = useState('analysis')
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    age: 35,
    gender: 'Male',
    smoker: 'Non-smoker',
    coverageAmount: 500000,
    policyType: 'Term Life',
    medicalConditions: [] as string[],
    medications: '',
    alcoholUse: 'Light',
    exercise: 'Moderate',
    dangerousActivities: [] as string[]
  })

  const handleAnalyze = async () => {
    setLoading(true)
    
    // Simulate AI analysis
    setTimeout(() => {
      const riskScore = calculateRiskScore()
      const analysis = generateAnalysis(riskScore)
      setAnalysisResult(analysis)
      setLoading(false)
    }, 2000)
  }

  const calculateRiskScore = () => {
    let score = 1.0
    
    // Age factor
    if (formData.age > 60) score *= 1.5
    else if (formData.age > 45) score *= 1.2
    
    // Smoker factor
    if (formData.smoker === 'Smoker') score *= 2.0
    else if (formData.smoker === 'Former smoker') score *= 1.3
    
    // Medical conditions
    score += formData.medicalConditions.length * 0.3
    
    // Dangerous activities
    score += formData.dangerousActivities.length * 0.2
    
    return Math.min(score, 5.0)
  }

  const generateAnalysis = (riskScore: number) => {
    const riskLevel = riskScore < 1.5 ? 'Low' : riskScore < 2.5 ? 'Medium' : 'High'
    const premium = Math.round(formData.coverageAmount * 0.002 * riskScore)
    
    return `
**Risk Assessment: ${riskLevel} Risk**

**Risk Score:** ${riskScore.toFixed(2)}/5.0

**Premium Recommendation:** $${premium.toLocaleString()} annually

**Analysis:**
- Applicant age (${formData.age}) falls within ${formData.age < 45 ? 'standard' : 'elevated'} risk category
- Smoking status: ${formData.smoker} - ${formData.smoker === 'Smoker' ? 'Significant risk factor' : 'Acceptable'}
- Medical history: ${formData.medicalConditions.length === 0 ? 'No reported conditions' : `${formData.medicalConditions.length} condition(s) reported`}

**Recommendation:** ${riskScore < 2.0 ? 'APPROVE - Standard rates' : riskScore < 3.0 ? 'APPROVE - Rated premium' : 'DECLINE - Refer to senior underwriter'}

**Required Documentation:**
- Medical examination
- Physician statement
${riskScore > 2.0 ? '- Additional medical records\n- Specialist consultation' : ''}
    `.trim()
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.5rem 2.5rem',
        background: 'linear-gradient(to right, #ffffff, #f8fafc)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '1.75rem', 
          fontWeight: '700', 
          color: '#1e3a8a',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <img 
            src="/sageinsure_logo.png" 
            alt="SageInsure" 
            style={{ height: '100px', width: '100px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          SageInsure Underwriting Agent
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
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to Workbench
        </button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          backgroundColor: 'white',
          padding: '1rem',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
        }}>
          {[
            { id: 'analysis', label: 'Application Analysis', icon: faUser },
            { id: 'calculator', label: 'Risk Calculator', icon: faCalculator },
            { id: 'search', label: 'Guidelines Search', icon: faSearch }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: activeTab === tab.id ? '#2563eb' : '#f1f5f9',
                color: activeTab === tab.id ? 'white' : '#64748b',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <FontAwesomeIcon icon={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Application Analysis Tab */}
        {activeTab === 'analysis' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Input Form */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <h3 style={{ color: '#1e40af', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                <FontAwesomeIcon icon={faUser} style={{ marginRight: '8px' }} />
                Applicant Information
              </h3>

              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>Smoker Status</label>
                  <select
                    value={formData.smoker}
                    onChange={(e) => setFormData({...formData, smoker: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  >
                    <option value="Non-smoker">Non-smoker</option>
                    <option value="Smoker">Smoker</option>
                    <option value="Former smoker">Former smoker</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>Coverage Amount ($)</label>
                  <input
                    type="number"
                    value={formData.coverageAmount}
                    onChange={(e) => setFormData({...formData, coverageAmount: parseInt(e.target.value)})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: loading ? '#94a3b8' : '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    marginTop: '1rem'
                  }}
                >
                  {loading ? 'Analyzing...' : 'Analyze Application'}
                </button>
              </div>
            </div>

            {/* Results */}
            <div style={{ 
              backgroundColor: 'white', 
              padding: '2rem', 
              borderRadius: '12px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
              border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
              <h3 style={{ color: '#1e40af', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
                <FontAwesomeIcon icon={faFileAlt} style={{ marginRight: '8px' }} />
                Analysis Results
              </h3>

              {loading && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #2563eb',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1rem'
                  }} />
                  <p style={{ color: '#6b7280' }}>Analyzing application with Azure OpenAI...</p>
                </div>
              )}

              {analysisResult && !loading && (
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6', color: '#374151' }}>
                  {analysisResult}
                </div>
              )}

              {!analysisResult && !loading && (
                <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
                  Complete the form and click "Analyze Application" to see results
                </p>
              )}
            </div>
          </div>
        )}

        {/* Risk Calculator Tab */}
        {activeTab === 'calculator' && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '12px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <h3 style={{ color: '#1e40af', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              <FontAwesomeIcon icon={faCalculator} style={{ marginRight: '8px' }} />
              Risk Calculator
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              Calculate risk multipliers based on actuarial tables and company guidelines
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h4 style={{ color: '#374151', marginBottom: '1rem' }}>Risk Factors</h4>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
                      Age Risk Factor: 1.2
                    </label>
                    <input type="range" min="0.5" max="3" step="0.1" defaultValue="1.2" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
                      Medical Risk Factor: 1.0
                    </label>
                    <input type="range" min="0.5" max="5" step="0.1" defaultValue="1.0" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: '#374151' }}>
                      Lifestyle Risk Factor: 1.1
                    </label>
                    <input type="range" min="0.5" max="3" step="0.1" defaultValue="1.1" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ color: '#374151', marginBottom: '1rem' }}>Premium Calculation</h4>
                <div style={{ 
                  padding: '1.5rem', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Base Premium: </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2563eb' }}>$1,200</span>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Risk Multiplier: </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f59e0b' }}>1.32</span>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>Adjusted Premium: </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#059669' }}>$1,584</span>
                  </div>
                  <div style={{ 
                    padding: '0.75rem', 
                    backgroundColor: '#ecfdf5', 
                    borderRadius: '6px',
                    border: '1px solid #10b981'
                  }}>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981', marginRight: '8px' }} />
                    <span style={{ color: '#065f46', fontWeight: '500' }}>Low Risk - Standard rates applicable</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guidelines Search Tab */}
        {activeTab === 'search' && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '12px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <h3 style={{ color: '#1e40af', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
              <FontAwesomeIcon icon={faSearch} style={{ marginRight: '8px' }} />
              Underwriting Guidelines Search
            </h3>

            <div style={{ marginBottom: '2rem' }}>
              <input
                type="text"
                placeholder="Search underwriting guidelines..."
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {[
                { title: 'Diabetes Underwriting Guidelines', category: 'Medical', risk: 'Medium' },
                { title: 'Smoking Cessation Programs', category: 'Lifestyle', risk: 'Low' },
                { title: 'High-Risk Occupations', category: 'Occupational', risk: 'High' }
              ].map((guideline, index) => (
                <div key={index} style={{ 
                  padding: '1rem', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  backgroundColor: '#f8fafc'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>{guideline.title}</h4>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>
                    <span>Category: {guideline.category}</span>
                    <span>Risk Level: {guideline.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}