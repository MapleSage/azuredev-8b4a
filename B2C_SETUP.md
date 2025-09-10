# Azure AD B2C Setup Guide

## 1. Create Azure AD B2C Tenant

1. Go to Azure Portal → Create a resource → Search "Azure Active Directory B2C"
2. Create new B2C tenant with name: `sageinsure`
3. Note the tenant domain: `sageinsure.onmicrosoft.com`

## 2. Configure Existing Application

Using existing `SageInsure` application (ID: `65ee45ec-2acb-4fd8-98fd-e96aa2fe8e5c`):

1. Go to App registrations → SageInsure
2. Authentication → Add redirect URI: `http://localhost:3000/chat`
3. Platform configurations → Single-page application
4. Implicit grant: Enable ID tokens

## 3. Create User Flows

### Sign-up and Sign-in Flow
1. B2C → User flows → New user flow
2. Select "Sign up and sign in" → Recommended
3. Name: `B2C_1_signupsignin`
4. Identity providers: Email signup
5. User attributes: Given Name, Surname, Email Address
6. Application claims: Given Name, Surname, Email Addresses

### Password Reset Flow
1. New user flow → "Password reset" → Recommended  
2. Name: `B2C_1_passwordreset`
3. Identity providers: Reset password using email address
4. Application claims: Email Addresses

### Profile Editing Flow
1. New user flow → "Profile editing" → Recommended
2. Name: `B2C_1_profileediting` 
3. Identity providers: Local Account SignIn
4. User attributes: Given Name, Surname
5. Application claims: Given Name, Surname, Email Addresses

## 4. Configure Application Settings

1. App registrations → SageInsure Frontend → Authentication
2. Add redirect URIs:
   - `http://localhost:3000/chat`
   - `https://sageinsur.maplesage.net/chat`
3. Implicit grant: Check "ID tokens"
4. Advanced settings → Allow public client flows: Yes

## 5. Update Environment Variables

Update `.env.local` with your B2C tenant details:

```env
NEXT_PUBLIC_B2C_CLIENT_ID=65ee45ec-2acb-4fd8-98fd-e96aa2fe8e5c
NEXT_PUBLIC_B2C_TENANT_NAME=sageinsure
NEXT_PUBLIC_B2C_POLICY_SIGNUP_SIGNIN=B2C_1_signupsignin
NEXT_PUBLIC_B2C_POLICY_EDIT_PROFILE=B2C_1_profileediting
NEXT_PUBLIC_B2C_POLICY_RESET_PASSWORD=B2C_1_passwordreset
NEXT_PUBLIC_B2C_AUTHORITY=https://sageinsure.b2clogin.com/sageinsure.onmicrosoft.com/B2C_1_signupsignin
NEXT_PUBLIC_B2C_KNOWN_AUTHORITIES=sageinsure.b2clogin.com
```

## 6. Test the Integration

1. Start the application: `npm run dev`
2. Navigate to `/chat`
3. Click "Sign Up / Sign In" button
4. Test sign-up flow with new email
5. Test sign-in with existing account
6. Test "Forgot Password?" link

## Features Enabled

- ✅ Sign-up and Sign-in with email/password
- ✅ Password reset flow
- ✅ Profile editing (can be added later)
- ✅ Social login integration (Google, GitHub, Facebook, Amazon)
- ✅ B2C error handling for password reset flows
- ✅ Proper token management with MSAL