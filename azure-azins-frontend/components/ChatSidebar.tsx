import React from "react";

interface Message {
  id: number;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
  agent?: string;
}

interface Conversation {
  id: number;
  title: string;
  messages: Message[];
  lastActivity: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversation: number | null;
  onSelectConversation: (id: number) => void;
  onNewChat: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onNewChat,
}) => {
  return (
    <div className="h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${
              selectedConversation === conversation.id
                ? "bg-blue-50 border-l-4 border-l-blue-500"
                : ""
            }`}>
            <div className="font-medium text-gray-900 truncate">
              {conversation.title}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {conversation.lastActivity}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {conversation.messages.length} messages
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
