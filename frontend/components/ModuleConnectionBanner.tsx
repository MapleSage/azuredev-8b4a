import React from "react";
import type { WorkspaceModuleContract } from "../lib/api-client";

type ModuleConnectionBannerProps = {
  contract?: WorkspaceModuleContract | null;
  error?: string | null;
  compact?: boolean;
};

export default function ModuleConnectionBanner({
  contract,
  error,
  compact = false,
}: ModuleConnectionBannerProps) {
  if (error) {
    const authRequired = /auth|token|sign in|401/i.test(error);
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
        <div className="font-bold">
          {authRequired ? "Authentication required" : "Live module contract unavailable"}
        </div>
        <div className="mt-1">
          {authRequired
            ? "Sign in with Entra ID to load this workspace module and prevent unauthenticated runtime calls."
            : error}
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Loading module contract…
      </div>
    );
  }

  const connected = contract.connection?.connected;
  const endpointConfigured = contract.connection?.endpointConfigured;
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
        connected
          ? "border-emerald-100 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold">
          {connected ? "API-backed locally" : "Not connected"}: {contract.title}
        </div>
        <span className="rounded-full bg-white/70 px-2 py-1 text-[11px] font-bold uppercase tracking-wide">
          {endpointConfigured ? "endpoint configured" : contract.connection?.status || "runtime fallback"}
        </span>
      </div>
      {!compact && (
        <div className="mt-1 leading-6">
          {contract.summary?.headline ||
            (connected
              ? "This module is wired to the local dev.sagesure.io contract layer."
              : "A live endpoint is not configured; UI actions are disabled rather than pretending to be live.")}
        </div>
      )}
    </div>
  );
}
