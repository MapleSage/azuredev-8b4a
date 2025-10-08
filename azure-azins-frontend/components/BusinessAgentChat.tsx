import React, { useState, useEffect } from "react";

interface BusinessAgentChatProps {
  agentType: "crm" | "hr" | "marketing" | "investment" | "ticketing" | "retail";
}

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
  agent?: string;
}

const BusinessAgentChat: React.FC<BusinessAgentChatProps> = ({ agentType }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const agentConfig = {
    crm: {
      title: "CRM Agent",
      icon: "👥",
      description: "Customer Relationship Management",
      color: "from-blue-500 to-blue-600",
    },
    hr: {
      title: "HR Assistant", 
      icon: "🏢",
      description: "Human Resources Support",
      color: "from-green-500 to-green-600",
    },
    marketing: {
      title: "Marketing Agent",
      icon: "📈", 
      description: "Marketing & Campaign Analytics",
      color: "from-purple-500 to-purple-600",
    },
    investment: {
      title: "Investment Research",
      icon: "💰",
      description: "Investment Analysis & Research", 
      color: "from-orange-500 to-orange-600",
    },
    ticketing: {
      title: "IT Support Agent",
      icon: "🎫",
      description: "Technical Support & Ticket Resolution",
      color: "from-red-500 to-red-600",
    },
    retail: {
      title: "Retail Agent",
      icon: "🛍️",
      description: "Customer Service & E-commerce",
      color: "from-pink-500 to-pink-600",
    },
  };

  const config = agentConfig[agentType];

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: Message = {
      id: "welcome",
      type: "assistant",
      content: `🚀 **${config.title} Ready**\n\nI'm your AI-powered ${config.description.toLowerCase()} assistant. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      agent: config.title,
    };
    setMessages([welcomeMessage]);
  }, [agentType, config]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user", 
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/business-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: agentType,
          query: input,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: data.response,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        agent: data.agent,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant", 
        content: "❌ Sorry, I'm experiencing technical difficulties. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        agent: "Error",
      };
      setMessages(prev => [...prev, errorMessage]);
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.color} text-white p-6`}>
        <div className="flex items-center">
          <span className="text-3xl mr-4">{config.icon}</span>
          <div>
            <h1 className="text-2xl font-bold">{config.title}</h1>
            <p className="text-blue-100">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.type === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white border shadow-sm"
              }`}
            >
              {message.type === "assistant" && (
                <div className="flex items-center mb-2">
                  <span className="text-lg mr-2">{config.icon}</span>
                  <span className="font-semibold text-gray-700">{message.agent}</span>
                  <span className="text-xs text-gray-500 ml-2">{message.timestamp}</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">
                {message.content.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <div key={i} className="font-bold text-lg mb-2">{line.slice(2, -2)}</div>;
                  }
                  if (line.startsWith('• ')) {
                    return <div key={i} className="ml-4 mb-1">{line}</div>;
                  }
                  return <div key={i} className="mb-1">{line}</div>;
                })}
              </div>
              {message.type === "user" && (
                <div className="text-xs text-blue-200 mt-2">{message.timestamp}</div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-center">
                <span className="text-lg mr-2">{config.icon}</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex space-x-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${config.title}...`}
            className="flex-1 border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessAgentChat;