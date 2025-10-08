import { useState, useCallback, useEffect } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatArea } from "./ChatArea";
import { MessageInput } from "./MessageInput";
import SessionManager from "../lib/sessionManager";
import { useChatApi } from "../lib/api-client";
import { useAuth, useUserProfile } from "../lib/msal-auth-context";

type Specialist =
  | "CLAIMS_CHAT"
  | "UNDERWRITING"
  | "RESEARCH_ASSISTANT"
  | "MARINE_INSURANCE"
  | "CYBER_INSURANCE"
  | "FNOL_PROCESSOR"
  | "CLAIMS_LIFECYCLE"
  | "POLICY_ASSISTANT"
  | "CRM_AGENT"
  | "HR_ASSISTANT"
  | "MARKETING_AGENT"
  | "INVESTMENT_RESEARCH";

interface TabConfig {
  title: string;
  icon: string;
  description: string;
  endpoint: string;
  knowledgeBase: string;
  features: string[];
}

const TabConfigs: Record<Specialist, TabConfig> = {
  CLAIMS_CHAT: {
    title: "Claims Chat",
    icon: "💬",
    description: "General claims assistance",
    endpoint: "claims-chat",
    knowledgeBase: "GENERAL",
    features: ["claim-creation", "status-tracking", "document-upload"],
  },
  UNDERWRITING: {
    title: "Underwriting",
    icon: "📋",
    description: "Risk assessment and underwriting",
    endpoint: "underwriting",
    knowledgeBase: "UNDERWRITING",
    features: ["risk-assessment", "document-analysis", "acord-forms"],
  },
  RESEARCH_ASSISTANT: {
    title: "Research Assistant",
    icon: "🧬",
    description: "Life science research",
    endpoint: "research",
    knowledgeBase: "RESEARCH",
    features: ["pubmed-search", "clinical-trials", "drug-discovery"],
  },
  CYBER_INSURANCE: {
    title: "Cyber Insurance",
    icon: "🛡️",
    description: "Cyber risk assessment",
    endpoint: "cyber",
    knowledgeBase: "CYBER",
    features: ["breach-analysis", "risk-scoring", "security-assessment"],
  },
  FNOL_PROCESSOR: {
    title: "FNOL Processor",
    icon: "📄",
    description: "First Notice of Loss processing",
    endpoint: "fnol",
    knowledgeBase: "FNOL",
    features: ["incident-reporting", "document-processing", "claim-initiation"],
  },
  CLAIMS_LIFECYCLE: {
    title: "Claims Lifecycle",
    icon: "📊",
    description: "Event-driven claims management",
    endpoint: "lifecycle",
    knowledgeBase: "LIFECYCLE",
    features: ["workflow-management", "status-tracking", "automation"],
  },
  POLICY_ASSISTANT: {
    title: "Policy Assistant",
    icon: "🏛️",
    description: "24/7 policy guidance",
    endpoint: "policy",
    knowledgeBase: "POLICY",
    features: ["policy-lookup", "coverage-analysis", "endorsements"],
  },
  MARINE_INSURANCE: {
    title: "Marine Insurance",
    icon: "🚢",
    description: "Marine and cargo insurance",
    endpoint: "marine",
    knowledgeBase: "MARINE",
    features: ["vessel-coverage", "cargo-protection", "marine-claims"],
  },
  CRM_AGENT: {
    title: "CRM Agent",
    icon: "👥",
    description: "Customer relationship management",
    endpoint: "crm",
    knowledgeBase: "CRM",
    features: ["customer-data", "lead-management", "sales-pipeline"],
  },
  HR_ASSISTANT: {
    title: "HR Assistant",
    icon: "🏢",
    description: "Human resources support",
    endpoint: "hr",
    knowledgeBase: "HR",
    features: ["employee-onboarding", "policy-guidance", "benefits-info"],
  },
  MARKETING_AGENT: {
    title: "Marketing Agent",
    icon: "📈",
    description: "Marketing and campaign management",
    endpoint: "marketing",
    knowledgeBase: "MARKETING",
    features: ["campaign-analysis", "lead-generation", "market-research"],
  },
  INVESTMENT_RESEARCH: {
    title: "Investment Research",
    icon: "💰",
    description: "Investment analysis and research",
    endpoint: "investment",
    knowledgeBase: "INVESTMENT",
    features: ["market-analysis", "portfolio-research", "risk-assessment"],
  },
};

interface IntentRule {
  id: Specialist;
  must: RegExp[];
  avoid: RegExp[];
  confidence: number;
}

const IntentRules: IntentRule[] = [
  {
    id: "CYBER_INSURANCE",
    must: [
      /cyber|ransom|breach|hack|malware|edr|soar|data.*breach|security.*incident/,
    ],
    avoid: [],
    confidence: 0.9,
  },
  {
    id: "RESEARCH_ASSISTANT",
    must: [
      /trial|pubmed|chembl|arxiv|inhibitor|target|research|study|clinical|drug|biomedical/,
    ],
    avoid: [],
    confidence: 0.9,
  },
  {
    id: "FNOL_PROCESSOR",
    must: [
      /first notice|fnol|file.*claim|report.*claim|new.*claim|accident|incident/,
    ],
    avoid: [/status|track/],
    confidence: 0.8,
  },
  {
    id: "UNDERWRITING",
    must: [/underwrit|aps|medical|risk.*assess|mib|reinsurance|quote|premium/],
    avoid: [],
    confidence: 0.8,
  },
  {
    id: "CLAIMS_LIFECYCLE",
    must: [/workflow|lifecycle|automation|event.*driven|process.*management/],
    avoid: [],
    confidence: 0.7,
  },
  {
    id: "CLAIMS_CHAT",
    must: [/claim|settlement|adjuster|damage|loss/],
    avoid: [/file.*claim|first notice|status|track/],
    confidence: 0.6,
  },
  {
    id: "POLICY_ASSISTANT",
    must: [
      /policy|coverage|endorsement|deductible|certificate|terms|conditions/,
    ],
    avoid: [/file.*claim/],
    confidence: 0.5,
  },
];

const detectSpecialist = (
  text: string
): { specialist: Specialist; confidence: number } => {
  const t = text.toLowerCase();
  let bestMatch: { specialist: Specialist; confidence: number } = {
    specialist: "POLICY_ASSISTANT",
    confidence: 0.1,
  };

  for (const rule of IntentRules) {
    let score = 0;
    let matches = 0;
    let avoids = 0;

    // Check must patterns
    for (const pattern of rule.must) {
      if (pattern.test(t)) {
        matches++;
        score += rule.confidence;
      }
    }

    // Check avoid patterns
    for (const pattern of rule.avoid) {
      if (pattern.test(t)) {
        avoids++;
        score -= 0.3;
      }
    }

    // Calculate final confidence
    const finalConfidence = matches > 0 ? score - avoids * 0.3 : 0;

    if (finalConfidence > bestMatch.confidence) {
      bestMatch = {
        specialist: rule.id,
        confidence: finalConfidence,
      };
    }
  }

  return bestMatch;
};

interface StrandsMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: string;
}

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

type Provider = "openai" | "azure" | "bedrock";

class StrandsClient {
  private getAuthToken(): string | null {
    if (typeof window === "undefined") return null;

    try {
      const sessionData = localStorage.getItem("sageinsure_auth_session");
      if (sessionData) {
        const session = JSON.parse(sessionData);
        return session.accessToken || session.idToken;
      }
    } catch (error) {
      console.error("Failed to get auth token:", error);
    }
    return null;
  }

  async sendMessage(
    message: string,
    specialist: Specialist,
    conversationId: string,
    provider: Provider = "openai",
    model: string = "gpt-4o-mini"
  ): Promise<StrandsMessage> {
    try {
      const authToken = this.getAuthToken() || "demo-token";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      };

      console.log(`🚀 Sending to Azure Chat API: ${specialist}`);

      const response = await fetch("/api/azure-chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text: message,
          conversationId: conversationId,
          specialist: specialist,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(
        `✅ Response from ${data.agent}:`,
        data.response?.substring(0, 100)
      );

      return {
        id: Date.now().toString(),
        role: "assistant",
        content: data.response || "No response received",
        timestamp: new Date(),
        agent: data.agent || specialist,
      };
    } catch (error: any) {
      console.error("Agent communication error:", error);

      // Return a helpful error message instead of throwing
      return {
        id: Date.now().toString(),
        role: "assistant",
        content: `I apologize, but I'm experiencing a connection issue. However, I can still help you with general guidance about ${specialist.replace("_", " ").toLowerCase()}. Please try your question again, or contact support if the issue persists.`,
        timestamp: new Date(),
        agent: "Error Handler",
      };
    }
  }

  async createSession(): Promise<string> {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface ChatAppProps {
  initialSpecialist?: string;
}

export default function ChatApp({
  initialSpecialist = "claims",
}: ChatAppProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [strandsClient] = useState(() => new StrandsClient());
  const [sessionManager] = useState(() => SessionManager.getInstance());
  const [provider, setProvider] = useState<Provider>("openai");

  // Authentication hooks
  const { isAuthenticated } = useAuth();
  const userProfile = useUserProfile();
  const chatApi = useChatApi();

  // Map tab IDs to specialist IDs (updated for new FastAPI architecture)
  const getSpecialistFromTab = (tabId: string): Specialist => {
    const mapping: Record<string, Specialist> = {
      claims: "CLAIMS_CHAT",
      underwriting: "UNDERWRITING",
      research: "RESEARCH_ASSISTANT",
      marine: "MARINE_INSURANCE",
      cyber: "CYBER_INSURANCE",
      fnol: "FNOL_PROCESSOR",
      lifecycle: "CLAIMS_LIFECYCLE",
      policy: "POLICY_ASSISTANT",
      crm: "CRM_AGENT",
      hr: "HR_ASSISTANT",
      marketing: "MARKETING_AGENT",
      investment: "INVESTMENT_RESEARCH",
    };
    return mapping[tabId] || "CLAIMS_CHAT";
  };

  // Session-based state management
  const [sessionData, setSessionData] = useState(() =>
    sessionManager.getCurrentSession()
  );
  const initialSpecialistType = getSpecialistFromTab(initialSpecialist);
  const [activeTab, setActiveTab] = useState<Specialist>(initialSpecialistType);
  const [activeSpecialist, setActiveSpecialist] = useState<Specialist>(
    initialSpecialistType
  );

  // Tab-specific conversation contexts derived from session
  const [tabConversations, setTabConversations] = useState<
    Record<Specialist, Conversation[]>
  >(() => {
    const initialTabs: Record<Specialist, Conversation[]> = {} as Record<
      Specialist,
      Conversation[]
    >;
    Object.keys(TabConfigs).forEach((specialist) => {
      const specialistMessages =
        sessionManager.getSpecialistMessages(specialist);
      if (specialistMessages.length > 0) {
        // Convert session messages to conversation format
        const conversation: Conversation = {
          id: 1,
          title: TabConfigs[specialist as Specialist].title,
          messages: specialistMessages.map((msg, index) => ({
            id: index + 1,
            type: msg.type,
            content: msg.content,
            timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            agent: msg.agent,
          })),
          lastActivity: new Date(sessionData.lastActivity).toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
        };
        initialTabs[specialist as Specialist] = [conversation];
      } else {
        initialTabs[specialist as Specialist] = [];
      }
    });
    return initialTabs;
  });

  const [tabSelectedConversation, setTabSelectedConversation] = useState<
    Record<Specialist, number | null>
  >(() => {
    const initialSelection: Record<Specialist, number | null> = {} as Record<
      Specialist,
      number | null
    >;
    Object.keys(TabConfigs).forEach((specialist) => {
      // Set to 1 if there are messages for this specialist, null otherwise
      const hasMessages =
        sessionManager.getSpecialistMessages(specialist).length > 0;
      initialSelection[specialist as Specialist] = hasMessages ? 1 : null;
    });
    return initialSelection;
  });

  useEffect(() => {
    setIsClient(true);
    initializeSession();

    // Cleanup session on component unmount (when user exits)
    return () => {
      // Save final session state before cleanup
      sessionManager.saveSession();
    };
  }, [sessionManager]);

  const initializeSession = async () => {
    try {
      // Session is already loaded in state initialization
      // Just ensure we have the current session data
      const currentSession = sessionManager.getCurrentSession();
      setSessionData(currentSession);

      console.log(`📱 Session restored: ${currentSession.conversationId}`);
      console.log(`📊 Session stats:`, sessionManager.getSessionStats());
    } catch (error) {
      console.error("Failed to initialize session:", error);
    }
  };

  const handleSelectConversation = useCallback(
    (id: number) => {
      setTabSelectedConversation((prev) => ({
        ...prev,
        [activeSpecialist]: id,
      }));
    },
    [activeSpecialist]
  );

  const handleNewChat = useCallback(async () => {
    const currentTabConversations = tabConversations[activeSpecialist] || [];
    const newId = Math.max(...currentTabConversations.map((c) => c.id), 0) + 1;
    const newConversation: Conversation = {
      id: newId,
      title: "New Chat",
      messages: [],
      lastActivity: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setTabConversations((prev) => ({
      ...prev,
      [activeSpecialist]: [newConversation, ...(prev[activeSpecialist] || [])],
    }));
    setTabSelectedConversation((prev) => ({
      ...prev,
      [activeSpecialist]: newId,
    }));
  }, [tabConversations, activeSpecialist]);

  const handleSendMessage = useCallback(
    async (content: string, files?: File[]) => {
      // Let FastAPI handle specialist detection - just use current tab
      const targetSpecialist = activeTab;
      setActiveSpecialist(activeTab);
      sessionManager.setActiveSpecialist(activeTab);

      console.log(
        `📤 Sending message to ${TabConfigs[targetSpecialist].title}`
      );

      // Add user message to session with persistent memory
      const userSessionMessage = sessionManager.addMessage(
        {
          type: "user",
          content,
          timestamp: new Date().toISOString(),
          specialist: targetSpecialist,
        },
        targetSpecialist
      );

      // Update local state for immediate UI feedback
      updateTabConversationFromSession(targetSpecialist);

      setIsLoading(true);

      try {
        // Get conversation context for the API call
        const context = sessionManager.getSpecialistContext(
          targetSpecialist,
          10
        );
        const crossContext = sessionManager.getCrossSpecialistContext(
          targetSpecialist,
          3
        );

        // Use authenticated API client
        const response = await chatApi.sendMessage(content, {
          specialist: targetSpecialist,
          conversationId: sessionData.conversationId,
          context: context.map((msg) => ({
            role: msg.type === "user" ? "user" : "assistant",
            content: msg.content,
          })),
        });

        const strandsMessage = {
          id: Date.now().toString(),
          role: "assistant" as const,
          content: response.response,
          timestamp: new Date(),
          agent: response.agent,
        };

        console.log(
          `✅ Response from ${strandsMessage.agent || "FastAPI"}: ${strandsMessage.content.substring(0, 100)}...`
        );

        // Add assistant response to session
        const assistantSessionMessage = sessionManager.addMessage(
          {
            type: "assistant",
            content: strandsMessage.content,
            timestamp: new Date().toISOString(),
            specialist: targetSpecialist,
            agent: strandsMessage.agent,
          },
          targetSpecialist
        );

        // Update local state with new message
        updateTabConversationFromSession(targetSpecialist);

        // Update session data state
        setSessionData(sessionManager.getCurrentSession());

        console.log(
          `💾 Message saved to session. Total messages: ${sessionManager.getSessionStats().totalMessages}`
        );
      } catch (error: any) {
        // Add error message to session
        sessionManager.addMessage(
          {
            type: "assistant",
            content: `❌ Error: ${error.message}`,
            timestamp: new Date().toISOString(),
            specialist: targetSpecialist,
            agent: "Error",
          },
          targetSpecialist
        );

        // Update local state with error message
        updateTabConversationFromSession(targetSpecialist);
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeTab,
      sessionManager,
      sessionData.conversationId,
      strandsClient,
      provider,
    ]
  );

  // Helper function to update tab conversation from session data
  const updateTabConversationFromSession = useCallback(
    (specialist: Specialist) => {
      const messages = sessionManager.getSpecialistMessages(specialist);
      if (messages.length > 0) {
        const conversation: Conversation = {
          id: 1,
          title: TabConfigs[specialist].title,
          messages: messages.map((msg, index) => ({
            id: index + 1,
            type: msg.type,
            content: msg.content,
            timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            agent: msg.agent,
          })),
          lastActivity: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setTabConversations((prev) => ({
          ...prev,
          [specialist]: [conversation],
        }));

        setTabSelectedConversation((prev) => ({
          ...prev,
          [specialist]: 1,
        }));
      }
    },
    [sessionManager]
  );

  // Tab management functions
  const handleTabSwitch = useCallback(
    (specialist: Specialist) => {
      setActiveTab(specialist);
      setActiveSpecialist(specialist);
      sessionManager.setActiveSpecialist(specialist);

      // Restore conversation context when switching tabs
      updateTabConversationFromSession(specialist);

      console.log(`🔄 Switched to ${TabConfigs[specialist].title}`);
      console.log(
        `📊 Specialist context: ${sessionManager.getSpecialistMessages(specialist).length} messages`
      );
    },
    [sessionManager, updateTabConversationFromSession]
  );

  const initializeTabConversation = useCallback(
    (specialist: Specialist) => {
      // Check if specialist already has messages in session
      const existingMessages = sessionManager.getSpecialistMessages(specialist);

      if (existingMessages.length > 0) {
        // Restore from session
        updateTabConversationFromSession(specialist);
        console.log(
          `🔄 Restored ${existingMessages.length} messages for ${TabConfigs[specialist].title}`
        );
      } else {
        // Create new conversation with welcome message
        const welcomeMessage = `🚀 **${TabConfigs[specialist].title} Active**\n\n${TabConfigs[specialist].description}\n\n**Specialized Features:**\n${TabConfigs[specialist].features.map((f) => `✅ ${f.replace("-", " ")}`).join("\n")}\n\nHow can I help you with ${TabConfigs[specialist].title.toLowerCase()}?`;

        // Add welcome message to session
        sessionManager.addMessage(
          {
            type: "assistant",
            content: welcomeMessage,
            timestamp: new Date().toISOString(),
            specialist: specialist,
            agent: TabConfigs[specialist].title,
          },
          specialist
        );

        // Update local state
        updateTabConversationFromSession(specialist);

        console.log(
          `🆕 Initialized new conversation for ${TabConfigs[specialist].title}`
        );
      }
    },
    [sessionManager, updateTabConversationFromSession]
  );

  // Initialize tab conversation if none exists
  useEffect(() => {
    if (tabConversations[activeTab].length === 0) {
      initializeTabConversation(activeTab);
    }
  }, [activeTab, tabConversations, initializeTabConversation]);

  // Update active specialist when initialSpecialist prop changes
  useEffect(() => {
    const newSpecialist = getSpecialistFromTab(initialSpecialist);
    if (newSpecialist !== activeTab) {
      setActiveTab(newSpecialist);
      setActiveSpecialist(newSpecialist);
      sessionManager.setActiveSpecialist(newSpecialist);
    }
  }, [initialSpecialist, activeTab, sessionManager]);

  // Session persistence - save session data periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      sessionManager.saveSession();
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [sessionManager]);

  // Handle browser close/refresh - save session
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionManager.saveSession();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [sessionManager]);

  const currentConversation =
    tabConversations[activeTab].find(
      (c) => c.id === tabSelectedConversation[activeTab]
    ) || null;

  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white">
      <div className="w-80 flex-shrink-0">
        <ChatSidebar
          conversations={tabConversations[activeTab]}
          selectedConversation={tabSelectedConversation[activeTab]}
          onSelectConversation={(id) => {
            setTabSelectedConversation((prev) => ({
              ...prev,
              [activeTab]: id,
            }));
          }}
          onNewChat={() => initializeTabConversation(activeTab)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-hidden">
          <ChatArea conversation={currentConversation} isLoading={isLoading} />
        </div>

        <div className="border-t bg-white">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
