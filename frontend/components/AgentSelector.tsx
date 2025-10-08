import { useState } from 'react'

interface AgentSelectorProps {
  onAgentChange: (agent: string) => void
  currentAgent: string
}

const agents = {
  'general_claims': {
    name: 'General Claims',
    description: 'Auto, Home, Commercial Property',
    color: 'bg-blue-500',
    ragType: 'bedrock'
  },
  'marine': {
    name: 'Marine Insurance', 
    description: 'Cargo, Hull, Vessel Coverage',
    color: 'bg-teal-500',
    ragType: 'hybrid'
  },
  'cyber': {
    name: 'Cyber Security',
    description: 'Data Breach, Privacy Coverage',
    color: 'bg-red-500',
    ragType: 'bedrock'
  },
  'do_liability': {
    name: 'D&O Liability',
    description: 'Directors & Officers Coverage',
    color: 'bg-purple-500',
    ragType: 'bedrock'
  }
}

export default function AgentSelector({ onAgentChange, currentAgent }: AgentSelectorProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Insurance Agent
      </label>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(agents).map(([key, agent]) => (
          <button
            key={key}
            onClick={() => onAgentChange(key)}
            className={`p-3 rounded-lg text-left transition-all ${
              currentAgent === key 
                ? `${agent.color} text-white shadow-lg` 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <div className="font-medium text-sm">{agent.name}</div>
            <div className="text-xs opacity-80">{agent.description}</div>
            <div className="text-xs mt-1">
              <span className={`px-2 py-1 rounded ${
                agent.ragType === 'hybrid' ? 'bg-orange-200 text-orange-800' : 'bg-blue-200 text-blue-800'
              }`}>
                {agent.ragType === 'hybrid' ? 'Azure + Bedrock' : 'Bedrock Only'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}