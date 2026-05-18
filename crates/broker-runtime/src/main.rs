use std::collections::{BTreeMap, BTreeSet};
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use axum::extract::{Path as AxumPath, State};
use axum::http::{HeaderMap, StatusCode};
use axum::routing::{get, patch, post};
use axum::{Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tower_http::trace::TraceLayer;
use tracing::{info, warn};
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    broker_id: String,
    workspace: PathBuf,
    kb: BrokerKnowledgeBase,
    tools: BTreeSet<String>,
    skills: BTreeSet<String>,
    lifecycle: Arc<Mutex<BTreeMap<String, LifecycleRecord>>>,
    last_activity: Arc<Mutex<DateTime<Utc>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct BrokerKnowledgeBase {
    version: Option<String>,
    #[serde(default)]
    refs: Vec<KnowledgeRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct KnowledgeRef {
    #[serde(rename = "type")]
    ref_type: String,
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatRequest {
    message: String,
    conversation_id: Option<String>,
    broker_id: String,
    tool: Option<String>,
    skill: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ChatResponse {
    conversation_id: String,
    broker_id: String,
    answer: String,
    loaded_tools: Vec<String>,
    loaded_skills: Vec<String>,
    kb_version: Option<String>,
    handled_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LifecycleEvent {
    event: LifecycleEventKind,
    posp_id: String,
    tenant_id: String,
    broker_name: String,
    #[serde(default)]
    config: LifecycleConfig,
    idempotency_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum LifecycleEventKind {
    Signup,
    Update,
    Suspend,
    Resume,
    Offboard,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LifecycleConfig {
    #[serde(default)]
    tools: Vec<String>,
    #[serde(default)]
    skills: Vec<String>,
    #[serde(default)]
    kb_refs: Vec<KnowledgeRef>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LifecycleRecord {
    timestamp: DateTime<Utc>,
    posp_id: String,
    event: LifecycleEventKind,
    tenant_id: String,
    broker_name: String,
    idempotency_key: String,
    outcome: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BrokerStatus {
    broker_id: String,
    broker_namespace: String,
    runtime_class_name: String,
    phase: String,
    last_activity_time: DateTime<Utc>,
    workspace_path: String,
    kb_version: Option<String>,
    tools: Vec<String>,
    skills: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BrokerIdentity {
    user_id: String,
    brokers: Vec<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .json()
        .init();
    let broker_id = std::env::var("BROKER_ID").unwrap_or_else(|_| "test-123".to_string());
    let workspace = PathBuf::from(
        std::env::var("BROKER_WORKSPACE").unwrap_or_else(|_| "/workspace".to_string()),
    );
    let config_dir =
        PathBuf::from(std::env::var("BROKER_CONFIG_DIR").unwrap_or_else(|_| "/config".to_string()));
    let state = AppState {
        broker_id,
        workspace,
        kb: load_yaml(&config_dir.join("kb.yaml")).unwrap_or_default(),
        tools: load_string_set(&config_dir.join("tools.yaml")),
        skills: load_string_set(&config_dir.join("skills.yaml")),
        lifecycle: Arc::new(Mutex::new(BTreeMap::new())),
        last_activity: Arc::new(Mutex::new(Utc::now())),
    };
    let app = Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .route("/chat", post(chat))
        .route("/platform/brokers", get(platform_brokers))
        .route("/me/brokers", get(me_brokers))
        .route("/posp/signup", post(lifecycle_event))
        .route(
            "/posp/:posp_id",
            patch(lifecycle_event_for_posp).delete(delete_posp),
        )
        .route("/posp/:posp_id/suspend", post(lifecycle_event_for_posp))
        .route("/posp/:posp_id/resume", post(lifecycle_event_for_posp))
        .layer(TraceLayer::new_for_http())
        .with_state(state);
    let addr: SocketAddr = std::env::var("BROKER_RUNTIME_BIND")
        .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
        .parse()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!(%addr, "broker runtime listening");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn healthz() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "status": "ok", "time": Utc::now() }))
}

async fn readyz(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    if state.broker_id.trim().is_empty() {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "broker runtime is not configured".to_string(),
        ));
    }
    if state
        .kb
        .version
        .as_deref()
        .unwrap_or_default()
        .trim()
        .is_empty()
    {
        return Err((
            StatusCode::SERVICE_UNAVAILABLE,
            "knowledge base manifest is not loaded".to_string(),
        ));
    }
    Ok(Json(serde_json::json!({
        "status": "ready",
        "brokerId": state.broker_id,
        "kbVersion": state.kb.version,
        "time": Utc::now()
    })))
}

async fn chat(
    State(state): State<AppState>,
    Json(req): Json<ChatRequest>,
) -> Result<Json<ChatResponse>, (StatusCode, String)> {
    if req.broker_id != state.broker_id {
        return Err((
            StatusCode::FORBIDDEN,
            "brokerId is not authorized for this runtime".to_string(),
        ));
    }
    if let Some(tool) = &req.tool {
        require_allowed("tool", tool, &state.tools)?;
    }
    if let Some(skill) = &req.skill {
        require_allowed("skill", skill, &state.skills)?;
    }
    *state.last_activity.lock().expect("last activity lock") = Utc::now();
    let conversation_id = req
        .conversation_id
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    persist_conversation(
        &state.workspace,
        &state.broker_id,
        &conversation_id,
        &req.message,
    )
    .await
    .map_err(|err| (StatusCode::INTERNAL_SERVER_ERROR, err.to_string()))?;
    Ok(Json(ChatResponse {
        conversation_id,
        broker_id: state.broker_id.clone(),
        answer: "Broker runtime accepted the request. Connect specialist tool execution behind this contract.".to_string(),
        loaded_tools: state.tools.iter().cloned().collect(),
        loaded_skills: state.skills.iter().cloned().collect(),
        kb_version: state.kb.version.clone(),
        handled_at: Utc::now(),
    }))
}

async fn platform_brokers(State(state): State<AppState>) -> Json<Vec<BrokerStatus>> {
    let last_activity_time = *state.last_activity.lock().expect("last activity lock");
    Json(vec![BrokerStatus {
        broker_id: state.broker_id.clone(),
        broker_namespace: format!("broker-{}", state.broker_id),
        runtime_class_name: "kata-vm-isolation".to_string(),
        phase: "Ready".to_string(),
        last_activity_time,
        workspace_path: state.workspace.join(&state.broker_id).display().to_string(),
        kb_version: state.kb.version.clone(),
        tools: state.tools.iter().cloned().collect(),
        skills: state.skills.iter().cloned().collect(),
    }])
}

async fn me_brokers(
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<Json<BrokerIdentity>, (StatusCode, String)> {
    let Some(auth) = headers.get("authorization").and_then(|v| v.to_str().ok()) else {
        return Err((StatusCode::UNAUTHORIZED, "missing bearer token".to_string()));
    };
    let user_id = auth
        .strip_prefix("Bearer ")
        .unwrap_or(auth)
        .chars()
        .take(12)
        .collect::<String>();
    Ok(Json(BrokerIdentity {
        user_id,
        brokers: vec![state.broker_id],
    }))
}

async fn lifecycle_event(
    State(state): State<AppState>,
    Json(event): Json<LifecycleEvent>,
) -> Json<LifecycleRecord> {
    Json(record_lifecycle(&state, event))
}

async fn lifecycle_event_for_posp(
    AxumPath(posp_id): AxumPath<String>,
    State(state): State<AppState>,
    Json(mut event): Json<LifecycleEvent>,
) -> Result<Json<LifecycleRecord>, (StatusCode, String)> {
    if event.posp_id != posp_id {
        return Err((
            StatusCode::BAD_REQUEST,
            "path posp_id does not match payload pospId".to_string(),
        ));
    }
    if event.idempotency_key.is_empty() {
        event.idempotency_key = Uuid::new_v4().to_string();
    }
    Ok(Json(record_lifecycle(&state, event)))
}

async fn delete_posp(
    AxumPath(posp_id): AxumPath<String>,
    State(state): State<AppState>,
) -> Json<LifecycleRecord> {
    Json(record_lifecycle(
        &state,
        LifecycleEvent {
            event: LifecycleEventKind::Offboard,
            posp_id,
            tenant_id: "unknown".to_string(),
            broker_name: "unknown".to_string(),
            config: LifecycleConfig::default(),
            idempotency_key: Uuid::new_v4().to_string(),
        },
    ))
}

fn record_lifecycle(state: &AppState, event: LifecycleEvent) -> LifecycleRecord {
    let mut records = state.lifecycle.lock().expect("lifecycle lock");
    if let Some(existing) = records.get(&event.idempotency_key) {
        return existing.clone();
    }
    let record = LifecycleRecord {
        timestamp: Utc::now(),
        posp_id: event.posp_id,
        event: event.event,
        tenant_id: event.tenant_id,
        broker_name: event.broker_name,
        idempotency_key: event.idempotency_key.clone(),
        outcome: "accepted".to_string(),
    };
    info!(audit = ?record, "broker lifecycle event");
    records.insert(event.idempotency_key, record.clone());
    record
}

fn require_allowed(
    kind: &str,
    value: &str,
    allowed: &BTreeSet<String>,
) -> Result<(), (StatusCode, String)> {
    if allowed.contains(value) {
        Ok(())
    } else {
        Err((
            StatusCode::FORBIDDEN,
            format!("{kind} '{value}' is not allowed by broker manifest"),
        ))
    }
}

async fn persist_conversation(
    workspace: &Path,
    broker_id: &str,
    conversation_id: &str,
    message: &str,
) -> anyhow::Result<()> {
    let dir = workspace.join(broker_id).join("conversations");
    tokio::fs::create_dir_all(&dir).await?;
    let line =
        serde_json::json!({ "timestamp": Utc::now(), "message": message }).to_string() + "\n";
    let path = dir.join(format!("{conversation_id}.jsonl"));
    let mut existing = tokio::fs::read_to_string(&path).await.unwrap_or_default();
    existing.push_str(&line);
    tokio::fs::write(path, existing).await?;
    Ok(())
}

fn load_yaml<T: for<'de> Deserialize<'de>>(path: &Path) -> anyhow::Result<T> {
    let raw = std::fs::read_to_string(path)?;
    Ok(serde_yaml::from_str(&raw)?)
}

fn load_string_set(path: &Path) -> BTreeSet<String> {
    match load_yaml::<Vec<String>>(path) {
        Ok(values) => values.into_iter().collect(),
        Err(err) => {
            warn!(path = %path.display(), %err, "manifest not loaded; using empty allowlist");
            BTreeSet::new()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_state() -> AppState {
        AppState {
            broker_id: "posp-123".to_string(),
            workspace: PathBuf::from("/tmp/broker-runtime-test"),
            kb: BrokerKnowledgeBase {
                version: Some("test-kb".to_string()),
                refs: vec![],
            },
            tools: BTreeSet::from(["claims".to_string()]),
            skills: BTreeSet::from(["fnol".to_string()]),
            lifecycle: Arc::new(Mutex::new(BTreeMap::new())),
            last_activity: Arc::new(Mutex::new(Utc::now())),
        }
    }

    #[test]
    fn require_allowed_rejects_unlisted_tool() {
        let allowed = BTreeSet::from(["claims".to_string()]);
        assert!(require_allowed("tool", "claims", &allowed).is_ok());
        let err =
            require_allowed("tool", "payments", &allowed).expect_err("unknown tool must fail");
        assert_eq!(err.0, StatusCode::FORBIDDEN);
    }

    #[test]
    fn record_lifecycle_is_idempotent_by_key() {
        let state = test_state();
        let first = record_lifecycle(
            &state,
            LifecycleEvent {
                event: LifecycleEventKind::Signup,
                posp_id: "posp-123".to_string(),
                tenant_id: "tenant-a".to_string(),
                broker_name: "Broker A".to_string(),
                config: LifecycleConfig::default(),
                idempotency_key: "same-key".to_string(),
            },
        );
        let second = record_lifecycle(
            &state,
            LifecycleEvent {
                event: LifecycleEventKind::Suspend,
                posp_id: "posp-999".to_string(),
                tenant_id: "tenant-b".to_string(),
                broker_name: "Broker B".to_string(),
                config: LifecycleConfig::default(),
                idempotency_key: "same-key".to_string(),
            },
        );
        assert_eq!(first.posp_id, second.posp_id);
        assert_eq!(first.idempotency_key, second.idempotency_key);
        assert!(matches!(second.event, LifecycleEventKind::Signup));
    }
}
