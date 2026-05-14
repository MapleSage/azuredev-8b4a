import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SessionManager from "../lib/sessionManager";
import {
  getWorkflowEvents,
  summarizeWorkflowEvents,
  WorkflowEvent,
} from "../lib/workflow-memory";

type ChatMessage = {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
  specialist: string;
  agent?: string;
  metadata?: Record<string, any>;
};

interface PersistentChatCompanionProps {
  activeArea: string;
  activeTab: string;
  activeLabel: string;
  role: string;
  user?: any;
}

const specialistByTab: Record<string, string> = {
  home: "POLICY_ASSISTANT",
  tasks: "POLICY_ASSISTANT",
  ai: "POLICY_ASSISTANT",
  claims: "CLAIMS_CHAT",
  "claims-queue": "CLAIMS_CHAT",
  fnol: "FNOL_PROCESSOR",
  lifecycle: "CLAIMS_LIFECYCLE",
  underwriting: "UNDERWRITING",
  "uw-queue": "UNDERWRITING",
  policy: "POLICY_ASSISTANT",
  research: "RESEARCH_ASSISTANT",
  marine: "MARINE_INSURANCE",
  cyber: "CYBER_INSURANCE",
  scamshield: "CYBER_INSURANCE",
  "policy-pulse": "POLICY_ASSISTANT",
  "claims-defender": "CLAIMS_CHAT",
  "document-vault": "FNOL_PROCESSOR",
  renewals: "POLICY_ASSISTANT",
  "buying-assistance": "POLICY_ASSISTANT",
  crm: "CRM_AGENT",
  producer: "CRM_AGENT",
  marketing: "MARKETING_AGENT",
  hr: "HR_ASSISTANT",
  investment: "INVESTMENT_RESEARCH",
  dashboard: "POLICY_ASSISTANT",
};

const starterPrompts = [
  "What changed in this session?",
  "Summarize the current workflow",
  "What should I do next?",
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeDisplayName(user: any) {
  return user?.name || user?.username || user?.account?.name || "User";
}

export default function PersistentChatCompanion({
  activeArea,
  activeTab,
  activeLabel,
  role,
  user,
}: PersistentChatCompanionProps) {
  const [sessionManager] = useState(() => SessionManager.getInstance());
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const specialist = specialistByTab[activeTab] || "POLICY_ASSISTANT";
  const session = sessionManager.getCurrentSession();
  const displayName = safeDisplayName(user);

  const workflowContext = useMemo(
    () => ({
      activeArea,
      activeTab,
      activeLabel,
      role,
      user: displayName,
      conversationId: session.conversationId,
      lastActivity: session.lastActivity,
    }),
    [
      activeArea,
      activeTab,
      activeLabel,
      role,
      displayName,
      session.conversationId,
      session.lastActivity,
    ],
  );

  const refreshMessages = useCallback(() => {
    const current = sessionManager.getCurrentSession();
    setMessages(current.messages.slice(-40) as ChatMessage[]);
    setWorkflowEvents(getWorkflowEvents(6));
  }, [sessionManager]);

  useEffect(() => {
    refreshMessages();
    const handleWorkflowEvent = () => refreshMessages();
    if (typeof window !== "undefined") {
      window.addEventListener("sagesure:workflow-event", handleWorkflowEvent);
      return () =>
        window.removeEventListener(
          "sagesure:workflow-event",
          handleWorkflowEvent,
        );
    }
  }, [refreshMessages]);

  useEffect(() => {
    sessionManager.setActiveSpecialist(specialist);
    const current = sessionManager.getCurrentSession() as any;
    current.persistentMemory = {
      ...(current.persistentMemory || {}),
      currentWorkflow: workflowContext,
    };
    sessionManager.saveSession();
    refreshMessages();
  }, [specialist, workflowContext, sessionManager, refreshMessages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("sagesure_chat_companion_position");
      if (stored) setPosition(JSON.parse(stored));
      const open = localStorage.getItem("sagesure_chat_companion_open");
      if (open) setIsOpen(open === "true");
    } catch {
      // ignore corrupted local UI state
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("sagesure_chat_companion_open", String(isOpen));
    if (!isOpen) setIsMinimized(false);
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || !isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsMinimized(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isMinimized]);

  const persistPosition = (next: { x: number; y: number }) => {
    setPosition(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "sagesure_chat_companion_position",
        JSON.stringify(next),
      );
    }
  };

  const closeCompanion = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("[data-chat-control]")) return;
    dragState.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragState.current.dragging || typeof window === "undefined") return;
    const nextX = Math.max(
      8,
      Math.min(
        window.innerWidth - 360,
        dragState.current.originX + event.clientX - dragState.current.startX,
      ),
    );
    const nextY = Math.max(
      8,
      Math.min(
        window.innerHeight - 160,
        dragState.current.originY + event.clientY - dragState.current.startY,
      ),
    );
    persistPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    dragState.current.dragging = false;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(
        event.pointerId,
      );
    } catch {
      // no-op
    }
  };

  const buildContext = () => {
    const current = sessionManager.getCurrentSession();
    const recent = current.messages.slice(-16).map((message) => ({
      role: message.type === "user" ? "user" : "assistant",
      content: `[${message.specialist}] ${message.content}`,
    }));

    return [
      {
        role: "assistant",
        content: `Current SageSure workflow context: ${JSON.stringify(workflowContext)}. Structured workflow memory:\n${summarizeWorkflowEvents(10)}\nUse this to keep continuity across modules, uploads, FNOL, claims, underwriting, and WhatsApp-originated work.`,
      },
      ...recent,
    ];
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    setDraft("");
    setIsOpen(true);
    setIsMinimized(false);

    sessionManager.addMessage(
      {
        type: "user",
        content: trimmed,
        timestamp: new Date().toISOString(),
        specialist,
        metadata: { workflowContext },
      },
      specialist,
    );
    refreshMessages();
    setIsLoading(true);

    try {
      const response = await fetch("/api/azure-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          conversationId: sessionManager.getCurrentSession().conversationId,
          specialist,
          context: buildContext(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API returned ${response.status}`);
      }

      const data = await response.json();
      sessionManager.addMessage(
        {
          type: "assistant",
          content:
            data.response || data.answer || "I could not produce a response.",
          timestamp: new Date().toISOString(),
          specialist,
          agent: data.agent || "SageSure AI",
          metadata: {
            workflowContext,
            handledBy: data.handled_by,
            sources: data.sources,
          },
        },
        specialist,
      );
    } catch (error: any) {
      sessionManager.addMessage(
        {
          type: "assistant",
          content: `I hit a connection issue, but I retained the session context. Error: ${error.message}`,
          timestamp: new Date().toISOString(),
          specialist,
          agent: "SageSure AI",
          metadata: { workflowContext, error: true },
        },
        specialist,
      );
    } finally {
      setIsLoading(false);
      refreshMessages();
    }
  };

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    sendMessage(draft);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-white/40 bg-[#24384A] px-5 py-4 text-sm font-bold text-white shadow-2xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-[#1d3040]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
          ✦
        </span>
        SageSure AI
        {messages.length > 0 && (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#0A7282]">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <section
      className="fixed z-50 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
      style={{
        right: position.x,
        bottom: position.y,
        height: isMinimized ? 64 : 560,
      }}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex cursor-move items-center justify-between bg-[#24384A] px-4 py-3 text-white"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B8FA3] font-bold">
            ✦
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold">SageSure AI</div>
            <div className="text-[11px] text-slate-300">
              Session-aware · {activeLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            data-chat-control
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setIsMinimized(!isMinimized)}
            className="rounded-md px-2 py-1 text-slate-300 hover:bg-white/10 hover:text-white"
            title={isMinimized ? "Restore chat" : "Minimize chat"}
          >
            {isMinimized ? "▴" : "–"}
          </button>
          <button
            data-chat-control
            onPointerDown={(event) => event.stopPropagation()}
            onClick={closeCompanion}
            className="rounded-md px-2 py-1 text-slate-300 hover:bg-white/10 hover:text-white"
            title="Close chat"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="border-b border-slate-100 bg-[#EAF7F8] px-4 py-2 text-xs text-[#075E6D]">
            Context: {role} · {activeArea} / {activeLabel} ·{" "}
            {session.conversationId.slice(0, 18)}…
          </div>

          {workflowEvents.length > 0 && (
            <div className="border-b border-slate-100 bg-white px-4 py-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Recent workflow memory
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {workflowEvents.slice(-4).map((event) => (
                  <span
                    key={event.id}
                    title={event.summary}
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                  >
                    {event.status}: {event.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-[#f6fafb] p-4">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#BEE7EA] bg-white p-4 text-sm text-slate-600">
                I’ll stay with you across Claims, FNOL, Underwriting, uploads,
                and WhatsApp-originated work. Ask me anything as you move
                around.
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm shadow-sm ${message.type === "user" ? "bg-[#007A8A] text-white" : "bg-white text-slate-800"}`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                      <div
                        className={`mt-1 text-[10px] ${message.type === "user" ? "text-cyan-50" : "text-slate-400"}`}
                      >
                        {message.agent || message.specialist} ·{" "}
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="text-xs font-semibold text-slate-500">
                    SageSure AI is thinking…
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-white p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-[#EAF7F8] hover:text-[#007A8A]"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Ask about this session, claim, upload, or workflow…"
                rows={2}
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0B9CAF] focus:ring-2 focus:ring-[#DDF3F5]"
              />
              <button
                disabled={!draft.trim() || isLoading}
                className="rounded-xl bg-[#FF7A59] px-3 py-2 hover:bg-[#E66A4D] text-sm font-bold text-white disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
