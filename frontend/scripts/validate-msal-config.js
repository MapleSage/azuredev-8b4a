#!/usr/bin/env node

/**
 * MSAL Configuration Validation Script
 * This script validates the MSAL configuration and environment variables
 */

const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

const log = (color, message) =>
  console.log(`${colors[color]}${message}${colors.reset}`);

function validateEnvironmentVariables() {
  log("blue", "🔍 Validating Environment Variables...");

  const requiredVars = [
    "NEXT_PUBLIC_AZURE_CLIENT_ID",
    "NEXT_PUBLIC_AZURE_TENANT_ID",
    "NEXT_PUBLIC_REDIRECT_URI",
    "NEXT_PUBLIC_API_URL",
  ];

  const optionalVars = [
    "NEXT_PUBLIC_DEVELOPMENT_MODE",
    "NEXT_PUBLIC_REDIRECT_URI_STAGING",
    "NEXT_PUBLIC_REDIRECT_URI_PROD",
  ];

  let allValid = true;

  // Check required variables
  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      log(
        "green",
        `✅ ${varName}: ${value.length > 30 ? value.substring(0, 30) + "..." : value}`
      );
    } else {
      log("red", `❌ ${varName}: Not set (REQUIRED)`);
      allValid = false;
    }
  });

  // Check optional variables
  optionalVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      log(
        "green",
        `ℹ️ ${varName}: ${value.length > 30 ? value.substring(0, 30) + "..." : value}`
      );
    } else {
      log("yellow", `⚠️ ${varName}: Not set (optional)`);
    }
  });

  return allValid;
}

function validateGuidFormat(guid, name) {
  const guidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (guidRegex.test(guid)) {
    log("green", `✅ ${name}: Valid GUID format`);
    return true;
  } else {
    log("red", `❌ ${name}: Invalid GUID format`);
    return false;
  }
}

function validateUrlFormat(url, name) {
  try {
    new URL(url);
    log("green", `✅ ${name}: Valid URL format`);
    return true;
  } catch {
    log("red", `❌ ${name}: Invalid URL format`);
    return false;
  }
}

function validateConfiguration() {
  log("blue", "\n🔧 Validating Configuration Formats...");

  let allValid = true;

  const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
  const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (clientId) {
    allValid = validateGuidFormat(clientId, "Client ID") && allValid;
  }

  if (tenantId) {
    allValid = validateGuidFormat(tenantId, "Tenant ID") && allValid;
  }

  if (redirectUri) {
    allValid = validateUrlFormat(redirectUri, "Redirect URI") && allValid;
  }

  if (apiUrl) {
    allValid = validateUrlFormat(apiUrl, "API URL") && allValid;
  }

  return allValid;
}

function validateFileStructure() {
  log("blue", "\n📁 Validating File Structure...");

  const requiredFiles = [
    "../lib/msal-config.ts",
    "../lib/types/auth.ts",
    "../lib/utils/auth-utils.ts",
    "../lib/config/environments.ts",
  ];

  let allExist = true;

  requiredFiles.forEach((filePath) => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      log("green", `✅ ${filePath}: Exists`);
    } else {
      log("red", `❌ ${filePath}: Missing`);
      allExist = false;
    }
  });

  return allExist;
}

function validatePackageJson() {
  log("blue", "\n📦 Validating Package Dependencies...");

  const packageJsonPath = path.join(__dirname, "../package.json");

  if (!fs.existsSync(packageJsonPath)) {
    log("red", "❌ package.json not found");
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const requiredPackages = [
    "@azure/msal-browser",
    "@azure/msal-react",
    "axios",
  ];

  let allInstalled = true;

  requiredPackages.forEach((pkg) => {
    if (dependencies[pkg]) {
      log("green", `✅ ${pkg}: ${dependencies[pkg]}`);
    } else {
      log("red", `❌ ${pkg}: Not installed`);
      allInstalled = false;
    }
  });

  return allInstalled;
}

function generateConfigSummary() {
  log("blue", "\n📋 Configuration Summary...");

  const config = {
    environment: process.env.NODE_ENV || "development",
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID,
    tenantId: process.env.NEXT_PUBLIC_AZURE_TENANT_ID,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
  };

  Object.entries(config).forEach(([key, value]) => {
    if (value) {
      const displayValue =
        value.length > 50 ? value.substring(0, 50) + "..." : value;
      log("blue", `  ${key}: ${displayValue}`);
    }
  });
}

function main() {
  console.log("🚀 MSAL Configuration Validation");
  console.log("=".repeat(50));

  const envValid = validateEnvironmentVariables();
  const configValid = validateConfiguration();
  const filesExist = validateFileStructure();
  const packagesInstalled = validatePackageJson();

  generateConfigSummary();

  const allValid = envValid && configValid && filesExist && packagesInstalled;

  console.log("\n" + "=".repeat(50));

  if (allValid) {
    log("green", "🎉 All validations passed! MSAL configuration is ready.");
    log(
      "green",
      "✅ You can proceed with implementing the authentication context."
    );
  } else {
    log("red", "❌ Some validations failed. Please fix the issues above.");
    log("yellow", "💡 Check the documentation for setup instructions.");
  }

  console.log("\n📝 Next Steps:");
  console.log("1. Implement authentication context (Task 3.2)");
  console.log("2. Create authenticated API client (Task 3.3)");
  console.log("3. Update app components (Task 4)");

  process.exit(allValid ? 0 : 1);
}

if (require.main === module) {
  main();
}
