'use client'

import { useState } from 'react'
import UnderwritingWorkbench from '../components/UnderwritingWorkbench'
import CyberInsurance from '../components/CyberInsurance'
import FNOLProcessor from '../components/FNOLProcessor'
import ClaimsLifecycle from '../components/ClaimsLifecycle'

export default function Home() {
  const [activeTab, setActiveTab] = useState('underwriting')

  const tabs = [
    { id: 'underwriting', name: 'Underwriting', icon: '📊' },
    { id: 'cyber', name: 'Cyber Insurance', icon: '🔒' },
    { id: 'fnol', name: 'FNOL Processor', icon: '📋' },
    { id: 'claims', name: 'Claims Lifecycle', icon: '🔄' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-blue-600">🛡️ SageInsure</div>
              <div className="ml-4 text-sm text-gray-500">Microsoft Edition</div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">User</div>
              <button className="text-sm text-blue-600 hover:text-blue-800">Sign Out</button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'underwriting' && <UnderwritingWorkbench />}
          {activeTab === 'cyber' && <CyberInsurance />}
          {activeTab === 'fnol' && <FNOLProcessor />}
          {activeTab === 'claims' && <ClaimsLifecycle />}
        </div>
      </main>
    </div>
  )
}