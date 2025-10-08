import { useState } from 'react'
import { Button } from './SimpleButton'
import { Input } from './SimpleInput'
import { Send } from 'lucide-react'

export default function MarineInsurance() {
  const [activeSection, setActiveSection] = useState<'overview' | 'file-claim' | 'track-claim'>('overview')
  const [claimForm, setClaimForm] = useState({
    vesselName: '',
    vesselType: '',
    incidentDate: '',
    location: '',
    claimType: '',
    description: '',
    estimatedLoss: ''
  })
  const [chatMessages, setChatMessages] = useState<Array<{id: number, type: 'user' | 'assistant', content: string}>>([
    { id: 1, type: 'assistant', content: 'Marine insurance specialist ready. Ask about claims or coverage.' }
  ])
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user' as 'user',
      content: chatInput
    }

    setChatMessages(prev => [...prev, userMessage])
    setChatInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/step-functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Marine insurance question: ${chatInput}`,
          businessLine: 'marine',
          sessionId: `marine-chat-${Date.now()}`
        })
      })
      
      const result = await response.json()
      
      const assistantMessage = {
        id: Date.now() + 1,
        type: 'assistant' as 'assistant',
        content: result.message || 'I can help you with marine insurance questions. Please provide more details about your specific situation.'
      }
      
      setChatMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant' as 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again or contact our marine claims department directly.'
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/step-functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Marine claim: ${claimForm.claimType} for vessel ${claimForm.vesselName}. Incident on ${claimForm.incidentDate} at ${claimForm.location}. Description: ${claimForm.description}. Estimated loss: $${claimForm.estimatedLoss}`,
          businessLine: 'marine',
          sessionId: `marine-${Date.now()}`
        })
      })
      
      const result = await response.json()
      alert(`Marine claim ${result.claimId} submitted successfully!`)
      
      // Reset form
      setClaimForm({
        vesselName: '',
        vesselType: '',
        incidentDate: '',
        location: '',
        claimType: '',
        description: '',
        estimatedLoss: ''
      })
    } catch (error) {
      alert('Failed to submit claim. Please try again.')
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">🚢 Marine Insurance</h2>
            <p className="text-gray-600">Comprehensive coverage for vessels, cargo, and marine operations</p>
          </div>
          <button 
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            ← Back to Chat
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveSection('overview')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeSection === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveSection('file-claim')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeSection === 'file-claim'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          File Claim
        </button>
        <button
          onClick={() => setActiveSection('track-claim')}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeSection === 'track-claim'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Track Claim
        </button>
      </div>

      {/* Content */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-3">🚢 Hull & Machinery</h3>
            <p className="text-sm text-gray-600 mb-4">Physical damage to vessels, engines, equipment</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Collision damage</li>
              <li>• Grounding incidents</li>
              <li>• Fire and explosion</li>
              <li>• Machinery breakdown</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-3">📦 Cargo Claims</h3>
            <p className="text-sm text-gray-600 mb-4">Loss or damage to goods in transit</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Water damage</li>
              <li>• Theft and piracy</li>
              <li>• Container damage</li>
              <li>• Temperature variation</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-3">⚙️ P&I Coverage</h3>
            <p className="text-sm text-gray-600 mb-4">Protection & Indemnity liability</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Third party liability</li>
              <li>• Crew injury claims</li>
              <li>• Pollution liability</li>
              <li>• Cargo liability</li>
            </ul>
          </div>
          
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="font-semibold text-gray-900 mb-3">🌊 General Average</h3>
            <p className="text-sm text-gray-600 mb-4">Shared maritime losses</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Jettison of cargo</li>
              <li>• Emergency repairs</li>
              <li>• Port of refuge costs</li>
              <li>• Salvage operations</li>
            </ul>
          </div>
        </div>
      )}

      {activeSection === 'file-claim' && (
        <div className="bg-white p-6 rounded-lg border mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">File Marine Insurance Claim</h3>
          
          <form onSubmit={handleSubmitClaim} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vessel Name</label>
                <Input
                  value={claimForm.vesselName}
                  onChange={(e) => setClaimForm({...claimForm, vesselName: e.target.value})}
                  placeholder="Enter vessel name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vessel Type</label>
                <select
                  value={claimForm.vesselType}
                  onChange={(e) => setClaimForm({...claimForm, vesselType: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select vessel type</option>
                  <option value="cargo">Cargo Ship</option>
                  <option value="tanker">Tanker</option>
                  <option value="container">Container Ship</option>
                  <option value="bulk">Bulk Carrier</option>
                  <option value="yacht">Yacht</option>
                  <option value="fishing">Fishing Vessel</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Incident Date</label>
                <input
                  type="date"
                  value={claimForm.incidentDate}
                  onChange={(e) => setClaimForm({...claimForm, incidentDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <Input
                  value={claimForm.location}
                  onChange={(e) => setClaimForm({...claimForm, location: e.target.value})}
                  placeholder="Port, coordinates, or general area"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type</label>
              <select
                value={claimForm.claimType}
                onChange={(e) => setClaimForm({...claimForm, claimType: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select claim type</option>
                <option value="hull-damage">Hull Damage</option>
                <option value="machinery">Machinery Breakdown</option>
                <option value="cargo-loss">Cargo Loss/Damage</option>
                <option value="collision">Collision</option>
                <option value="grounding">Grounding</option>
                <option value="fire">Fire/Explosion</option>
                <option value="piracy">Piracy/Theft</option>
                <option value="general-average">General Average</option>
                <option value="liability">Third Party Liability</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={claimForm.description}
                onChange={(e) => setClaimForm({...claimForm, description: e.target.value})}
                placeholder="Detailed description of the incident..."
                rows={4}
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Loss (USD)</label>
              <input
                type="number"
                value={claimForm.estimatedLoss}
                onChange={(e) => setClaimForm({...claimForm, estimatedLoss: e.target.value})}
                placeholder="0"
                className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button type="submit" className="w-full px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white transition-colors duration-300 hover:bg-blue-700">
              Submit Marine Claim
            </button>
          </form>
        </div>
      )}

      {activeSection === 'track-claim' && (
        <div className="bg-white p-6 rounded-lg border mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Track Marine Claim</h3>
          
          <div className="mb-6">
            <input placeholder="Enter claim ID (e.g., m4a7b-2c)" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" />
            <button className="w-full px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white transition-colors duration-300 hover:bg-blue-700">
              Track Claim
            </button>
          </div>
          
          <div className="text-sm text-gray-600 p-4 bg-gray-50 rounded-lg">
            <p>Enter your marine claim ID to track the status and progress of your claim. You'll receive real-time updates on processing status, adjuster assignments, and settlement progress.</p>
          </div>
        </div>
      )}

      </div>
      
      {/* Marine Chat Assistant - Fixed at bottom */}
      <div className="flex-shrink-0 bg-white border-t">
        <div className="bg-blue-50 px-3 py-1 border-b">
          <h4 className="font-medium text-blue-900 text-sm">🚢 Marine Assistant</h4>
        </div>
        
        <div className="h-32 overflow-y-auto p-3 space-y-2">
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                msg.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-600">
                Marine specialist is typing...
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t p-3">
          <form onSubmit={handleChatSubmit} className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask about marine claims, coverage, procedures..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !chatInput.trim()} className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}