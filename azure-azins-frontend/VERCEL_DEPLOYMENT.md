# Vercel Deployment Guide for SageInsure Frontend

## Required Environment Variables

Set these in your Vercel dashboard under Project Settings > Environment Variables:

### AWS Configuration
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

### Azure OpenAI (Optional)
```
AZURE_OPENAI_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-01
AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net
AZURE_SEARCH_KEY=your_search_key
AZURE_SEARCH_INDEX_NAME=insurance-index
```

### Strands Agent
```
STRANDS_AGENT_ENDPOINT=https://your-api-gateway-url.amazonaws.com/prod
```

### Cognito (Already in .env.production)
```
NEXT_PUBLIC_USER_POOL_ID=us-east-1_eFC9Xu9Mq
NEXT_PUBLIC_USER_POOL_CLIENT_ID=4n3ufqhb1uevi6vjq6vddmtvb2
NEXT_PUBLIC_COGNITO_DOMAIN=auth2.maplesage.com
NEXT_PUBLIC_IDENTITY_POOL_ID=us-east-1:6c4616b2-566c-4afb-9f88-66566ea41474
NEXT_PUBLIC_REDIRECT_SIGN_IN=https://insure.maplesage.com/auth/callback
NEXT_PUBLIC_REDIRECT_SIGN_OUT=https://insure.maplesage.com/sign-out
```

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Fix Vercel deployment issues"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repo to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy

3. **Test Deployment**
   - Visit `/api/health` to check environment variables
   - Test chat functionality

## API Endpoints

- `/api/health` - Health check and environment status
- `/api/sageinsure` - Main SageInsure AI endpoint
- `/api/bedrock-agent` - Bedrock agent with Strands fallback
- `/api/azure-chat` - Azure OpenAI chat (optional)
- `/api/strands-lambda` - Direct Strands agent access

## Troubleshooting

### Current Status:
✅ **Fixed Issues:**
- Added proper error handling and logging
- Implemented fallback responses for AWS service failures
- Added timeout protection for all API calls
- Created health check and test endpoints

### Debug Endpoints:
- `/api/health` - Environment variables and service status
- `/api/test` - Basic API functionality test
- `/api/fallback` - Static insurance responses

### Common Issues:
1. **500 Errors**: Check Vercel function logs for specific error details
2. **AWS SDK Errors**: Ensure AWS credentials are set in Vercel dashboard
3. **Timeout Errors**: APIs have 30s timeout limit, with internal timeouts of 8-15s
4. **Environment Variables**: Use `/api/health` to verify configuration

### Debug Steps:
1. Test `/api/test` with a simple query first
2. Check `/api/health` for environment status
3. Review Vercel function logs for detailed errors
4. Verify AWS credentials in Vercel dashboard
5. Test fallback responses work independently

### Fallback System:
If AWS services fail, the API will automatically provide static insurance responses for common queries like "file a claim", "policy", "coverage", etc.

## Performance Optimizations

- APIs have timeout protection (8-15s)
- Fallback mechanisms for failed services
- Proper error handling and logging
- Minimal response payloads