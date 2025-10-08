// Script to fetch secrets from AWS Secrets Manager during build
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const fs = require('fs');

const secretsManager = new SecretsManagerClient({
  region: 'us-east-1'
});

async function getSecrets() {
  // Skip secrets loading in production/Vercel environment
  if (process.env.VERCEL || process.env.NODE_ENV === 'production' || process.env.SKIP_SECRETS) {
    console.log('⚠️ Skipping secrets loading in production - using environment variables');
    return;
  }
  
  try {
    const command = new GetSecretValueCommand({
      SecretId: 'SageInsureSec'
    });
    const result = await secretsManager.send(command);
    
    const secrets = JSON.parse(result.SecretString);
    
    // Write to .env.local for Next.js
    const envContent = `
NEXT_PUBLIC_USER_POOL_ID=${secrets.NEXT_PUBLIC_USER_POOL_ID || secrets.userPoolId || 'us-east-1_eFC9Xu9Mq'}
NEXT_PUBLIC_USER_POOL_CLIENT_ID=${secrets.NEXT_PUBLIC_USER_POOL_CLIENT_ID || secrets.clientId || '4n3ufqhb1uevi6vjq6vddmtvb2'}
NEXT_PUBLIC_COGNITO_DOMAIN=${secrets.NEXT_PUBLIC_COGNITO_DOMAIN || secrets.domain || 'auth2.maplesage.com'}
NEXT_PUBLIC_IDENTITY_POOL_ID=${secrets.NEXT_PUBLIC_IDENTITY_POOL_ID || secrets.identityPoolId || 'us-east-1:6c4616b2-566c-4afb-9f88-66566ea41474'}
NEXT_PUBLIC_REDIRECT_SIGN_IN=${secrets.NEXT_PUBLIC_REDIRECT_SIGN_IN || secrets.redirectSignIn || 'https://insure.maplesage.com/auth/callback,http://localhost:3000/auth/callback'}
NEXT_PUBLIC_REDIRECT_SIGN_OUT=${secrets.NEXT_PUBLIC_REDIRECT_SIGN_OUT || secrets.redirectSignOut || 'https://insure.maplesage.com/sign-out,http://localhost:3000/sign-out'}
`;
    
    fs.writeFileSync('.env.local', envContent);
    console.log('✅ Secrets loaded from AWS Secrets Manager');
    
  } catch (error) {
    console.log('⚠️ Using fallback configuration:', error.message);
    console.log('Make sure to set environment variables in Vercel dashboard');
    // Fallback to hardcoded values if secrets not available
  }
}

getSecrets();