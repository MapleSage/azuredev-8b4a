import React, { useEffect, useMemo, useState } from "react";
import ChatApp from "./ChatApp";
import FNOLProcessor from "./FNOLProcessor";
import CyberInsurance from "./CyberInsurance";
import { ClaimsLifecycle } from "./ClaimsLifecycle";
import ResearchAssistant from "./ResearchAssistant";
import PolicyAssistant from "./PolicyAssistant";
import BusinessAgentChat from "./BusinessAgentChat";
import EnterpriseUserProfile from "./auth/EnterpriseUserProfile";
import EnterpriseDashboard from "./EnterpriseDashboard";
import SageSureDashboard from "./SageSureDashboard";
import UnderwritingWorkbench from "./UnderwritingWorkbench";
import PersistentChatCompanion from "./PersistentChatCompanion";
import { publishWorkflowEvent } from "../lib/workflow-memory";
import { useChatApi, type RuntimeStatusData } from "../lib/api-client";

interface TabsInterfaceProps {
  signOut?: () => void;
  user?: any;
}

type Role =
  | "producer"
  | "underwriter"
  | "claims"
  | "manager"
  | "admin"
  | "customer";

interface ModuleItem {
  id: string;
  label: string;
  icon: string;
  description?: string;
  roles?: Role[];
  badge?: string;
  hidden?: boolean;
}

interface ProductArea {
  id: string;
  label: string;
  icon: string;
  color: string;
  roles?: Role[];
  items: ModuleItem[];
}

const productAreas: ProductArea[] = [
  {
    id: "home",
    label: "Home",
    icon: "⌂",
    color: "bg-[#0B8FA3]",
    items: [
      {
        id: "home",
        label: "Overview",
        icon: "⌂",
        description: "Operational command center",
      },
      {
        id: "tasks",
        label: "My Tasks",
        icon: "☑",
        description: "Open work and approvals",
        hidden: true,
      },
      {
        id: "ai",
        label: "SageSure AI",
        icon: "✦",
        description: "Ask, summarize, draft",
      },
    ],
  },
  {
    id: "claims-area",
    label: "Claims",
    icon: "⚡",
    color: "bg-[#167E9B]",
    roles: ["claims", "manager", "admin", "customer"],
    items: [
      {
        id: "claims",
        label: "Claims Chat",
        icon: "💬",
        description: "Claim guidance and lookup",
      },
      {
        id: "fnol",
        label: "FNOL Intake",
        icon: "📄",
        description: "First notice of loss",
        badge: "New",
      },
      {
        id: "lifecycle",
        label: "Claims Lifecycle",
        icon: "🔄",
        description: "Status, notes, payments",
      },
      {
        id: "claims-queue",
        label: "Claims Queue",
        icon: "▦",
        description: "Assigned and SLA-risk claims",
        hidden: true,
      },
    ],
  },
  {
    id: "underwriting-area",
    label: "Underwriting",
    icon: "📋",
    color: "bg-[#6876B5]",
    roles: ["underwriter", "manager", "admin", "producer"],
    items: [
      {
        id: "underwriting",
        label: "Risk Review",
        icon: "📋",
        description: "Analyze submissions",
      },
      {
        id: "uw-queue",
        label: "Submission Queue",
        icon: "▦",
        description: "Referrals and exceptions",
        hidden: true,
      },
      {
        id: "policy",
        label: "Policy Assistant",
        icon: "🏠",
        description: "Coverage and policy guidance",
      },
      {
        id: "research",
        label: "Research",
        icon: "🔬",
        description: "Market and risk research",
      },
    ],
  },
  {
    id: "consumer-area",
    label: "Consumer Relief",
    icon: "🛟",
    color: "bg-[#0EA487]",
    roles: ["claims", "manager", "admin", "producer", "customer"],
    items: [
      {
        id: "scamshield",
        label: "ScamShield",
        icon: "◈",
        description: "Fraud and phishing triage",
        hidden: true,
      },
      {
        id: "policy-pulse",
        label: "Policy Pulse",
        icon: "📑",
        description: "Coverage clarity and red flags",
        hidden: true,
      },
      {
        id: "claims-defender",
        label: "Claims Defender",
        icon: "⚖",
        description: "Denial review and complaint support",
        hidden: true,
      },
      {
        id: "document-vault",
        label: "Document Vault",
        icon: "🗂",
        description: "Evidence, policies, signatures",
        hidden: true,
      },
      {
        id: "renewals",
        label: "Renewals",
        icon: "🔁",
        description: "Renewal reminders and shopping support",
        hidden: true,
      },
      {
        id: "buying-assistance",
        label: "Buying Assist",
        icon: "🧭",
        description: "Guided insurance purchase help",
        hidden: true,
      },
    ],
  },
  {
    id: "specialty-area",
    label: "Specialty",
    icon: "🛡",
    color: "bg-[#6876B5]",
    roles: ["underwriter", "manager", "admin", "producer"],
    items: [
      {
        id: "marine",
        label: "Marine Insurance",
        icon: "⚓",
        description: "Marine cargo and hull",
      },
      {
        id: "cyber",
        label: "Cyber Insurance",
        icon: "🛡️",
        description: "Cyber risk and coverage",
      },
    ],
  },
  {
    id: "crm-area",
    label: "CRM",
    icon: "👥",
    color: "bg-[#0A91A6]",
    roles: ["producer", "manager", "admin", "customer"],
    items: [
      {
        id: "crm",
        label: "Customers",
        icon: "👥",
        description: "Insureds and contacts",
      },
      {
        id: "producer",
        label: "Producers",
        icon: "◎",
        description: "Agencies, producers, codes",
        hidden: true,
      },
      {
        id: "marketing",
        label: "Campaigns",
        icon: "📈",
        description: "Engagement analytics",
      },
    ],
  },
  {
    id: "admin-area",
    label: "Admin",
    icon: "⚙",
    color: "bg-slate-500",
    roles: ["admin"],
    items: [
      {
        id: "dashboard",
        label: "Admin Dashboard",
        icon: "📊",
        description: "Platform health and metrics",
      },
      {
        id: "governance",
        label: "Governance",
        icon: "🛡",
        description: "Tenant isolation, audit, approvals",
      },
      {
        id: "hr",
        label: "Users & Teams",
        icon: "🏢",
        description: "Roles, teams, permissions",
      },
      {
        id: "investment",
        label: "Analytics",
        icon: "💰",
        description: "Portfolio and performance",
      },
    ],
  },
];

const roleProfiles: Record<
  Role,
  { label: string; org: string; permissions: string[]; defaultArea: string }
> = {
  producer: {
    label: "Producer",
    org: "Agency Portal",
    permissions: ["Quotes", "Policies", "Customers", "Limited claims"],
    defaultArea: "crm-area",
  },
  underwriter: {
    label: "Underwriter",
    org: "Underwriting Workbench",
    permissions: ["Submissions", "Risk review", "Referrals", "Policy guidance"],
    defaultArea: "underwriting-area",
  },
  claims: {
    label: "Claims Adjuster",
    org: "Claims Workspace",
    permissions: ["Claims", "FNOL", "Documents", "Payments within authority"],
    defaultArea: "claims-area",
  },
  manager: {
    label: "Operations Manager",
    org: "SageSure Operations",
    permissions: ["Team queues", "Assignments", "Escalations", "Analytics"],
    defaultArea: "home",
  },
  admin: {
    label: "Administrator",
    org: "Platform Admin",
    permissions: ["All modules", "Users", "Roles", "Audit logs"],
    defaultArea: "home",
  },
  customer: {
    label: "Service User",
    org: "Customer Service",
    permissions: [
      "Policy lookup",
      "Claim status",
      "Document requests",
      "General support",
    ],
    defaultArea: "home",
  },
};

function getRole(): Role {
  if (typeof window === "undefined") return "customer";
  const stored = (
    sessionStorage.getItem("userRole") || "customer"
  ).toLowerCase();
  if (
    [
      "producer",
      "underwriter",
      "claims",
      "manager",
      "admin",
      "customer",
    ].includes(stored)
  ) {
    return stored as Role;
  }
  return stored === "adjuster" ? "claims" : "customer";
}

function canAccess(area: ProductArea, role: Role) {
  return !area.roles || area.roles.includes(role) || role === "admin";
}

const TabsInterface: React.FC<TabsInterfaceProps> = ({ signOut, user }) => {
  const role = getRole();
  const roleProfile = roleProfiles[role];
  const accessibleAreas = useMemo(
    () => productAreas.filter((area) => canAccess(area, role)),
    [role],
  );
  const [activeArea, setActiveArea] = useState(roleProfile.defaultArea);
  const [activeTab, setActiveTab] = useState("home");
  const [profileOpen, setProfileOpen] = useState(false);
  const { getRuntimeStatus } = useChatApi();
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatusData | null>(null);
  const [runtimeStatusError, setRuntimeStatusError] = useState<string | null>(null);

  const selectedArea =
    accessibleAreas.find((area) => area.id === activeArea) ||
    accessibleAreas[0];
  const activeLabel =
    selectedArea?.items.find((item) => item.id === activeTab)?.label ||
    "Overview";
  const displayName = user?.name || user?.username || user?.account?.name || "Unauthenticated";
  const initials = user
    ? displayName
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "--";

  const openArea = (area: ProductArea) => {
    const firstVisibleItem = area.items.find((item) => !item.hidden);
    setActiveArea(area.id);
    setActiveTab(firstVisibleItem?.id || "home");
  };

  useEffect(() => {
    let cancelled = false;
    const loadRuntimeStatus = async () => {
      try {
        const status = await getRuntimeStatus();
        if (!cancelled) {
          setRuntimeStatus(status);
          setRuntimeStatusError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setRuntimeStatus(null);
          setRuntimeStatusError(error instanceof Error ? error.message : "Runtime status unavailable");
        }
      }
    };
    loadRuntimeStatus();
    const interval = window.setInterval(loadRuntimeStatus, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [getRuntimeStatus]);

  useEffect(() => {
    publishWorkflowEvent({
      type: "navigation",
      title: activeLabel,
      summary: `User is viewing ${selectedArea?.label || "Home"} / ${activeLabel}`,
      source: "app-shell",
      workflow: selectedArea?.label || "Home",
      status: "info",
      payload: { activeArea, activeTab, role },
    });
  }, [activeArea, activeTab, activeLabel, role, selectedArea?.label]);

  const renderContent = () => {
    switch (activeTab) {
      case "home":
      case "tasks":
      case "ai":
      case "claims-queue":
      case "uw-queue":
      case "producer":
      case "scamshield":
      case "policy-pulse":
      case "claims-defender":
      case "document-vault":
      case "renewals":
      case "buying-assistance":
      case "governance":
        return (
          <SageSureDashboard
            user={user}
            role={role}
            activeView={activeTab}
            onNavigate={setActiveTab}
          />
        );
      case "claims":
        return <ChatApp initialSpecialist="claims" />;
      case "underwriting":
        return <UnderwritingWorkbench />;
      case "research":
        return <ResearchAssistant />;
      case "marine":
        return <ChatApp initialSpecialist="marine" />;
      case "cyber":
        return <CyberInsurance />;
      case "fnol":
        return <FNOLProcessor />;
      case "lifecycle":
        return <ClaimsLifecycle />;
      case "policy":
        return <PolicyAssistant />;
      case "dashboard":
        return <EnterpriseDashboard />;
      case "crm":
        return <BusinessAgentChat agentType="crm" />;
      case "hr":
        return <BusinessAgentChat agentType="hr" />;
      case "marketing":
        return <BusinessAgentChat agentType="marketing" />;
      case "investment":
        return <BusinessAgentChat agentType="investment" />;
      default:
        return (
          <SageSureDashboard
            user={user}
            role={role}
            activeView="home"
            onNavigate={setActiveTab}
          />
        );
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#f5f8fb] text-slate-900">
      <header className="flex h-16 shrink-0 items-center gap-4 bg-[#24384A] px-5 text-white shadow-sm">
        <div className="flex min-w-[250px] items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white p-1.5 shadow-sm">
            <img
              src="/brand/sagesure-mark.png"
              alt="SageSure"
              className="h-8 w-8 object-contain"
            />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              SageSure
            </div>
            <div className="text-[15px] font-bold tracking-tight text-white">
              Insurance Workspace
            </div>
          </div>
        </div>

        <div className="relative max-w-2xl flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            ⌕
          </span>
          <input
            className="h-9 w-full rounded-md border border-white/10 bg-white px-9 text-sm text-slate-900 outline-none ring-[#7DD3DB] transition placeholder:text-slate-500 focus:ring-2"
            placeholder="Search policies, claims, producers, agencies, or ask SageSure AI"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            ⌘K
          </span>
        </div>

        <button className="rounded-md bg-[#FF7A59] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#E66A4D]">
          Create
        </button>
        <button className="rounded-md px-2 py-2 text-sm text-slate-200 transition hover:bg-white/10">
          AI
        </button>
        <button className="rounded-md px-2 py-2 text-sm text-slate-200 transition hover:bg-white/10">
          Help
        </button>
        <button className="rounded-md px-2 py-2 text-sm text-slate-200 transition hover:bg-white/10">
          ⚙
        </button>
        <button className="rounded-md px-2 py-2 text-sm text-slate-200 transition hover:bg-white/10">
          🔔
        </button>

        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-white/10"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B8FA3] text-xs font-bold text-white">
              {initials}
            </span>
            <span className="hidden text-left text-xs leading-tight lg:block">
              <span className="block font-bold">{displayName}</span>
              <span className="block text-slate-300">{roleProfile.label}</span>
            </span>
            <span className="text-slate-300">⌄</span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0B8FA3] text-sm font-bold text-white">
                    {initials}
                  </span>
                  <div>
                    <div className="font-bold">{displayName}</div>
                    <div className="text-sm text-slate-500">
                      {roleProfile.org}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Access profile
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <div className="font-semibold text-slate-900">
                    {roleProfile.label}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {roleProfile.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded-full bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <button className="rounded-md border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50">
                    My permissions
                  </button>
                  <button className="rounded-md border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50">
                    Switch org
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-100 p-3">
                {signOut ? (
                  <button
                    onClick={signOut}
                    className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                ) : (
                  <EnterpriseUserProfile onSignOut={() => undefined} />
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <nav className="flex w-16 shrink-0 flex-col items-center gap-2 border-r border-slate-200 bg-white py-3">
          {accessibleAreas.map((area) => {
            const isActive = area.id === selectedArea?.id;
            return (
              <button
                key={area.id}
                onClick={() => openArea(area)}
                title={area.label}
                className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg transition ${
                  isActive
                    ? `${area.color} text-white shadow-sm`
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {area.icon}
              </button>
            );
          })}
        </nav>

        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Workspace
            </div>
            <div className="mt-1 text-lg font-bold text-slate-950">
              {selectedArea?.label}
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {selectedArea?.items.filter((item) => !item.hidden).map((item) => {
              const isActive = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`mb-1 flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                    isActive
                      ? "bg-[#EAF7F8] text-[#007A8A]"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="mt-0.5 text-base">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-bold">
                      {item.label}
                      {item.badge && (
                        <span className="rounded-full bg-[#EAF7F8] px-2 py-0.5 text-[10px] font-bold text-[#007A8A]">
                          {item.badge}
                        </span>
                      )}
                    </span>
                    {item.description && (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {item.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-slate-100 p-3">
            <div className={`rounded-lg p-3 text-xs ${runtimeStatus?.connected ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
              <div className="flex items-center gap-2 font-bold">
                <span className={`h-2 w-2 rounded-full ${runtimeStatus?.connected ? "bg-emerald-500" : "bg-amber-500"}`} /> Runtime status
              </div>
              <div className="mt-1">
                {runtimeStatusError
                  ? "Auth required or runtime not connected."
                  : runtimeStatus
                    ? `${runtimeStatus.activeRuntimes}/${Math.max(runtimeStatus.totalRuntimes, 1)} broker runtimes ready · ${runtimeStatus.tools.length} tools · ${runtimeStatus.skills.length} skills`
                    : "Loading authenticated runtime status…"}
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-500">
                {selectedArea?.label}
              </span>
              <span className="text-slate-300">/</span>
              <span className="font-bold text-slate-950">{activeLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 px-2 py-1 font-semibold">
                Role: {roleProfile.label}
              </span>
              <span className="rounded-full border border-slate-200 px-2 py-1 font-semibold">
                Secure · Audited
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </main>
      </div>

      <PersistentChatCompanion
        activeArea={selectedArea?.label || "Home"}
        activeTab={activeTab}
        activeLabel={activeLabel}
        role={roleProfile.label}
        user={user}
      />
    </div>
  );
};

export default TabsInterface;
