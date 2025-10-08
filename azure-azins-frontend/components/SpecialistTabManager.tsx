/**
 * Specialist Tab Manager Component
 * Manages multiple specialist chat interfaces with intelligent routing
 */

import React, { useState, useEffect } from "react";
import {
  getAllSpecialists,
  getSpecialistConfig,
  SpecialistConfig,
} from "../lib/specialist-config";
import SpecialistChatInterface from "./SpecialistChatInterface";
import IntentDetectionRouter from "../lib/intent-detection-router";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  specialist?: string;
  sources?: Array<{
    title: string;
    content: string;
    score: number;
    metadata: any;
  }>;
  confidence?: number;
  tokens_used?: number;
}

interface SpecialistTabManagerProps {
  conversationId: string;
  bearerToken: string;
  initialSpecialist?: string;
  onSpecialistChange?: (specialistId: string) => void;
}

const SpecialistTabManager: React.FC<SpecialistTabManagerProps> = ({
  conversationId,
  bearerToken,
  initialSpecialist = "POLICY_ASSISTANT",
  onSpecialistChange,
}) => {
  const [activeSpecialist, setActiveSpecialist] = useState(initialSpecialist);
  const [conversationHistory, setConversationHistory] = useState<
    Record<string, Message[]>
  >({});
  const [specialists] = useState(getAllSpecialists());

  useEffect(() => {
    onSpecialistChange?.(activeSpecialist);
  }, [activeSpecialist, onSpecialistChange]);

  const handleTabChange = (specialistId: string) => {
    setActiveSpecialist(specialistId);
  };

  const handleMessageSent = (message: Message) => {
    setConversationHistory((prev) => ({
      ...prev,
      [activeSpecialist]: [...(prev[activeSpecialist] || []), message],
    }));
  };

  const handleSmartRouting = (text: string) => {
    const intentRouter = IntentDetectionRouter.getInstance();
    const recentHistory =
      conversationHistory[activeSpecialist]?.slice(-5).map((msg) => ({
        content: msg.content,
        specialist: msg.specialist,
      })) || [];

    const intentResult = intentRouter.detectIntent(
      text,
      recentHistory,
      activeSpecialist
    );

    if (
      intentResult.specialist !== activeSpecialist &&
      intentResult.confidence > 0.7
    ) {
      setActiveSpecialist(intentResult.specialist);

      // Show detailed routing notification
      const notification = document.createElement("div");
      notification.className =
        "fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 max-w-sm";
      notification.innerHTML = `
        <div class="font-semibold">Smart Routing</div>
        <div class="text-sm">Switched to ${getSpecialistConfig(intentResult.specialist).name}</div>
        <div class="text-xs opacity-75">${(intentResult.confidence * 100).toFixed(1)}% confidence</div>
      `;
      document.body.appendChild(notification);

      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 4000);

      console.log("🎯 Smart routing:", intentResult.reasoning);
    }
  };

  const renderTabButton = (specialist: SpecialistConfig) => {
    const isActive = specialist.id === activeSpecialist;
    const hasMessages = conversationHistory[specialist.id]?.length > 0;

    return (
      <button
        key={specialist.id}
        onClick={() => handleTabChange(specialist.id)}
        className={`relative flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
          isActive
            ? "bg-white text-gray-900 border-b-2"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800"
        }`}
        style={{
          borderBottomColor: isActive ? specialist.color : "transparent",
        }}>
        <span className="mr-2">{specialist.icon}</span>
        <span className="hidden sm:inline">{specialist.name}</span>
        <span className="sm:hidden">{specialist.icon}</span>

        {hasMessages && (
          <div
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
            style={{ backgroundColor: specialist.color }}
          />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Tab Navigation */}
      <div className="bg-gray-100 border-b border-gray-200 overflow-x-auto">
        <div className="flex space-x-1 p-2 min-w-max">
          {specialists.map(renderTabButton)}
        </div>
      </div>

      {/* Smart Routing Indicator */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-blue-700">
            <svg
              className="w-4 h-4 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              Smart routing enabled - I'll automatically switch to the best
              specialist for your questions
            </span>
          </div>

          <div className="text-xs text-blue-600">
            Active: {getSpecialistConfig(activeSpecialist).name}
          </div>
        </div>
      </div>

      {/* Active Specialist Interface */}
      <div className="flex-1 overflow-hidden">
        <SpecialistChatInterface
          specialistId={activeSpecialist}
          conversationId={conversationId}
          bearerToken={bearerToken}
          initialMessages={conversationHistory[activeSpecialist] || []}
          onMessageSent={handleMessageSent}
          onSpecialistChange={handleTabChange}
        />
      </div>

      {/* Conversation Summary */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            Total conversations: {Object.keys(conversationHistory).length}
          </div>
          <div>
            Messages in current specialist:{" "}
            {conversationHistory[activeSpecialist]?.length || 0}
          </div>
          <div>Session ID: {conversationId.slice(-8)}</div>
        </div>
      </div>
    </div>
  );
};

export default SpecialistTabManager;
