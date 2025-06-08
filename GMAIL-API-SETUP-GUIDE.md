# Gmail API Setup Guide for Sentinel Agent Email Monitoring

## Current Status
- ✅ **Google OAuth Credentials**: Configured
- ✅ **Calendar API**: Working correctly
- ❌ **Gmail API**: Insufficient permissions

## Issue: Insufficient Permission
The Gmail API authentication is failing due to missing scopes in the OAuth consent screen.

## Required Gmail API Scopes

The Sentinel Agent needs these specific scopes:
```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
https://www.googleapis.com/auth/calendar
```

## Fix Steps

### 1. Update Google Cloud Console OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `sharpflow-ai-agents`
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Click **Edit App**
5. In the **Scopes** section, add these scopes:
   - `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail messages
   - `https://www.googleapis.com/auth/gmail.send` - Send emails via Gmail
   - `https://www.googleapis.com/auth/calendar` - Calendar integration

### 2. Enable Gmail API

1. Go to **APIs & Services** > **Library**
2. Search for "Gmail API"
3. Click **Enable** if not already enabled

### 3. Re-authorize the Application

Since we've added new scopes, you need to re-authorize:

1. **Option A: Revoke and Re-authorize**
   - Go to [Google Account Permissions](https://myaccount.google.com/permissions)
   - Find your SharpFlow application
   - Click **Remove access**
   - Re-run the OAuth flow to get new tokens

2. **Option B: Generate New Refresh Token**
   ```bash
   # Use Google OAuth Playground
   # 1. Go to https://developers.google.com/oauthplayground/
   # 2. Click settings gear icon
   # 3. Check "Use your own OAuth credentials"
   # 4. Enter your Client ID and Client Secret
   # 5. In Step 1, add the Gmail scopes:
   #    - https://www.googleapis.com/auth/gmail.readonly
   #    - https://www.googleapis.com/auth/gmail.send
   #    - https://www.googleapis.com/auth/calendar
   # 6. Authorize and get the refresh token
   ```

### 4. Update Environment Variables

Ensure your `.env` file has the correct scopes:
```env
GMAIL_SCOPES=https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/calendar
```

## Testing Gmail API Access

After updating the scopes and re-authorizing, test the connection:

```bash
cd server
npx tsx tests/phase1-environment-test.ts
```

Expected output:
```
✅ Gmail API authentication successful
   Details: {
     "emailAddress": "your-email@gmail.com",
     "messagesTotal": 1234,
     "threadsTotal": 567,
     "hasAccessToken": true
   }
```

## Gmail API Capabilities for Sentinel Agent

Once properly configured, the Sentinel Agent will have these capabilities:

### Email Monitoring
- ✅ Read new emails every 1-2 minutes
- ✅ Filter emails by criteria (sales inquiries, calendar requests)
- ✅ Extract email content and metadata
- ✅ Track email threads and conversations

### Email Response
- ✅ Generate AI-powered email responses
- ✅ Send replies through Gmail API
- ✅ Maintain email thread continuity
- ✅ Handle calendar booking requests

### Integration Features
- ✅ Real-time WebSocket notifications
- ✅ Database persistence of email data
- ✅ Human approval workflow for responses
- ✅ Escalation to human review for complex emails

## Security Considerations

### OAuth Scopes Explanation
- **gmail.readonly**: Required to monitor incoming emails
- **gmail.send**: Required to send automated responses
- **calendar**: Required for calendar booking integration

### Data Privacy
- Emails are processed locally within your SharpFlow instance
- No email content is sent to external services except OpenAI for AI processing
- All email data is stored in your private Supabase database
- OAuth tokens are securely stored and encrypted

## Troubleshooting

### Common Issues

1. **"Insufficient Permission" Error**
   - Solution: Add required scopes to OAuth consent screen
   - Re-authorize the application

2. **"Access Blocked" Error**
   - Solution: Ensure app is not in testing mode for production use
   - Verify user email is added to test users if in testing mode

3. **"Invalid Grant" Error**
   - Solution: Refresh token may be expired, generate new one
   - Check system clock synchronization

### Debug Steps
```bash
# Test individual API calls
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     "https://gmail.googleapis.com/gmail/v1/users/me/profile"

# Check token validity
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     "https://www.googleapis.com/oauth2/v1/tokeninfo"
```

## Next Steps

1. ✅ **Update OAuth Scopes**: Add Gmail API scopes to consent screen
2. ✅ **Re-authorize Application**: Get new refresh token with Gmail permissions
3. ✅ **Test Gmail API**: Verify authentication passes
4. ✅ **Proceed to Phase 2**: Database schema migration

## Support Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth Playground](https://developers.google.com/oauthplayground/)
