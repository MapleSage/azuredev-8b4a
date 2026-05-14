import SessionManager from "./sessionManager";

export type WorkflowEventStatus =
  | "started"
  | "processing"
  | "completed"
  | "failed"
  | "info";

export interface WorkflowEvent {
  id: string;
  type: string;
  title: string;
  summary: string;
  source: string;
  workflow: string;
  status: WorkflowEventStatus;
  entityId?: string;
  payload?: Record<string, any>;
  timestamp: string;
}

const MAX_WORKFLOW_EVENTS = 100;

function getSession() {
  return SessionManager.getInstance().getCurrentSession() as any;
}

export function getWorkflowEvents(limit = 20): WorkflowEvent[] {
  const session = getSession();
  const events = session.persistentMemory?.workflowEvents || [];
  return events.slice(-limit);
}

export function publishWorkflowEvent(
  event: Omit<WorkflowEvent, "id" | "timestamp" | "status"> & {
    status?: WorkflowEventStatus;
  }
): WorkflowEvent {
  const sessionManager = SessionManager.getInstance();
  const session = sessionManager.getCurrentSession() as any;
  const fullEvent: WorkflowEvent = {
    ...event,
    status: event.status || "info",
    id: `wf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  session.persistentMemory = {
    ...(session.persistentMemory || {}),
    workflowEvents: [
      ...((session.persistentMemory && session.persistentMemory.workflowEvents) || []),
      fullEvent,
    ].slice(-MAX_WORKFLOW_EVENTS),
  };

  session.lastActivity = fullEvent.timestamp;
  sessionManager.saveSession();

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("sagesure:workflow-event", { detail: fullEvent })
    );
  }

  return fullEvent;
}

export function summarizeWorkflowEvents(limit = 8): string {
  const events = getWorkflowEvents(limit);
  if (events.length === 0) return "No structured workflow events have been recorded yet.";

  return events
    .map((event) => {
      const entity = event.entityId ? ` entity=${event.entityId}` : "";
      return `[${event.status}] ${event.workflow}/${event.source}: ${event.title}${entity} — ${event.summary}`;
    })
    .join("\n");
}
