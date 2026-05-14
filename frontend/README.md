# SageSure / SageInsure Frontend

This is the active frontend for the SageInfra greenfield rebuild in:

```text
/Volumes/Macintosh HD Ext/azuredev-8b4a-rust-cargo-codex/frontend
```

The app is a Next.js 14 / React 18 / TypeScript workspace for SageSure/SageInsure operations. It is being productized from the previous insurance demo frontend into a responsive operations workspace for claims, FNOL intake, underwriting, policy assistance, marine/cyber/specialty workflows, and AI-assisted insurance operations.

## Current product direction

The frontend should present SageSure/SageInsure language and workflows, not AWS sample/demo framing.

Primary modules include:

- Operations overview and task queues.
- Claims workspace and claim lifecycle support.
- FNOL intake and evidence review.
- Underwriting risk review and submission queue support.
- Policy assistance and coverage guidance.
- Specialty insurance workflows such as marine and cyber.
- Persistent SageSure AI chat companion with context-aware routing.

## Private backend bridge

Backend access for the greenfield AgentCore stays private. Do not add public ingress for local testing.

Start the local bridge before chat/API smoke tests:

```bash
kubectl -n sageinfra-new-agents port-forward svc/sageinfra-agentcore 8000:80
```

Expected health check:

```bash
curl -s http://127.0.0.1:8000/healthz
```

The frontend API route `/api/azure-chat` expects payloads using `text`, `conversationId`, and optional `context`.

Example smoke payload:

```bash
curl -s http://127.0.0.1:3000/api/azure-chat \
  -H 'content-type: application/json' \
  -d '{"text":"Summarize claim next steps.","conversationId":"openclaw-smoke","context":{"source":"frontend-readme"}}'
```

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Reference sources

Use these only as references unless the user explicitly authorizes edits there:

- `/Volumes/Macintosh HD Ext/azuredev-8b4a` for original AzureDev frontend/assets and historical behavior.
- `/Volumes/Macintosh HD Ext/uw-workbench-rust-cargo-codex` for separate UW Workbench migration direction.
- `/Volumes/Macintosh HD Ext/sagesure-cotent-processor-fnol` for live FNOL/SageInsure/UW/OpenClaw workspace patterns.
- `/Volumes/Macintosh HD Ext/sagesure-india` for India product/domain language such as Policy Pulse, ScamShield, and Claims Defender.
- `/Volumes/Macintosh HD Ext/claw-code` for common assistant-building support when useful.

Do not mutate live ClaudeCode-owned reference workspaces from this frontend workstream.

## Cleanup targets

Remaining AWS-era/demo terminology should be removed or hidden from user-facing surfaces unless intentionally retained as migration documentation.

Terms to watch for:

- S3
- Textract
- Bedrock
- DynamoDB
- Step Functions
- Cognito
- Amplify
- CloudFront
- DocStream Architecture
- Demo/sample workshop language

Replace with SageSure/SageInsure operations language and greenfield Azure/private AgentCore behavior.

## Branding

Use the copied SageSure/SageInsure assets under `public/brand/` and the favicon files under `public/`.

Do not regenerate logo/favicon assets unless the user explicitly asks.

## Validation before handoff

For frontend changes, run:

```bash
npm run build
```

If chat/API behavior changed, also verify:

1. AgentCore port-forward is running.
2. `http://127.0.0.1:8000/healthz` returns healthy JSON.
3. `http://127.0.0.1:3000/` returns HTTP 200.
4. `/api/azure-chat` returns `status: "success"` with a valid `conversationId`.
