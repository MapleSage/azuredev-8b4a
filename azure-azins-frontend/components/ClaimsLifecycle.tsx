import React, { useState } from 'react';

export const ClaimsLifecycle: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'submit' | 'track'>('overview');

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          ⚡ Claims Lifecycle Management
        </h1>
        <p className="text-purple-100 mt-1">Event-driven serverless claims processing</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'submit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📝 Submit Claim
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'track'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🔍 Track Claims
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div>
            {/* Event-Driven Architecture Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-6">Event-Driven Architecture</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <div className="text-4xl mb-3">👤</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Customer Service</h3>
                  <p className="text-sm text-gray-600">Customer onboarding, profile management, and policy creation</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Claims Processing</h3>
                  <p className="text-sm text-gray-600">End-to-end claims lifecycle with automated workflows</p>
                </div>
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Fraud Detection</h3>
                  <p className="text-sm text-gray-600">AI-powered fraud analysis and risk assessment</p>
                </div>
              </div>
            </div>

            {/* Microservices Architecture Section */}
            <div>
              <h2 className="text-xl font-semibold mb-6">Microservices Architecture</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">👥</div>
                  <h3 className="font-medium text-gray-800">Customer</h3>
                  <p className="text-xs text-gray-600">Profile & onboarding</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">📄</div>
                  <h3 className="font-medium text-gray-800">Documents</h3>
                  <p className="text-xs text-gray-600">Upload & processing</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">🚨</div>
                  <h3 className="font-medium text-gray-800">Fraud</h3>
                  <p className="text-xs text-gray-600">Risk analysis</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">⚡</div>
                  <h3 className="font-medium text-gray-800">Event Grid</h3>
                  <p className="text-xs text-gray-600">Event orchestration</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">💰</div>
                  <h3 className="font-medium text-gray-800">Settlement</h3>
                  <p className="text-xs text-gray-600">Payment processing</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">📸</div>
                  <h3 className="font-medium text-gray-800">Photo Booth</h3>
                  <p className="text-xs text-gray-600">Image capture</p>
                </div>
                <div className="bg-pink-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">🔔</div>
                  <h3 className="font-medium text-gray-800">Notifications</h3>
                  <p className="text-xs text-gray-600">Real-time UI</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg text-center">
                  <div className="text-3xl mb-2">🎭</div>
                  <h3 className="font-medium text-gray-800">Brand Claims</h3>
                  <p className="text-xs text-gray-600">Brand management</p>
                </div>
              </div>
              
              {/* Recent Claims Section */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-6">Recent Claims</h2>
                <div className="space-y-4">
                  <div className="bg-white border rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">CLM-2024-001</h3>
                        <p className="text-gray-600">Rear-end collision on Highway 101</p>
                        <p className="text-sm text-gray-500">1/15/2024</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
                          investigating
                        </span>
                        <div className="text-xl font-bold mt-2">$15,000</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white border rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">CLM-2024-002</h3>
                        <p className="text-gray-600">Hail damage to vehicle</p>
                        <p className="text-sm text-gray-500">1/10/2024</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                          settled
                        </span>
                        <div className="text-xl font-bold mt-2">$8,500</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'submit' && (
          <div>
            <h2 className="text-xl font-semibold mb-6">Submit New Claim</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Claim Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Claim Type</label>
                    <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option>Auto Insurance</option>
                      <option>Marine Insurance</option>
                      <option>Health Insurance</option>
                      <option>Life Insurance</option>
                      <option>Cyber Insurance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Incident Date</label>
                    <input 
                      type="date" 
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea 
                      className="w-full border border-gray-300 rounded-md px-3 py-2 h-24"
                      placeholder="Describe the incident in detail..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Amount</label>
                    <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="$0.00"
                    />
                  </div>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium">
                    Submit Claim
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Required Documents</h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-white rounded border">
                    <div className="text-2xl mr-3">📄</div>
                    <div>
                      <div className="font-medium">Police Report</div>
                      <div className="text-sm text-gray-500">Official incident report</div>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-white rounded border">
                    <div className="text-2xl mr-3">📸</div>
                    <div>
                      <div className="font-medium">Photos</div>
                      <div className="text-sm text-gray-500">Damage and scene photos</div>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-white rounded border">
                    <div className="text-2xl mr-3">🆔</div>
                    <div>
                      <div className="font-medium">Driver's License</div>
                      <div className="text-sm text-gray-500">Valid identification</div>
                    </div>
                  </div>
                  <div className="flex items-center p-3 bg-white rounded border">
                    <div className="text-2xl mr-3">📋</div>
                    <div>
                      <div className="font-medium">Insurance Card</div>
                      <div className="text-sm text-gray-500">Current policy information</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'track' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Recent Claims</h2>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm">
                Feedback Assistant
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">CLM-2024-001</h3>
                    <p className="text-gray-600">Rear-end collision on Highway 101</p>
                    <p className="text-sm text-gray-500">1/15/2024</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
                      investigating
                    </span>
                    <div className="text-xl font-bold mt-2">$15,000</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                    Awaiting police report
                  </div>
                </div>
              </div>
              
              <div className="bg-white border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-lg">CLM-2024-002</h3>
                    <p className="text-gray-600">Hail damage to vehicle</p>
                    <p className="text-sm text-gray-500">1/10/2024</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                      settled
                    </span>
                    <div className="text-xl font-bold mt-2">$8,500</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Payment processed
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-3xl mb-2">⚙️</div>
                <div className="text-sm font-medium">Processing</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-3xl mb-2">📸</div>
                <div className="text-sm font-medium">Photo Capture</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-3xl mb-2">❗</div>
                <div className="text-sm font-medium">Alerts</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-3xl mb-2">📋</div>
                <div className="text-sm font-medium">Reports</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};