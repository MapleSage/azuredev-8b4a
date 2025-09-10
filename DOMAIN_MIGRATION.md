# Domain Migration: maplesage.com to Main Azure Account

## Current Situation
- `maplesage.com` domain is verified under external MS365 account
- External account has been granted access to your main Azure account
- You want to migrate domain to main account for proper credit usage and control

## Migration Steps

### Phase 1: Prepare for Migration
1. **Document Current Setup**
   - List all DNS records for maplesage.com
   - Export user accounts from external tenant
   - Document app registrations and configurations
   - Backup any custom domains/certificates

2. **Verify Domain Control**
   - Ensure you have admin access to domain registrar
   - Confirm you can modify DNS records
   - Have domain verification TXT records ready

### Phase 2: Remove Domain from External Account
1. **Remove Domain Verification**
   - Go to external MS365 admin center
   - Azure AD → Custom domain names
   - Remove `maplesage.com` domain
   - This will revert users to `@tenant.onmicrosoft.com`

2. **Clean Up Dependencies**
   - Update any app registrations using maplesage.com
   - Change user UPNs to .onmicrosoft.com temporarily
   - Remove custom domain from any services

### Phase 3: Add Domain to Main Account
1. **Add Custom Domain**
   - Go to your main Azure AD
   - Custom domain names → Add custom domain
   - Enter `maplesage.com`
   - Follow DNS verification steps

2. **Update DNS Records**
   ```
   TXT record: MS=msXXXXXXXX (verification)
   MX record: maplesage-com.mail.protection.outlook.com
   CNAME: autodiscover.outlook.com
   ```

### Phase 4: Update Application Configuration
1. **Update B2C Configuration**
   ```env
   # Update to use main account's B2C tenant
   NEXT_PUBLIC_B2C_TENANT_NAME=yourmainaccount
   NEXT_PUBLIC_B2C_AUTHORITY=https://yourmainaccount.b2clogin.com/yourmainaccount.onmicrosoft.com/B2C_1_signupsignin
   ```

2. **Update App Registrations**
   - Create new app registration in main account
   - Update client IDs in environment variables
   - Configure redirect URIs for maplesage.com

3. **Update Helm Charts**
   - Update ingress configurations
   - Update TLS certificates
   - Redeploy with new domain settings

### Phase 5: Migrate Users (if needed)
1. **B2C User Migration**
   - Export users from external B2C (if applicable)
   - Import to main account B2C
   - Or use B2C user migration API

2. **Create Demo User**
   ```bash
   # In main account B2C
   Email: demo@maplesage.com
   Password: demo123
   ```

## Potential Issues & Solutions

### Issue 1: Domain Verification Delay
- **Problem**: DNS propagation takes time
- **Solution**: Wait 24-48 hours for full propagation

### Issue 2: Service Interruption
- **Problem**: Apps may break during migration
- **Solution**: Plan maintenance window, use staging environment

### Issue 3: Certificate Issues
- **Problem**: TLS certificates tied to old tenant
- **Solution**: Request new certificates after domain migration

### Issue 4: User Access Loss
- **Problem**: Users can't login during migration
- **Solution**: Communicate downtime, provide alternative access

## Post-Migration Checklist
- [ ] Domain verified in main account
- [ ] DNS records updated and propagating
- [ ] App registrations recreated in main account
- [ ] Environment variables updated
- [ ] B2C user flows configured
- [ ] Demo user created
- [ ] Applications redeployed
- [ ] TLS certificates renewed
- [ ] Users can authenticate successfully

## Benefits After Migration
- ✅ Full control over domain and users
- ✅ Proper credit usage in main account
- ✅ Simplified account management
- ✅ Better security and compliance
- ✅ Unified billing and administration