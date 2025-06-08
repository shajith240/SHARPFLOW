# Conversation Cleanup System Documentation

## Overview

The Conversation Cleanup System automatically manages chat message retention to prevent database bloat while maintaining conversation memory functionality for recent interactions. It implements industry best practices for chat application message retention with configurable settings and multi-tenant isolation.

## Features

### ✅ **Automatic Cleanup**
- Scheduled cleanup jobs (daily at 2 AM UTC by default)
- Configurable retention periods via environment variables
- Multi-tenant isolation (users only affect their own data)
- Background processing that doesn't impact active chat performance

### ✅ **Smart Data Preservation**
- **Soft Delete**: Messages marked as irrelevant before hard deletion
- **Conversation Summaries**: Generated before detailed messages are deleted
- **System Messages**: Preserved for debugging and audit trails
- **Error Messages**: Kept for troubleshooting purposes
- **Session Metadata**: Maintained for analytics

### ✅ **Performance Optimization**
- Batch processing to handle large datasets efficiently
- Specialized database indexes for cleanup operations
- Configurable batch sizes to control resource usage
- Cache cleanup to free memory

## Configuration

### Environment Variables

```bash
# Retention Configuration
CHAT_RETENTION_DAYS=30                    # Days to retain messages (30 dev, 180 prod)
CLEANUP_BATCH_SIZE=1000                   # Records per cleanup batch
CLEANUP_SCHEDULE="0 2 * * *"              # Cron schedule (daily 2 AM UTC)

# Cleanup Behavior
ENABLE_SOFT_DELETE=true                   # Enable soft deletion
PRESERVE_SYSTEM_MESSAGES=true            # Keep system messages
PRESERVE_ERROR_MESSAGES=true             # Keep error messages
PRESERVE_SUMMARIES=true                   # Generate summaries
DISABLE_AUTO_CLEANUP=false                # Disable automatic cleanup
```

### Default Retention Periods

| Environment | Retention Period | Rationale |
|-------------|------------------|-----------|
| Development | 30 days | Testing and debugging |
| Production | 180 days (6 months) | User experience and support |
| Enterprise | 365+ days | Compliance and audit trails |

## Database Schema

### New Tables

#### `system_stats`
Tracks cleanup statistics and system monitoring data.

#### Updated `agent_memory_preferences`
Added `retention_days` column for user-specific retention settings.

### Performance Indexes

```sql
-- Cleanup-specific indexes for efficient operations
CREATE INDEX idx_conversation_messages_cleanup 
ON conversation_messages(created_at, is_context_relevant, user_id);

CREATE INDEX idx_conversation_messages_soft_delete 
ON conversation_messages(is_context_relevant, created_at) 
WHERE is_context_relevant = false;

CREATE INDEX idx_conversation_sessions_cleanup 
ON conversation_sessions(last_activity_at, status, user_id);
```

## API Endpoints

### GET `/api/ai-agents/conversations/cleanup/status`
Get cleanup system status and configuration.

**Response:**
```json
{
  "success": true,
  "status": {
    "isRunning": false,
    "lastCleanup": "2024-01-15T02:00:00Z",
    "config": {
      "retentionDays": 30,
      "batchSize": 1000,
      "enableSoftDelete": true,
      "preserveSystemMessages": true,
      "preserveErrorMessages": true,
      "preserveSummaries": true,
      "cleanupSchedule": "0 2 * * *"
    },
    "nextScheduledRun": "2024-01-16T02:00:00Z"
  }
}
```

### POST `/api/ai-agents/conversations/cleanup/run`
Manually trigger cleanup for the current user.

**Response:**
```json
{
  "success": true,
  "stats": {
    "messagesProcessed": 1250,
    "messagesSoftDeleted": 800,
    "messagesHardDeleted": 200,
    "sessionsArchived": 15,
    "summariesGenerated": 12,
    "cacheEntriesCleared": 45,
    "executionTimeMs": 2340
  }
}
```

### PUT `/api/ai-agents/conversations/retention/:agentType`
Update retention settings for a specific agent.

**Request Body:**
```json
{
  "retentionDays": 60
}
```

## Cleanup Process

### Phase 1: Summary Generation
- Identifies conversations that will be cleaned
- Generates AI-powered summaries using OpenAI
- Stores summaries in `conversation_sessions.context_summary`

### Phase 2: Soft Deletion
- Marks old messages as `is_context_relevant = false`
- Preserves system and error messages based on configuration
- Messages remain in database but excluded from context

### Phase 3: Hard Deletion
- Permanently removes very old soft-deleted messages
- Uses double retention period (e.g., 60 days for 30-day retention)
- Ensures complete data removal for privacy compliance

### Phase 4: Session Archiving
- Archives inactive conversation sessions
- Maintains session metadata for analytics
- Frees up active session resources

### Phase 5: Cache Cleanup
- Removes expired context cache entries
- Frees memory and improves performance
- Updates system statistics

## Frontend Integration

### Conversation Retention Settings Component

Located at `client/src/components/settings/ConversationRetentionSettings.tsx`

**Features:**
- Real-time cleanup status display
- Manual cleanup trigger
- Per-agent retention configuration
- Cleanup statistics visualization
- System configuration overview

**Usage:**
```tsx
import { ConversationRetentionSettings } from "@/components/settings/ConversationRetentionSettings";

function SettingsPage() {
  return (
    <div>
      <ConversationRetentionSettings />
    </div>
  );
}
```

## Monitoring and Maintenance

### Cleanup Statistics

The system tracks detailed statistics for each cleanup operation:

- **Messages Processed**: Total messages evaluated
- **Messages Soft Deleted**: Messages marked as irrelevant
- **Messages Hard Deleted**: Messages permanently removed
- **Sessions Archived**: Inactive sessions archived
- **Summaries Generated**: Conversation summaries created
- **Cache Entries Cleared**: Cache entries removed
- **Execution Time**: Total cleanup duration

### Health Monitoring

Monitor these metrics for system health:

1. **Cleanup Frequency**: Ensure scheduled cleanups run successfully
2. **Processing Time**: Watch for increasing cleanup duration
3. **Error Rates**: Monitor failed cleanup operations
4. **Database Growth**: Track database size trends
5. **User Impact**: Ensure no performance degradation during cleanup

### Troubleshooting

#### Cleanup Not Running
- Check `DISABLE_AUTO_CLEANUP` environment variable
- Verify cron schedule format in `CLEANUP_SCHEDULE`
- Check server logs for initialization errors

#### Performance Issues
- Reduce `CLEANUP_BATCH_SIZE` for slower systems
- Adjust cleanup schedule to off-peak hours
- Monitor database index usage

#### Data Loss Concerns
- Verify `PRESERVE_SUMMARIES=true` for important conversations
- Check `PRESERVE_SYSTEM_MESSAGES=true` for debugging data
- Test retention settings in development first

## Best Practices

### Development Environment
- Use shorter retention periods (7-30 days)
- Enable all preservation options for debugging
- Run manual cleanups for testing

### Production Environment
- Use longer retention periods (90-180 days)
- Monitor cleanup performance and adjust batch sizes
- Set up alerts for cleanup failures

### Compliance Considerations
- Document retention policies for legal requirements
- Implement user data export before deletion
- Maintain audit logs of cleanup operations

## Security and Privacy

### Data Protection
- Complete data isolation between users
- Secure deletion of sensitive information
- Audit trail of all cleanup operations

### GDPR Compliance
- Right to be forgotten through manual cleanup
- Data retention policy enforcement
- User control over retention settings

## Future Enhancements

### Planned Features
- User-initiated data export before cleanup
- Advanced retention rules based on message importance
- Integration with external backup systems
- Real-time cleanup progress monitoring
- Automated performance optimization

### Scalability Considerations
- Distributed cleanup for large datasets
- Database partitioning for improved performance
- Asynchronous processing for heavy workloads
