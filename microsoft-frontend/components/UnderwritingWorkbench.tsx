'use client'

import { useState } from 'react'

export default function UnderwritingWorkbench() {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const sampleDocuments = [
    { id: 'life1', name: 'Life Insurance Application - John Doe', type: 'Life Insurance' },
    { id: 'auto1', name: 'Auto Insurance Claim - Vehicle Accident', type: 'Auto Insurance' },
    { id: 'property1', name: 'Property Insurance - Fire Damage', type: 'Property Insurance' }
  ]

  const analyzeDocument = async (docId: string) => {
    setLoading(true)
    setSelectedDocument(docId)
    
    // Simulate analysis
    setTimeout(() => {
      setAnalysis({
        riskScore: Math.floor(Math.random() * 100),
        recommendation: 'Approve with standard premium',
        keyFindings: [
          'Applicant age: 35 years',
          'No significant medical history',
          'Stable employment for 8 years',
          'Good credit score: 750'
        ],
        requiredActions: [
          'Medical exam required',
          'Income verification needed',
          'Reference check pending'
        ]
      })
      setLoading(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">📊 Underwriting Workbench</h2>
          <p className="text-sm text-gray-600">AI-powered document analysis and risk assessment</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Document Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">📄 Documents</h3>
              <div className="space-y-3">
                {sampleDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedDocument === doc.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => analyzeDocument(doc.id)}
                  >
                    <div className="font-medium text-gray-900">{doc.name}</div>
                    <div className="text-sm text-gray-500">{doc.type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis Results */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">🔍 Analysis</h3>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-700">Risk Score</div>
                    <div className="text-2xl font-bold text-blue-600">{analysis.riskScore}/100</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-800">Recommendation</div>
                    <div className="text-green-700">{analysis.recommendation}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Key Findings</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {analysis.keyFindings.map((finding: string, idx: number) => (
                        <li key={idx}>• {finding}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Required Actions</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {analysis.requiredActions.map((action: string, idx: number) => (
                        <li key={idx}>• {action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Select a document to begin analysis
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}