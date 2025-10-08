import React, { useState } from "react";
import ChatApp from "./ChatApp";
import FNOLProcessor from "./FNOLProcessor";
import CyberInsurance from "./CyberInsurance";
import { ClaimsLifecycle } from "./ClaimsLifecycle";
import ResearchAssistant from "./ResearchAssistant";
import PolicyAssistant from "./PolicyAssistant";
import BusinessAgentChat from "./BusinessAgentChat";
import ModelSelector from "./ModelSelector";
import UnderwritingAgent from "./UnderwritingAgent";

interface TabsInterfaceProps {
  signOut?: () => void;
  user?: any;
}

const TabsInterface: React.FC<TabsInterfaceProps> = ({ signOut, user }) => {
  const [activeTab, setActiveTab] = useState("claims");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [selectedMcp, setSelectedMcp] = useState<string[]>(["memory", "calculator"]);

  const tabs = [
    { id: "claims", label: "Claims Chat", icon: "💬" },
    { id: "underwriting", label: "Underwriting", icon: "📋" },
    { id: "research", label: "Research", icon: "🔬" },
    { id: "marine", label: "Marine Insurance", icon: "🚢" },
    { id: "cyber", label: "Cyber Insurance", icon: "🛡️" },
    { id: "fnol", label: "FNOL Processor", icon: "📄" },
    { id: "lifecycle", label: "Claims Lifecycle", icon: "🔄" },
    { id: "policy", label: "Policy Assistant", icon: "📜" },
  ];

  const businessAgents = [
    // Business agents moved to separate project
    // See: /Volumes/Macintosh HD Ext./Developer/AWS_Strands/azure-business-agents/
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Header with Logo */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 mr-3 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Az</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AzIns</h1>
            </div>
          </div>
          {signOut && user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                User
              </span>
              <button
                onClick={signOut}
                className="text-sm text-blue-600 hover:text-blue-800">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-header with Sidebar and Tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div
          className={`transition-all duration-300 flex flex-col ${
            sidebarExpanded ? "w-64" : "w-16"
          }`}
          style={{
            backgroundColor: "#0D2B3D",
            borderRight: "1px solid #174D6D",
          }}>
          {/* Sidebar Header */}
          <div className="p-4" style={{ borderBottom: "1px solid #174D6D" }}>
            <div className="flex items-center justify-between">
              {sidebarExpanded && (
                <h3 className="text-sm font-semibold text-white">
                  Business Agents
                </h3>
              )}
              <button
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
                className="p-1 rounded-md text-gray-300 hover:text-white transition-colors"
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.backgroundColor = "#174D6D")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.backgroundColor =
                    "transparent")
                }>
                {sidebarExpanded ? "◀" : "▶"}
              </button>
            </div>
          </div>

          {/* Model Selector */}
          <div className="p-2">
            <ModelSelector
              onModelChange={setSelectedModel}
              onMcpChange={setSelectedMcp}
              currentModel={selectedModel}
              currentMcp={selectedMcp}
            />
          </div>

          {/* Business Agents List */}
          <div className="flex-1 p-2">
            {businessAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setActiveTab(agent.id)}
                className="w-full flex items-center p-3 mb-2 rounded-lg transition-colors text-left"
                style={{
                  backgroundColor:
                    activeTab === agent.id ? "#174D6D" : "transparent",
                  color: activeTab === agent.id ? "white" : "#d1d5db",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== agent.id) {
                    (e.target as HTMLElement).style.backgroundColor = "#174D6D";
                    (e.target as HTMLElement).style.color = "white";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== agent.id) {
                    (e.target as HTMLElement).style.backgroundColor =
                      "transparent";
                    (e.target as HTMLElement).style.color = "#d1d5db";
                  }
                }}
                title={sidebarExpanded ? "" : agent.label}>
                <span className="text-lg mr-3">{agent.icon}</span>
                {sidebarExpanded && (
                  <div>
                    <div className="font-medium text-sm">{agent.label}</div>
                    <div className="text-xs" style={{ color: "#9ca3af" }}>
                      Business agents available in separate project
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}>
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "claims" && <ChatApp initialSpecialist="claims" />}
            {activeTab === "underwriting" && <UnderwritingAgent />}
            {activeTab === "research" && <ResearchAssistant />}
            {activeTab === "marine" && <ChatApp initialSpecialist="marine" />}
            {activeTab === "cyber" && <CyberInsurance />}
            {activeTab === "fnol" && <FNOLProcessor />}
            {activeTab === "lifecycle" && <ClaimsLifecycle />}
            {activeTab === "policy" && <PolicyAssistant />}
            {/* Business agents moved to separate project */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabsInterface;
