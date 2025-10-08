import React, { useState } from "react";
import ChatApp from "./ChatApp";
import FNOLProcessor from "./FNOLProcessor";
import CyberInsurance from "./CyberInsurance";
import { ClaimsLifecycle } from "./ClaimsLifecycle";
import ResearchAssistant from "./ResearchAssistant";
import PolicyAssistant from "./PolicyAssistant";
import BusinessAgentChat from "./BusinessAgentChat";
import EnterpriseUserProfile from "./auth/EnterpriseUserProfile";
import EnterpriseDashboard from "./EnterpriseDashboard";

interface TabsInterfaceProps {
  signOut?: () => void;
  user?: any;
}

const TabsInterface: React.FC<TabsInterfaceProps> = ({ signOut, user }) => {
  const [activeTab, setActiveTab] = useState("claims");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  const userRole = typeof window !== 'undefined' ? sessionStorage.getItem('userRole') || 'customer' : 'customer';

  const tabs = [
    { id: "claims", label: "Claims Chat", icon: "💬" },
    { id: "underwriting", label: "Underwriting", icon: "📋" },
    { id: "research", label: "Research", icon: "🔬" },
    { id: "marine", label: "Marine Insurance", icon: "🚢" },
    { id: "cyber", label: "Cyber Insurance", icon: "🛡️" },
    { id: "fnol", label: "FNOL Processor", icon: "📄" },
    { id: "lifecycle", label: "Claims Lifecycle", icon: "🔄" },
    { id: "policy", label: "Policy Assistant", icon: "📜" },
    ...(userRole === 'admin' ? [{ id: "dashboard", label: "Enterprise Dashboard", icon: "📊" }] : []),
  ];

  const businessAgents = [
    { id: "crm", label: "CRM Agent", icon: "👥" },
    { id: "hr", label: "HR Assistant", icon: "🏢" },
    { id: "marketing", label: "Marketing Agent", icon: "📈" },
    { id: "investment", label: "Investment Research", icon: "💰" },
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Header with Logo */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/sageinsure_logo.png"
              alt="SageInsure Logo"
              className="h-10 w-10 mr-3 rounded-lg"
              onError={(e) => {
                // Fallback if logo doesn't load
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = document.createElement("div");
                fallback.className =
                  "h-10 w-10 mr-3 bg-blue-600 rounded-lg flex items-center justify-center";
                fallback.innerHTML =
                  '<span class="text-white font-bold text-lg">SI</span>';
                target.parentNode?.insertBefore(fallback, target);
              }}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SageInsure</h1>
              <p className="text-xs text-gray-500">
                AI-Powered Insurance Platform
              </p>
            </div>
          </div>
          {signOut && (
            <EnterpriseUserProfile onSignOut={signOut} />
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
                      {agent.id === "crm" && "Customer Relations"}
                      {agent.id === "hr" && "Human Resources"}
                      {agent.id === "marketing" && "Marketing Analytics"}
                      {agent.id === "investment" && "Investment Analysis"}
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
            {activeTab === "underwriting" && (
              <ChatApp initialSpecialist="underwriting" />
            )}
            {activeTab === "research" && <ResearchAssistant />}
            {activeTab === "marine" && <ChatApp initialSpecialist="marine" />}
            {activeTab === "cyber" && <CyberInsurance />}
            {activeTab === "fnol" && <FNOLProcessor />}
            {activeTab === "lifecycle" && <ClaimsLifecycle />}
            {activeTab === "policy" && <PolicyAssistant />}
            {activeTab === "dashboard" && <EnterpriseDashboard />}
            {activeTab === "crm" && <BusinessAgentChat agentType="crm" />}
            {activeTab === "hr" && <BusinessAgentChat agentType="hr" />}
            {activeTab === "marketing" && (
              <BusinessAgentChat agentType="marketing" />
            )}
            {activeTab === "investment" && (
              <BusinessAgentChat agentType="investment" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabsInterface;
