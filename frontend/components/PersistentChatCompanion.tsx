import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import SessionManager from "../lib/sessionManager";
import { useAuth } from "../lib/msal-auth-context";
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

type ChatMode = "dock" | "focus";

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
  governance: "POLICY_ASSISTANT",
};

const starterPrompts = [
  "Summarize where I am",
  "What should I do next?",
  "Draft an operator handoff",
];

const workflowPrompts: Record<string, string[]> = {
  claims: ["Summarize claim facts", "List missing claim documents"],
  fnol: ["Create an FNOL checklist", "Prepare adjuster handoff"],
  lifecycle: ["Explain claim status", "Draft customer update"],
  underwriting: ["Assess this risk", "Find underwriting concerns"],
  policy: ["Explain coverage", "Compare deductible options"],
  crm: ["Summarize customer context", "Draft follow-up note"],
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeDisplayName(user: any) {
  return user?.name || user?.username || user?.account?.name || "User";
}

function compactSpecialistName(specialist: string) {
  return specialist.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function clampPosition(position: { x: number; y: number }) {
  if (typeof window === "undefined") return position;
  return {
    x: Math.max(8, Math.min(window.innerWidth - 360, position.x)),
    y: Math.max(8, Math.min(window.innerHeight - 160, position.y)),
  };
}

export default function PersistentChatCompanion({
  activeArea,
  activeTab,
  activeLabel,
  role,
  user,
}: PersistentChatCompanionProps) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [sessionManager] = useState(() => SessionManager.getInstance());
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [mode, setMode] = useState<ChatMode>("dock");
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
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const specialist = specialistByTab[activeTab] || "POLICY_ASSISTANT";
  const displayName = safeDisplayName(user);

  const currentSession = sessionManager.getCurrentSession();
  const workflowContext = useMemo(
    () => ({
      activeArea,
      activeTab,
      activeLabel,
      role,
      user: displayName,
      conversationId: currentSession.conversationId,
      lastActivity: currentSession.lastActivity,
    }),
    [
      activeArea,
      activeTab,
      activeLabel,
      role,
      displayName,
      currentSession.conversationId,
      currentSession.lastActivity,
    ],
  );

  const contextualPrompts = useMemo(
    () => [...(workflowPrompts[activeTab] || []), ...starterPrompts].slice(0, 5),
    [activeTab],
  );

  const refreshMessages = useCallback(() => {
    const current = sessionManager.getCurrentSession();
    setMessages(current.messages.slice(-50) as ChatMessage[]);
    setWorkflowEvents(getWorkflowEvents(8));
  }, [sessionManager]);

  useEffect(() => {
    refreshMessages();
    const handleUpdate = () => refreshMessages();
    if (typeof window !== "undefined") {
      window.addEventListener("sagesure:workflow-event", handleUpdate);
      window.addEventListener("sagesure:chat-session", handleUpdate);
      window.addEventListener("storage", handleUpdate);
      return () => {
        window.removeEventListener("sagesure:workflow-event", handleUpdate);
        window.removeEventListener("sagesure:chat-session", handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      };
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
      if (stored) setPosition(clampPosition(JSON.parse(stored)));
      const open = localStorage.getItem("sagesure_chat_companion_open");
      if (open) setIsOpen(open === "true");
      const storedMode = localStorage.getItem("sagesure_chat_companion_mode");
      if (storedMode === "dock" || storedMode === "focus") setMode(storedMode);
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
    if (typeof window === "undefined") return;
    localStorage.setItem("sagesure_chat_companion_mode", mode);
  }, [mode]);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const persistPosition = (next: { x: number; y: number }) => {
    const clamped = clampPosition(next);
    setPosition(clamped);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "sagesure_chat_companion_position",
        JSON.stringify(clamped),
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
    persistPosition({
      x: dragState.current.originX + event.clientX - dragState.current.startX,
      y: dragState.current.originY + event.clientY - dragState.current.startY,
    });
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    dragState.current.dragging = false;
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  };

  const buildContext = useCallback(
    (snapshot: typeof workflowContext, selectedSpecialist: string) => {
      const current = sessionManager.getCurrentSession();
      const recent = current.messages.slice(-16).map((message) => ({
        role: message.type === "user" ? "user" : "assistant",
        content: `[${message.specialist}] ${message.content}`,
      }));

      return [
        {
          role: "system",
          content: `SageSure workflow context: ${JSON.stringify(snapshot)}. Active specialist: ${selectedSpecialist}. Workflow memory:\n${summarizeWorkflowEvents(10)}\nAnswer as a contextual insurance operations assistant. Preserve continuity across tabs and give concrete next actions.`,
        },
        ...recent,
      ];
    },
    [sessionManager],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const selectedSpecialist = specialist;
      const contextSnapshot = {
        ...workflowContext,
        conversationId: sessionManager.getCurrentSession().conversationId,
        lastActivity: sessionManager.getCurrentSession().lastActivity,
      };

      setDraft("");
      setIsOpen(true);
      setIsMinimized(false);

      sessionManager.addMessage(
        {
          type: "user",
          content: trimmed,
          timestamp: new Date().toISOString(),
          specialist: selectedSpecialist,
          metadata: { workflowContext: contextSnapshot },
        },
        selectedSpecialist,
      );
      refreshMessages();
      setIsLoading(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (!isAuthenticated) {
          throw new Error("Authentication is required before calling SageSure AI.");
        }
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const token = await getAccessToken?.();
        if (!token) {
          throw new Error("Authentication is required before calling SageSure AI.");
        }
        headers.Authorization = `Bearer ${token}`;

        const response = await fetch("/api/azure-chat", {
          method: "POST",
          headers,
          body: JSON.stringify({
            text: trimmed,
            conversationId: contextSnapshot.conversationId,
            specialist: selectedSpecialist,
            brokerId: window.localStorage.getItem("sageinfra.activeBrokerId") || undefined,
            context: buildContext(contextSnapshot, selectedSpecialist),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`Chat API returned ${response.status}${detail ? `: ${detail}` : ""}`);
        }

        const data = await response.json();
        if (requestId !== requestIdRef.current) return;

        sessionManager.addMessage(
          {
            type: "assistant",
            content: data.response || data.answer || "I could not produce a response.",
            timestamp: new Date().toISOString(),
            specialist: selectedSpecialist,
            agent: data.agent || "SageSure AI",
            metadata: {
              workflowContext: contextSnapshot,
              handledBy: data.handled_by,
              sources: data.sources,
              status: data.status,
            },
          },
          selectedSpecialist,
        );
      } catch (error: any) {
        if (error?.name === "AbortError") return;
        sessionManager.addMessage(
          {
            type: "assistant",
            content: `I hit a connection issue, but I retained the session context and your message. Try again from the same panel. Error: ${error.message}`,
            timestamp: new Date().toISOString(),
            specialist: selectedSpecialist,
            agent: "SageSure AI",
            metadata: { workflowContext: contextSnapshot, error: true },
          },
          selectedSpecialist,
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          abortRef.current = null;
        }
        refreshMessages();
      }
    },
    [
      buildContext,
      getAccessToken,
      isAuthenticated,
      isLoading,
      refreshMessages,
      sessionManager,
      specialist,
      workflowContext,
    ],
  );

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    sendMessage(draft);
  };

  const latestAssistant = [...messages].reverse().find((message) => message.type === "assistant");
  const activeSpecialistLabel = compactSpecialistName(specialist);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-6 right-6 z-50 overflow-hidden rounded-3xl border border-white/60 bg-slate-950 text-left text-white shadow-2xl shadow-slate-900/30 transition hover:-translate-y-1 hover:shadow-[#0B8FA3]/30"
        aria-label="Open SageSure AI chat"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B8FA3] via-[#24384A] to-slate-950 opacity-95" />
        <div className="relative flex items-center gap-3 px-4 py-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-xl ring-1 ring-white/25 transition group-hover:scale-105">
            ✦
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-black">SageSure AI</span>
            <span className="block max-w-[210px] truncate text-xs font-medium text-cyan-50/85">
              {activeArea} / {activeLabel}
            </span>
          </span>
          {messages.length > 0 && (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-[#0A7282]">
              {messages.length}
            </span>
          )}
        </div>
      </button>
    );
  }

  return (
    <section
      className={`fixed z-50 flex flex-col overflow-hidden border border-white/70 bg-white shadow-2xl shadow-slate-900/25 ${
        mode === "focus" ? "rounded-[28px]" : "rounded-3xl"
      }`}
      style={
        mode === "focus"
          ? {
              right: 24,
              bottom: 24,
              width: "min(760px, calc(100vw - 48px))",
              height: isMinimized ? 72 : "min(720px, calc(100vh - 48px))",
            }
          : {
              right: position.x,
              bottom: position.y,
              width: "min(430px, calc(100vw - 32px))",
              height: isMinimized ? 72 : "min(680px, calc(100vh - 32px))",
            }
      }
      aria-label="SageSure AI contextual chat"
    >
      <div
        onPointerDown={mode === "dock" ? handlePointerDown : undefined}
        onPointerMove={mode === "dock" ? handlePointerMove : undefined}
        onPointerUp={mode === "dock" ? handlePointerUp : undefined}
        className={`relative flex items-center justify-between overflow-hidden bg-slate-950 px-4 py-3 text-white ${mode === "dock" ? "cursor-move" : ""}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B8FA3] via-[#24384A] to-slate-950" />
        <div className="relative flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl ring-1 ring-white/20">
            ✦
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-black tracking-tight">SageSure AI</div>
            <div className="truncate text-[11px] font-semibold text-cyan-50/85">
              {isAuthenticated ? activeSpecialistLabel : "Auth required"} · {activeLabel}
            </div>
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          <button
            data-chat-control
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setMode(mode === "dock" ? "focus" : "dock")}
            className="rounded-lg px-2 py-1 text-xs font-bold text-slate-200 hover:bg-white/10 hover:text-white"
            title={mode === "dock" ? "Expand chat" : "Return to blob"}
          >
            {mode === "dock" ? "Expand" : "Dock"}
          </button>
          <button
            data-chat-control
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setIsMinimized(!isMinimized)}
            className="rounded-lg px-2 py-1 text-lg leading-none text-slate-200 hover:bg-white/10 hover:text-white"
            title={isMinimized ? "Restore chat" : "Minimize chat"}
          >
            {isMinimized ? "▴" : "–"}
          </button>
          <button
            data-chat-control
            onPointerDown={(event) => event.stopPropagation()}
            onClick={closeCompanion}
            className="rounded-lg px-2 py-1 text-lg leading-none text-slate-200 hover:bg-white/10 hover:text-white"
            title="Close chat"
          >
            ×
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="border-b border-slate-100 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600">
              <span className="rounded-full bg-[#EAF7F8] px-2.5 py-1 text-[#075E6D]">
                {role}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                {activeArea} / {activeLabel}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                {currentSession.conversationId.slice(0, 18)}…
              </span>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Context synced
              </span>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 bg-[#f6fafb] md:grid-cols-[1fr_180px]">
            <div className="min-h-0 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#BEE7EA] bg-white p-5 text-sm text-slate-650 shadow-sm">
                  <div className="mb-2 text-lg font-black text-[#24384A]">Context-aware chat is ready</div>
                  <p className="leading-relaxed text-slate-600">
                    I’ll stay with you across Claims, FNOL, Underwriting, CRM, uploads, and workflow changes. Ask once and keep moving through the workspace.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm shadow-sm ${
                          message.type === "user"
                            ? "bg-[#007A8A] text-white"
                            : "border border-slate-100 bg-white text-slate-800"
                        }`}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </div>
                        <div
                          className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${
                            message.type === "user" ? "text-cyan-50" : "text-slate-400"
                          }`}
                        >
                          <span>{message.agent || compactSpecialistName(message.specialist)}</span>
                          <span>·</span>
                          <span>{formatTime(message.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-3xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-500 shadow-sm">
                        <span className="mr-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-[#0B8FA3]" />
                        SageSure AI is reading workflow context…
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <aside className="hidden min-h-0 border-l border-slate-100 bg-white/80 p-3 md:block">
              <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                Live context
              </div>
              <div className="space-y-2 text-xs">
                <div className="rounded-2xl bg-[#F0FAFB] p-3 text-[#075E6D]">
                  <div className="font-black">Specialist</div>
                  <div className="mt-1 text-[#075E6D]/80">{activeSpecialistLabel}</div>
                </div>
                {workflowEvents.slice(-4).map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-100 bg-white p-3 text-slate-600">
                    <div className="font-black text-slate-800">{event.title}</div>
                    <div className="mt-1 line-clamp-3 text-[11px] leading-snug">{event.summary}</div>
                  </div>
                ))}
                {latestAssistant && (
                  <div className="rounded-2xl bg-slate-900 p-3 text-white">
                    <div className="font-black">Last agent</div>
                    <div className="mt-1 text-white/70">{latestAssistant.agent || compactSpecialistName(latestAssistant.specialist)}</div>
                  </div>
                )}
              </div>
            </aside>
          </div>

          <div className="border-t border-slate-100 bg-white p-3">
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {contextualPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-600 hover:bg-[#EAF7F8] hover:text-[#007A8A] disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#0B9CAF] focus-within:ring-2 focus-within:ring-[#DDF3F5]">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={`Ask about ${activeArea} / ${activeLabel}…`}
                rows={mode === "focus" ? 3 : 2}
                className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
              />
              <button
                disabled={!draft.trim() || isLoading}
                className="rounded-2xl bg-[#FF7A59] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-[#E66A4D] disabled:opacity-50"
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
