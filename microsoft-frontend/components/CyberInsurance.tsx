'use client'

import { useState } from 'react'

export default function CyberInsurance() {
  const [scanResults, setScanResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const runSecurityScan = () => {
    setLoading(true)
    setTimeout(() => {
      setScanResults({
        overallScore: 78,
        vulnerabilities: [
          { severity: 'High', count: 2, description: 'Unpatched systems detected' },
          { severity: 'Medium', count: 5, description: 'Weak password policies' },
          { severity: 'Low', count: 12, description: 'Missing security headers' }
        ],
        recommendations: [
          'Update all systems to latest security patches',
          'Implement multi-factor authentication',
          'Conduct employee security training',
          'Deploy endpoint detection and response'
        ],
        premiumAdjustment: '+15%'
      })
      setLoading(false)
    }, 3000)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">🔒 Cyber Insurance Risk Assessment</h2>
          <p className="text-sm text-gray-600">Microsoft Security integration for risk evaluation</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Scan */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">🛡️ Security Assessment</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">Microsoft Defender Integration</h4>
                  <p className="text-sm text-blue-700">Connected to Microsoft 365 Security Center</p>
                </div>
                
                <button
                  onClick={runSecurityScan}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Scanning...' : 'Run Security Scan'}
                </button>
              </div>
            </div>

            {/* Results */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Risk Analysis</h3>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : scanResults ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-700">Security Score</div>
                    <div className="text-2xl font-bold text-blue-600">{scanResults.overallScore}/100</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Vulnerabilities</div>
                    {scanResults.vulnerabilities.map((vuln: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b">
                        <div>
                          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            vuln.severity === 'High' ? 'bg-red-500' :
                            vuln.severity === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></span>
                          <span className="text-sm">{vuln.description}</span>
                        </div>
                        <span className="text-sm font-medium">{vuln.count}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-orange-800">Premium Adjustment</div>
                    <div className="text-orange-700">{scanResults.premiumAdjustment}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Run security scan to assess cyber risk
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}