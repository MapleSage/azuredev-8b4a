# Azure AD B2C Branding Configuration

## Why No SageInsure Logo/Styling?

The B2C login pages use Microsoft's default styling because:

1. **Different Client ID**: You're using `65ee45ec-2acb-4fd8-98fd-e96aa2fe8e5c` which may not have custom branding configured
2. **B2C Branding Not Set**: Custom branding needs to be configured in the B2C tenant

## Configure B2C Custom Branding

### 1. Upload Company Logo
1. Go to Azure AD B2C → Company branding
2. Upload SageInsure logo (recommended: 280x120px PNG)
3. Set background color: `#1a1a1a` (dark theme)
4. Set text color: `#ffffff` (white text)

### 2. Customize User Flow Pages
1. B2C → User flows → B2C_1_signupsignin
2. Page layouts → Unified sign-up or sign-in page
3. Use custom page content: Yes
4. Custom page URI: `https://staging.maplesage.com/b2c-custom.html`

### 3. Create Custom B2C HTML Template
Create a custom HTML file with SageInsure branding:

```html
<!DOCTYPE html>
<html>
<head>
    <title>SageInsure - Sign In</title>
    <style>
        body { 
            background: #000; 
            color: #fff; 
            font-family: 'Segoe UI', sans-serif;
        }
        .logo { 
            background: url('https://staging.maplesage.com/logo.png') no-repeat;
            height: 60px;
            margin: 20px auto;
        }
    </style>
</head>
<body>
    <div id="api"></div>
</body>
</html>
```

### 4. Alternative: Use Built-in Branding
If you don't want custom HTML:

1. B2C → Company branding → Configure
2. Banner logo: Upload SageInsure logo
3. Background color: `#000000`
4. Square logo: Upload square version
5. Show option to remain signed in: Yes

## Demo User Creation

The demo credentials won't work until you create the user:

### Option 1: Create via B2C Portal
1. B2C → Users → New user
2. Email: `demo@sageinsure.com`
3. Password: `demo123`
4. Force password change: No

### Option 2: Self-Registration
1. Click "Sign Up / Sign In" button
2. Choose "Sign up now"
3. Enter demo@sageinsure.com
4. Set password: demo123
5. Complete profile

## Domain Configuration Issue

Yes, the maplesage.com domain might be configured under a different client. Check:

1. **App Registration**: Ensure `65ee45ec-2acb-4fd8-98fd-e96aa2fe8e5c` has redirect URIs for both:
   - `http://localhost:3000/chat`
   - `https://staging.maplesage.com/chat`

2. **Custom Domain**: If using custom domain, configure:
   - B2C → Custom domains
   - Add: `login.maplesage.com`
   - Update authority to: `https://login.maplesage.com/sageinsure.onmicrosoft.com/B2C_1_signupsignin`