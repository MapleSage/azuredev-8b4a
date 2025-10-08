import React, { useState } from 'react';

interface ModelSelectorProps {
  onModelChange: (model: string) => void;
  onMcpChange: (mcpServers: string[]) => void;
  currentModel?: string;
  currentMcp?: string[];
}

const AVAILABLE_MODELS = [
  { id: 'gpt-5', name: 'GPT-5 (Preview)', description: 'Latest and most advanced' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Multimodal, fast' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance' },
  { id: 'gpt-4', name: 'GPT-4', description: 'Reliable, proven' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast, cost-effective' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Lightweight, efficient' }
];

const MCP_SERVERS = [
  { id: 'arxiv', name: 'ArXiv', description: 'Academic papers' },
  { id: 'pubmed', name: 'PubMed', description: 'Medical literature' },
  { id: 'clinicaltrial', name: 'ClinicalTrials', description: 'Clinical trials' },
  { id: 'chembl', name: 'ChEMBL', description: 'Chemical database' },
  { id: 'tavily', name: 'Tavily', description: 'Web search' },
  { id: 'weather', name: 'Weather', description: 'Weather data' },
  { id: 'calculator', name: 'Calculator', description: 'Math operations' },
  { id: 'memory', name: 'Memory', description: 'Context storage' }
];

export default function ModelSelector({ onModelChange, onMcpChange, currentModel = 'gpt-4o', currentMcp = [] }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState(currentModel);
  const [selectedMcp, setSelectedMcp] = useState<string[]>(currentMcp);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    onModelChange(modelId);
  };

  const handleMcpToggle = (mcpId: string) => {
    const newMcp = selectedMcp.includes(mcpId)
      ? selectedMcp.filter(id => id !== mcpId)
      : [...selectedMcp, mcpId];
    setSelectedMcp(newMcp);
    onMcpChange(newMcp);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
      >
        <div>
          <div className="font-medium text-gray-900">🧠 AI Configuration</div>
          <div className="text-sm text-gray-500">
            {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name} • {selectedMcp.length} MCP servers
          </div>
        </div>
        <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Model Selection */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🤖 Select Model</h4>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map((model) => (
                <label key={model.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="model"
                    value={model.id}
                    checked={selectedModel === model.id}
                    onChange={() => handleModelChange(model.id)}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-medium text-sm">{model.name}</div>
                    <div className="text-xs text-gray-500">{model.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* MCP Servers */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">🔌 MCP Servers</h4>
            <div className="grid grid-cols-2 gap-2">
              {MCP_SERVERS.map((server) => (
                <label key={server.id} className="flex items-center space-x-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={selectedMcp.includes(server.id)}
                    onChange={() => handleMcpToggle(server.id)}
                    className="text-blue-600"
                  />
                  <div>
                    <div className="font-medium">{server.name}</div>
                    <div className="text-xs text-gray-500">{server.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="text-xs text-gray-500 pt-2 border-t">
            💡 Models deploy on-demand via Azure Container Instances
          </div>
        </div>
      )}
    </div>
  );
}