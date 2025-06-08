# SharpFlow AI Agents Migration Guide

## 🎯 Overview

This document outlines the complete migration from n8n workflows and Telegram bot integration to native web-based AI agents integrated directly into the SharpFlow platform.

## 🔄 Migration Summary

### **Before (n8n + Telegram)**

- External n8n workflows for agent logic
- Telegram bot for user interaction
- Complex webhook integrations
- Separate infrastructure dependencies

### **After (Native Web Integration)**

- Native TypeScript/JavaScript agents
- Direct web chat interface
- Real-time WebSocket communication
- Integrated dashboard experience

## 🤖 AI Agents System

### **Prism Orchestrator**

- Central intelligence that interprets user requests
- Routes tasks to appropriate specialized agents
- Manages multi-agent workflows
- Provides conversational interface

### **Specialized Agents**

#### **🦅 Falcon Agent (Lead Generation)**

- **Purpose**: Generate leads using Apollo.io
- **Input**: Locations, business types, job titles
- **Output**: Qualified leads stored in database
- **Replaces**: `Lead_Scraping.json` n8n workflow

#### **🧠 Sage Agent (Lead Research)**

- **Purpose**: Research leads and companies
- **Input**: LinkedIn URLs
- **Output**: Comprehensive HTML research reports
- **APIs**: LinkedIn (Apify), Perplexity, Trustpilot
- **Replaces**: `Lead_Research.json` n8n workflow

#### **🛡️ Sentinel Agent (Auto Reply)**

- **Purpose**: Generate personalized outreach messages
- **Input**: Lead ID, message type, context
- **Output**: Personalized email/LinkedIn messages
- **Replaces**: Auto-reply functionality from n8n

## 🏗️ Architecture

```
Frontend (React) ←→ WebSocket ←→ Prism ←→ Job Queue ←→ Agents
                                     ↓
                                 Supabase Database
```

### **Key Components**

1. **WebSocket Manager**: Real-time communication
2. **Job Queue System**: Reliable task processing with Bull/Redis
3. **Agent Orchestrator**: Coordinates all agents and communication
4. **Database Integration**: Direct Supabase integration

## 📁 File Structure

```
server/ai-agents/
├── types/
│   └── index.ts                 # Type definitions
├── core/
│   ├── BaseAgent.ts            # Abstract base class for all agents
│   ├── Prism.ts               # Central orchestrator and intent recognition
│   ├── JobQueue.ts             # Job queue management with Bull/Redis
│   ├── WebSocketManager.ts     # Real-time communication
│   └── AgentOrchestrator.ts    # Main orchestrator
├── agents/
│   ├── FalconAgent.ts          # Lead generation (Apollo.io)
│   ├── SageAgent.ts            # Lead research (LinkedIn + company)
│   └── SentinelAgent.ts        # Auto-reply generation
└── routes/
    └── aiAgentsRoutes.ts       # API endpoints

client/src/components/ai-agents/
└── AgentChat.tsx               # React chat interface

database-setup/
└── 02-ai-agents-tables.sql    # Database schema
```

## 🚀 Setup Instructions

### **1. Install Dependencies**

```bash
npm install socket.io socket.io-client openai axios uuid @types/uuid
```

### **2. Environment Variables**

Copy `.env.ai-agents.example` to `.env` and configure:

```env
OPENAI_API_KEY=your_openai_api_key
APOLLO_API_KEY=your_apollo_api_key
APIFY_API_KEY=your_apify_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
```

### **3. Database Setup**

Run the SQL script in Supabase:

```bash
# Execute in Supabase SQL Editor
database-setup/02-ai-agents-tables.sql
```

### **4. Redis Setup**

Ensure Redis is running:

```bash
# Local Redis
redis-server

# Or use Redis Cloud/AWS ElastiCache for production
```

### **5. Start the Application**

```bash
npm run dev
```

## 🔌 API Endpoints

### **Authentication**

- `POST /api/ai-agents/auth/websocket-token` - Get WebSocket auth token

### **Agent Management**

- `GET /api/ai-agents/agents/status` - Get agent statuses
- `POST /api/ai-agents/agents/:agentName/jobs` - Start agent job directly

### **Job Management**

- `GET /api/ai-agents/jobs/:jobId/status` - Get job status
- `DELETE /api/ai-agents/jobs/:jobId` - Cancel job

### **Chat System**

- `GET /api/ai-agents/chat/sessions` - Get chat sessions
- `POST /api/ai-agents/chat/sessions` - Create new session
- `GET /api/ai-agents/chat/sessions/:sessionId/messages` - Get messages

## 🌐 WebSocket Events

### **Client → Server**

- `chat:message` - Send chat message
- `agent:start_job` - Start agent job directly
- `agent:get_status` - Request agent status
- `session:join` - Join chat session

### **Server → Client**

- `chat:message` - Receive chat message
- `job:started` - Job started notification
- `job:progress` - Job progress update
- `job:completed` - Job completion notification
- `job:error` - Job error notification
- `agent:status` - Agent status update

## 💬 Usage Examples

### **Lead Generation**

```
User: "Find hair salon owners in New York and Los Angeles"
Prism: Interprets intent → Routes to Falcon Agent
Falcon: Searches Apollo.io → Saves leads to database
Result: Real-time progress updates + lead count
```

### **Lead Research**

```
User: "Research this LinkedIn profile: linkedin.com/in/johndoe"
Prism: Interprets intent → Routes to Sage Agent
Sage: Scrapes LinkedIn + Company research → Generates HTML report
Result: Comprehensive research report with AI insights
```

### **Auto Reply**

```
User: "Generate a reply for lead ID 123"
Prism: Interprets intent → Routes to Sentinel Agent
Sentinel: Analyzes lead + research data → Generates personalized message
Result: Multiple message variations with different tones
```

## 🔄 Migration Process

### **Phase 1: Parallel Operation**

1. Deploy new AI agents system
2. Keep existing n8n workflows running
3. Test with subset of users

### **Phase 2: Gradual Migration**

1. Feature flag to switch between systems
2. Migrate users in batches
3. Monitor performance and feedback

### **Phase 3: Complete Migration**

1. Disable n8n workflows
2. Remove Telegram bot dependencies
3. Full native web experience

## 🎯 Benefits

### **User Experience**

- ✅ Real-time chat interface
- ✅ Immediate feedback and progress updates
- ✅ Integrated dashboard experience
- ✅ Mobile-responsive design

### **Technical Benefits**

- ✅ Reduced infrastructure complexity
- ✅ Better error handling and debugging
- ✅ Improved performance and reliability
- ✅ Enhanced security and data privacy

### **Business Benefits**

- ✅ Lower operational costs
- ✅ Faster feature development
- ✅ Better user retention
- ✅ Improved scalability

## 🛠️ Troubleshooting

### **Common Issues**

1. **WebSocket Connection Failed**

   - Check JWT_SECRET configuration
   - Verify Redis is running
   - Check CORS settings

2. **Agent Jobs Failing**

   - Verify API keys (OpenAI, Apollo, Apify, Perplexity)
   - Check Redis connection
   - Review agent logs

3. **Database Errors**
   - Ensure all tables are created
   - Check RLS policies
   - Verify user authentication

### **Monitoring**

- Monitor Redis queue health
- Track agent performance metrics
- Monitor WebSocket connection stability
- Review error logs regularly

## 🔮 Future Enhancements

1. **Advanced Analytics**: Agent performance dashboards
2. **Custom Agents**: User-defined agent workflows
3. **Voice Interface**: Voice-to-text chat integration
4. **Mobile App**: Native mobile agent interface
5. **API Integrations**: Additional data sources and tools

## 📞 Support

For technical support or questions about the AI agents migration:

1. Check the troubleshooting section above
2. Review the implementation code and comments
3. Test with the provided examples
4. Monitor system logs for detailed error information

---

**Status**: ✅ **IMPLEMENTATION COMPLETE**

The AI agents system is fully implemented and ready for deployment. All n8n workflow functionality has been successfully migrated to native web-based agents with enhanced capabilities and user experience.
