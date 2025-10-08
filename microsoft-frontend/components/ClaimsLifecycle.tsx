'use client'

import { useState } from 'react'

export default function ClaimsLifecycle() {
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null)

  const claims = [
    {
      id: 'CLM-001',
      type: 'Auto Accident',
      status: 'Investigation',
      amount: '$15,000',
      date: '2024-01-15',
      progress: 60
    },
    {
      id: 'CLM-002',
      type: 'Property Damage',
      status: 'Settlement',
      amount: '$8,500',
      date: '2024-01-10',
      progress: 85
    },
    {
      id: 'CLM-003',
      type: 'Liability',
      status: 'Review',
      amount: '$25,000',
      date: '2024-01-08',
      progress: 30
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Review': return 'bg-yellow-100 text-yellow-800'
      case 'Investigation': return 'bg-blue-100 text-blue-800'
      case 'Settlement': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">🔄 Claims Lifecycle Management</h2>
          <p className="text-sm text-gray-600">End-to-end claims processing and tracking</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Claims List */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">📋 Active Claims</h3>
              <div className="space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedClaim === claim.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedClaim(claim.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-900">{claim.id}</div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(claim.status)}`}>
                        {claim.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{claim.type}</div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium text-gray-900">{claim.amount}</div>
                      <div className="text-xs text-gray-500">{claim.date}</div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${claim.progress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{claim.progress}% complete</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Claim Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Claim Details</h3>
              {selectedClaim ? (
                <div className="space-y-4">
                  {(() => {
                    const claim = claims.find(c => c.id === selectedClaim)
                    if (!claim) return null
                    
                    return (
                      <>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="text-sm font-medium text-gray-700">Claim ID</div>
                          <div className="text-lg font-bold text-gray-900">{claim.id}</div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-sm font-medium text-blue-800">Type</div>
                            <div className="text-blue-700">{claim.type}</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-sm font-medium text-green-800">Amount</div>
                            <div className="text-green-700">{claim.amount}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Timeline</div>
                          <div className="space-y-2">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                              <div className="text-sm">Claim submitted</div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                              <div className="text-sm">Initial review completed</div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                              <div className="text-sm">Investigation in progress</div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-gray-300 rounded-full mr-3"></div>
                              <div className="text-sm text-gray-500">Settlement pending</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-yellow-50 p-4 rounded-lg">
                          <div className="text-sm font-medium text-yellow-800">Next Action</div>
                          <div className="text-yellow-700">Awaiting adjuster report</div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  Select a claim to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}