/**
 * Specialist Chat Interface Component
 * Provides domain-specific chat experience with RAG integration
 */

import React, { useState, useEffect, useRef } from "react";
import {
  SpecialistConfig,
  getSpecialistConfig,
} from "../lib/specialist-config";
import {
  SageInsureAgentCoreClient,
  AgentCoreResponse,
} from "../lib/sageinsure-agentcore-client";

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

interface SpecialistChatInterfaceProps {
  specialistId: string;
  conversationId: string;
  onMessageSent?: (message: Message) => void;
  onSpecialistChange?: (specialistId: string) => void;
  initialMessages?: Message[];
  bearerToken: string;
}

const SpecialistChatInterface: React.FC<SpecialistChatInterfaceProps> = ({
  specialistId,
  conversationId,
  onMessageSent,
  onSpecialistChange,
  initialMessages = [],
  bearerToken,
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const client = useRef(new SageInsureAgentCoreClient());

  const config = getSpecialistConfig(specialistId);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      type: "user",
      content: inputText.trim(),
      timestamp: new Date(),
      specialist: specialistId,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = inputText.trim();
    setInputText("");
    setIsLoading(true);

    // Create placeholder for streaming response
    const assistantMessageId = `msg-${Date.now()}-assistant`;
    const placeholderMessage: Message = {
      id: assistantMessageId,
      type: "assistant",
      content: "",
      timestamp: new Date(),
      specialist: specialistId,
    };
    
    setMessages((prev) => [...prev, placeholderMessage]);

    try {
      // Use direct API call for real-time response
      const response = await fetch('/api/azure-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bearerToken}`,
        },
        body: JSON.stringify({
          text: messageText,
          conversationId: conversationId,
          specialist: specialistId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Update the placeholder message with real response
      const finalMessage: Message = {
        id: assistantMessageId,
        type: "assistant",
        content: data.response || "I apologize, but I couldn't generate a response.",
        timestamp: new Date(),
        specialist: specialistId,
        sources: data.sources || [],
        confidence: data.confidence,
        tokens_used: data.tokens_used,
      };

      setMessages((prev) => 
        prev.map(msg => 
          msg.id === assistantMessageId ? finalMessage : msg
        )
      );
      
      onMessageSent?.(finalMessage);
    } catch (error) {
      console.error("Failed to send message:", error);

      const errorMessage: Message = {
        id: assistantMessageId,
        type: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
        specialist: specialistId,
      };

      setMessages((prev) => 
        prev.map(msg => 
          msg.id === assistantMessageId ? errorMessage : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderSources = (sources: Message["sources"]) => {
    if (!sources || sources.length === 0) return null;

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Sources</h4>
          <button
            onClick={() => setShowSources(!showSources)}
            className="text-xs text-blue-600 hover:text-blue-800">
            {showSources ? "Hide" : "Show"} ({sources.length})
          </button>
        </div>

        {showSources && (
          <div className="space-y-2">
            {sources.map((source, index) => (
              <div key={index} className="p-2 bg-white rounded border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">
                    {source.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    Score: {(source.score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {source.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderMessage = (message: Message) => {
    const isUser = message.type === "user";

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
        <div className={`max-w-3xl ${isUser ? "order-2" : "order-1"}`}>
          {!isUser && (
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">{config.icon}</span>
              <span
                className="text-sm font-semibold"
                style={{ color: config.color }}>
                {config.name}
              </span>
              {message.confidence && config.uiConfig.showConfidence && (
                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {(message.confidence * 100).toFixed(1)}% confident
                </span>
              )}
            </div>
          )}

          <div
            className={`p-3 rounded-lg ${
              isUser
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-800"
            }`}>
            <p className="whitespace-pre-wrap">{message.content}</p>

            {!isUser &&
              config.uiConfig.showTokenUsage &&
              message.tokens_used && (
                <div className="mt-2 text-xs text-gray-500">
                  Tokens used: {message.tokens_used}
                </div>
              )}
          </div>

          {!isUser &&
            config.uiConfig.sourceDisplayFormat === "citations" &&
            renderSources(message.sources)}

          <div className="text-xs text-gray-500 mt-1">
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-3xl mr-3">{config.icon}</span>
            <div>
              <h2 className="text-xl font-bold" style={{ color: config.color }}>
                {config.name}
              </h2>
              <p className="text-sm text-gray-600">{config.description}</p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1">Conversation ID</div>
            <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
              {conversationId}
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-1">Capabilities:</div>
          <div className="flex flex-wrap gap-1">
            {config.capabilities.slice(0, 3).map((capability, index) => (
              <span
                key={index}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {capability}
              </span>
            ))}
            {config.capabilities.length > 3 && (
              <span className="text-xs text-gray-500">
                +{config.capabilities.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">{config.icon}</div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: config.color }}>
              {config.uiConfig.welcomeMessage}
            </h3>
            <div className="text-sm text-gray-600 mb-4">Try asking:</div>
            <div className="space-y-2">
              {config.examples.slice(0, 2).map((example, index) => (
                <button
                  key={index}
                  onClick={() => setInputText(example)}
                  className="block w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                  <span className="text-sm text-gray-700">{example}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(renderMessage)}

        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-3xl">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">{config.icon}</span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: config.color }}>
                  {config.name}
                </span>
              </div>
              <div className="bg-white border border-gray-200 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={config.uiConfig.placeholder}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Send
          </button>
        </div>

        {/* Guardrails */}
        <div className="mt-2 text-xs text-gray-500">
          <span className="font-semibold">Note:</span> {config.guardrails[0]}
        </div>
      </div>
    </div>
  );
};

export default SpecialistChatInterface;
