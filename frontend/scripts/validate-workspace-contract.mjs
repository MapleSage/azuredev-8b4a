const requiredModules = [
  "operations",
  "claimsChat",
  "fnolIntake",
  "underwritingWorkbench",
  "policyPulse",
  "crmAgent",
  "claimsLifecycle",
  "consumerPolicy",
  "aiCompanion",
];

const baseUrl = process.env.WORKSPACE_CONTRACT_BASE_URL || "http://127.0.0.1:3000";
const token = process.env.WORKSPACE_CONTRACT_BEARER_TOKEN;

if (!token) {
  console.log("SKIP: set WORKSPACE_CONTRACT_BEARER_TOKEN to validate authenticated workspace contract endpoints.");
  process.exit(0);
}

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/workspace/modules`, {
  headers: { Authorization: `Bearer ${token}` },
});

if (!response.ok) {
  throw new Error(`/api/workspace/modules returned ${response.status}: ${await response.text()}`);
}

const data = await response.json();
for (const key of ["source", "updatedAt", "router", "modules"]) {
  if (!(key in data)) throw new Error(`Missing top-level key: ${key}`);
}

for (const moduleId of requiredModules) {
  const module = data.modules[moduleId];
  if (!module) throw new Error(`Missing module contract: ${moduleId}`);
  for (const key of ["title", "connection", "summary", "records", "actions"]) {
    if (!(key in module)) throw new Error(`Module ${moduleId} missing key: ${key}`);
  }
  if (!Array.isArray(module.records)) throw new Error(`Module ${moduleId} records must be an array`);
  if (!Array.isArray(module.actions)) throw new Error(`Module ${moduleId} actions must be an array`);
  if (typeof module.connection.connected !== "boolean") {
    throw new Error(`Module ${moduleId} connection.connected must be boolean`);
  }
}

console.log(`OK: ${requiredModules.length} workspace module contracts validated from ${baseUrl}`);
