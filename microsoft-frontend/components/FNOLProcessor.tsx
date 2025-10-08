'use client'

import { useState } from 'react'

export default function FNOLProcessor() {
  const [claim, setClaim] = useState({
    type: '',
    description: '',
    amount: '',
    date: ''
  })
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)

  const processClaim = () => {
    setProcessing(true)
    setTimeout(() => {
      setResult({
        claimId: `CLM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: 'Approved',
        estimatedPayout: claim.amount,
        processingTime: '3-5 business days',
        nextSteps: [
          'Adjuster assigned: Sarah Johnson',
          'Site inspection scheduled',
          'Documentation review in progress'
        ]
      })
      setProcessing(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">📋 FNOL Processor</h2>
          <p className="text-sm text-gray-600">First Notice of Loss automated processing</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Claim Input */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">📝 New Claim</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Claim Type</label>
                  <select
                    value={claim.type}
                    onChange={(e) => setClaim({...claim, type: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select type</option>
                    <option value="auto">Auto Accident</option>
                    <option value="property">Property Damage</option>
                    <option value="liability">Liability</option>
                    <option value="health">Health/Medical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={claim.description}
                    onChange={(e) => setClaim({...claim, description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Describe the incident..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Estimated Amount</label>
                  <input
                    type="number"
                    value={claim.amount}
                    onChange={(e) => setClaim({...claim, amount: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="$0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Loss</label>
                  <input
                    type="date"
                    value={claim.date}
                    onChange={(e) => setClaim({...claim, date: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <button
                  onClick={processClaim}
                  disabled={processing || !claim.type || !claim.description}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Submit Claim'}
                </button>
              </div>
            </div>

            {/* Processing Results */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">⚡ Processing Status</h3>
              {processing ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Processing claim...</p>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-800">Claim ID</div>
                    <div className="text-lg font-bold text-green-700">{result.claimId}</div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-blue-800">Status</div>
                    <div className="text-blue-700">{result.status}</div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-gray-700">Estimated Payout</div>
                    <div className="text-lg font-bold text-gray-900">${result.estimatedPayout}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Next Steps</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {result.nextSteps.map((step: string, idx: number) => (
                        <li key={idx}>• {step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Submit a claim to see processing results
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}