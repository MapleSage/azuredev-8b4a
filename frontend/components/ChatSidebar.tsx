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
  mode?: "claims" | "default";
}

const claimWorkItems = [
  { id: "CLM-2026-10482", label: "Water damage", insured: "Mason Property Group", status: "Missing docs", tone: "amber" },
  { id: "FNOL-2026-2219", label: "Wind / roof", insured: "Elena Garcia", status: "Triage", tone: "red" },
  { id: "CLM-2026-10422", label: "Fire loss", insured: "Northlake Foods", status: "Payment review", tone: "teal" },
];

function statusClass(tone: string) {
  if (tone === "red") return "bg-[#FFF0F0] text-[#B84A4A] border-[#F8D8D8]";
  if (tone === "amber") return "bg-[#FFF1EC] text-[#C85537] border-[#FFE1D6]";
  return "bg-[#EAF7F8] text-[#007A8A] border-[#BEE7EA]";
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onNewChat,
  mode = "default",
}) => {
  const isClaims = mode === "claims";

  return (
    <div className="h-full bg-[#f8fafb] border-r border-slate-200 flex flex-col">
      <div className="p-4 border-b border-slate-200 bg-white">
        <button
          onClick={onNewChat}
          className="w-full bg-[#007A8A] text-white px-4 py-2 rounded-lg hover:bg-[#075E6D] transition-colors font-semibold"
        >
          {isClaims ? "+ New claim thread" : "+ New chat"}
        </button>
        {isClaims && (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Use threads for coverage questions, claim summaries, missing-doc follow-up, and adjuster notes.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {isClaims ? "Active claim conversations" : "Conversations"}
        </div>
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onSelectConversation(conversation.id)}
            className={`mx-3 mb-2 rounded-lg border p-3 cursor-pointer transition-colors ${
              selectedConversation === conversation.id
                ? "border-[#BEE7EA] bg-[#EAF7F8] shadow-sm"
                : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="font-semibold text-slate-900 truncate">{conversation.title}</div>
            <div className="text-sm text-slate-500 mt-1">{conversation.lastActivity}</div>
            <div className="text-xs text-slate-400 mt-1">{conversation.messages.length} messages</div>
          </div>
        ))}

        {isClaims && (
          <div className="mt-4 border-t border-slate-200 px-3 pt-4">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Sample work queue</div>
            <div className="mt-2 space-y-2">
              {claimWorkItems.map((item) => (
                <button key={item.id} className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-[#BEE7EA] hover:bg-[#F0FAFB]">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#007A8A]">{item.id}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.insured}</div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(item.tone)}`}>{item.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
