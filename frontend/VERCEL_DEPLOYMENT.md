# Frontend Deployment Notes

This file is retained as a deployment checklist, but the active greenfield target is the private SageSure/SageInsure dev01 stack, not the older public demo stack.

## Active environment model

Use SageSure/SageInsure product language and private workflow endpoints:

```bash
NEXT_PUBLIC_FASTAPI_ENDPOINT=http://127.0.0.1:8000
AGENTCORE_BASE_URL=http://127.0.0.1:8000
AGENTCORE_CHAT_TIMEOUT_MS=45000
AGENTCORE_DOCUMENT_TIMEOUT_MS=45000
```

For local dev01 smoke testing, keep the backend private and bridge it locally:

```bash
kubectl -n sageinfra-new-agents port-forward svc/sageinfra-agentcore 8000:80
```

## Build

```bash
npm install
npm run build
```

## Smoke checks

```bash
curl http://127.0.0.1:3000/
curl http://127.0.0.1:8000/healthz
```

## Product posture

The frontend should present:

- SageSure/SageInsure workflows
- claims, FNOL, underwriting, CRM, policy, cyber, consumer relief, and governance modules
- tenant isolation and audit controls
- human approval gates before regulated or external actions

Avoid exposing backend runtime implementation details to insurance buyers by default. Open backend/admin internals only for operator, debug, or compliance evidence workflows.

## Legacy note

Older public-demo deployment variables and provider-specific examples have been superseded by the greenfield private dev01 architecture. Do not reintroduce legacy cloud-demo framing unless it is explicitly marked as migration reference material.
