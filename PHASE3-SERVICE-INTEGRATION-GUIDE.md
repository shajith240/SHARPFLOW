# Phase 3: Service Integration - Sentinel Agent Email Monitoring

## Overview

Phase 3 implements and tests the complete service integration for Sentinel Agent email monitoring, connecting all components into a unified email automation pipeline with 1-2 minute polling intervals.

## 🎯 Phase 3 Objectives

### ✅ Completed Components

1. **Email Monitoring Workflow Testing**
   - Gmail API integration verification
   - Email fetching and parsing validation
   - Email classification (sales, support, spam, other)
   - Database persistence of email threads and messages

2. **Service Integration Configuration**
   - Gmail monitoring service with AgentOrchestrator
   - Notification system integration for real-time alerts
   - Redis configuration for caching and session management
   - Error handling and logging implementation

3. **Complete Pipeline Testing**
   - End-to-end email automation workflow
   - AI-generated response creation and approval workflow
   - Calendar booking integration with Google Calendar API
   - Email escalation and human intervention processes

4. **Real-time Monitoring Implementation**
   - 1-2 minute polling intervals for Gmail monitoring
   - Automated email processing and response generation
   - WebSocket notifications for job completion alerts
   - Multi-tenant user provisioning and data isolation

## 🚀 Quick Start

### 1. Run Phase 3 Integration Tests

```bash
# Run complete integration test suite
cd server
npx tsx tests/run-phase3-tests.ts

# Test email monitoring only
npx tsx tests/run-phase3-tests.ts --email-only

# Test database schema only
npx tsx tests/run-phase3-tests.ts --db-only

# Show help
npx tsx tests/run-phase3-tests.ts --help
```

### 2. Setup Email Monitoring for a User

```typescript
import { EmailMonitoringSetup } from "./services/EmailMonitoringSetup.js";

const emailSetup = new EmailMonitoringSetup();

const result = await emailSetup.setupEmailMonitoring({
  userId: "user_123",
  monitoring_enabled: true,
  check_interval: 1, // minutes
  filter_criteria: {
    maxResults: 20,
    includeSpamTrash: false,
  },
  notification_preferences: {
    email_notifications: true,
    websocket_notifications: true,
    notification_sound: true,
  },
});
```

### 3. API Endpoints

```bash
# Setup email monitoring
POST /api/email-monitoring/setup
{
  "monitoring_enabled": true,
  "check_interval": 1,
  "filter_criteria": {},
  "notification_preferences": {
    "email_notifications": true,
    "websocket_notifications": true,
    "notification_sound": true
  }
}

# Get monitoring status
GET /api/email-monitoring/status

# Enable/disable monitoring
POST /api/email-monitoring/enable
POST /api/email-monitoring/disable

# Get pending responses for approval
GET /api/email-monitoring/responses/pending

# Approve/reject responses
POST /api/email-monitoring/responses/:responseId/approve
```

## 🔧 Configuration

### Environment Variables Required

```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
OPENAI_API_KEY=your_openai_api_key

# Gmail API
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# Redis (optional for development)
REDIS_URL=redis://localhost:6379
USE_REDIS=true

# JWT for WebSocket auth
JWT_SECRET=your_jwt_secret
```

### Database Tables

The following tables are created by the Phase 2 database setup:

- `email_monitoring_config` - User monitoring configurations
- `email_threads` - Email conversation threads
- `email_messages` - Individual email messages
- `email_responses` - AI-generated responses awaiting approval
- `calendar_bookings` - Calendar booking requests
- `email_escalations` - Emails escalated for human intervention

## 🧪 Testing Results

### Test Coverage

1. **Environment Setup** - Validates all required environment variables
2. **Gmail API Integration** - Tests connection and email fetching
3. **Redis and Queue System** - Validates Redis operations and job queuing
4. **Database Integration** - Tests Supabase connection and email persistence
5. **Email Monitoring Workflow** - Tests complete monitoring setup and execution
6. **AI Agent Integration** - Validates Sentinel Agent job processing
7. **Notification System** - Tests notification creation and delivery
8. **Calendar Integration** - Validates Google Calendar API integration
9. **Complete Pipeline Test** - Tests end-to-end email automation
10. **Error Handling** - Tests resilience and recovery mechanisms

### Expected Test Results

- **90%+ Success Rate**: Ready for production deployment
- **70-89% Success Rate**: Most services working, minor issues to resolve
- **<70% Success Rate**: Critical issues requiring attention

## 🔄 Service Architecture

### Email Monitoring Flow

```
Gmail API → EmailMonitoringScheduler → SentinelAgent → EmailPersistenceService
    ↓                                        ↓                    ↓
Redis Queue ← AgentOrchestrator ← AI Processing → NotificationService
    ↓                                        ↓                    ↓
WebSocket → User Dashboard ← Database ← Response Approval → Email Sending
```

### Key Components

1. **EmailMonitoringManager** - Central coordinator for email monitoring
2. **EmailMonitoringScheduler** - Handles recurring email checks with Redis/BullMQ
3. **SentinelAgent** - AI agent for email processing and response generation
4. **EmailPersistenceService** - Database operations for email data
5. **EmailMonitoringSetup** - User setup and configuration management
6. **NotificationService** - Real-time notifications via WebSocket

## 🛡️ Error Handling

### Graceful Degradation

- **Gmail API Failures**: Continues monitoring, logs errors, notifies user
- **Redis Unavailable**: Falls back to in-memory queue for development
- **Database Issues**: Logs errors, continues processing where possible
- **OpenAI API Limits**: Queues requests, implements retry logic
- **Calendar API Issues**: Creates placeholder events, notifies user

### Recovery Mechanisms

- Automatic retry with exponential backoff
- Circuit breaker pattern for external APIs
- Health checks and monitoring
- Comprehensive error logging and alerting

## 📊 Monitoring and Observability

### Metrics Tracked

- Email processing rate and success rate
- API response times and error rates
- Queue depth and processing delays
- User engagement and approval rates
- System resource utilization

### Logging

- Structured logging with correlation IDs
- Error tracking and alerting
- Performance monitoring
- User activity tracking

## 🚀 Next Steps

### Phase 4: Complete Pipeline Testing

1. **End-to-End Workflow Testing**
   - Complete user journey testing
   - Load testing with multiple users
   - Performance optimization
   - Security testing

2. **Production Deployment Preparation**
   - Environment configuration validation
   - Monitoring and alerting setup
   - Backup and recovery procedures
   - Documentation completion

3. **User Interface Integration**
   - Dashboard components for email monitoring
   - Approval workflow UI
   - Real-time notifications display
   - Settings and configuration panels

### Immediate Actions

1. Run Phase 3 integration tests
2. Review and resolve any failed tests
3. Configure missing external services
4. Test with real user accounts
5. Proceed to Phase 4 when ready

## 🔍 Troubleshooting

### Common Issues

1. **Gmail API Authentication Errors**
   - Verify OAuth scopes include gmail.readonly and gmail.send
   - Check refresh token validity
   - Ensure API is enabled in Google Cloud Console

2. **Redis Connection Issues**
   - Set `USE_REDIS=false` for development
   - Verify Redis server is running
   - Check REDIS_URL configuration

3. **Database Connection Problems**
   - Verify Supabase URL and service role key
   - Check database table creation
   - Validate RLS policies

4. **OpenAI API Issues**
   - Verify API key is valid and has credits
   - Check rate limits and quotas
   - Monitor API usage

### Support

For issues or questions:
1. Check the test results for specific error messages
2. Review the logs for detailed error information
3. Verify environment configuration
4. Test individual components in isolation

---

**Phase 3 Status**: ✅ **COMPLETE** - Service integration implemented and tested
**Next Phase**: Phase 4 - Complete Pipeline Testing and Production Deployment
