# AI Agentic System Testing Guide

## 🚀 Quick Start Testing

### 1. Access the Setup Page
Navigate to: `http://localhost:3000/dashboard/ai-agentic-setup`

### 2. Seed Mock Data (Development Only)
Click the **"Seed Mock Data for Testing"** button to populate the database with:
- **3 Company Profiles** (Technology, Healthcare, Financial Services)
- **5 Agent Prompts** (Falcon, Sage, Sentinel, Prism)
- **5 Qualification Rules** (Industry, Company Size, Decision Maker, etc.)
- **4 Mock Leads** (Various qualification levels)

### 3. Test the System Status
The status dashboard will show:
- Company profile configuration status
- Generated prompts by agent
- Qualification results summary

---

## 📊 Mock Data Overview

### Company Profiles

#### 1. TechFlow Solutions (Technology/SaaS)
- **Industry**: Technology, SaaS
- **Size**: Medium (50-500 employees)
- **Revenue**: $10-50M
- **Focus**: Workflow automation for mid-market companies
- **Target**: Operations managers, IT directors

#### 2. HealthCare Analytics Pro (Healthcare)
- **Industry**: Healthcare Technology
- **Size**: Large (100+ beds/providers)
- **Revenue**: $50-100M
- **Focus**: Healthcare data analytics and predictive modeling
- **Target**: CMOs, Healthcare IT Directors

#### 3. FinanceFlow AI (Financial Services)
- **Industry**: Fintech
- **Size**: Startup
- **Revenue**: $1-10M
- **Focus**: AI-powered financial analysis for smaller institutions
- **Target**: CFOs, Risk Managers

### Mock Leads

#### 1. Sarah Johnson - TechCorp Solutions (High Quality)
- **Title**: VP of Operations
- **Industry**: Technology
- **Score**: 75/100
- **Status**: New
- **Notes**: Recent $50M Series B funding for digital transformation

#### 2. Michael Chen - Regional Health Systems (Excellent)
- **Title**: Chief Information Officer
- **Industry**: Healthcare
- **Score**: 92/100
- **Status**: Qualified
- **Notes**: Leading EHR modernization project

#### 3. Emily Rodriguez - Community First Bank (Good)
- **Title**: Risk Management Director
- **Industry**: Financial Services
- **Score**: 88/100
- **Status**: Qualified
- **Notes**: Upgrading risk assessment systems, Q2 budget allocated

#### 4. David Kim - Small Startup Inc (Poor Fit)
- **Title**: Founder & CEO
- **Industry**: Technology
- **Score**: 35/100
- **Status**: Unqualified
- **Notes**: Early-stage startup, 8 employees, limited budget

---

## 🧪 API Testing Examples

### 1. Get System Status
```bash
curl -X GET "http://localhost:3000/api/ai-agentic/status" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

### 2. Create Company Profile
```bash
curl -X POST "http://localhost:3000/api/ai-agentic/company-profile" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt \
  -d '{
    "companyName": "Test Company",
    "industry": "Technology",
    "businessModel": "B2B",
    "companySize": "medium",
    "targetMarket": "Mid-market software companies",
    "valueProposition": "We help companies automate their workflows"
  }'
```

### 3. Generate Custom Prompts
```bash
curl -X POST "http://localhost:3000/api/ai-agentic/generate-prompts" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

### 4. Generate Qualification Rules
```bash
curl -X POST "http://localhost:3000/api/ai-agentic/generate-qualification-rules" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

### 5. Qualify a Lead
```bash
curl -X POST "http://localhost:3000/api/ai-agentic/qualify-lead/LEAD_ID" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

### 6. Batch Qualify Leads
```bash
curl -X POST "http://localhost:3000/api/ai-agentic/qualify-leads-batch" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt \
  -d '{
    "leadIds": ["lead-id-1", "lead-id-2", "lead-id-3"]
  }'
```

### 7. Get Qualification Results
```bash
curl -X GET "http://localhost:3000/api/ai-agentic/qualification-results?status=qualified&limit=10" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

---

## 🔍 Testing Scenarios

### Scenario 1: Complete Setup Flow
1. **Seed mock data** using the UI button
2. **View system status** to see populated data
3. **Generate custom prompts** for all agents
4. **Generate qualification rules** based on company profile
5. **Qualify individual leads** using the API
6. **Review qualification results** in the dashboard

### Scenario 2: Custom Company Profile
1. **Create a new company profile** with your own business details
2. **Generate custom prompts** and compare with defaults
3. **Create qualification rules** and test with different lead types
4. **Analyze the AI reasoning** for qualification decisions

### Scenario 3: Multi-Industry Testing
1. **Switch between different company profiles** (Tech, Healthcare, Finance)
2. **Compare generated prompts** for different industries
3. **Test lead qualification** with industry-specific criteria
4. **Analyze performance differences** across industries

---

## 📈 Expected Results

### Prompt Customization
- **Industry-specific language** in generated prompts
- **Company size considerations** in qualification criteria
- **Target market alignment** in agent instructions
- **Brand voice consistency** across all agents

### Lead Qualification
- **Higher scores** for leads matching company profile
- **Detailed reasoning** for qualification decisions
- **Industry-specific criteria** application
- **Confidence scores** reflecting match quality

### Performance Metrics
- **Generation time** under 5 seconds for prompts
- **Qualification accuracy** above 80%
- **API response times** under 2 seconds
- **Database queries** optimized with proper indexing

---

## 🐛 Troubleshooting

### Common Issues

#### 1. OpenAI API Errors
- **Check API key configuration** in user settings
- **Verify rate limits** haven't been exceeded
- **Review error messages** for specific issues

#### 2. Database Connection Issues
- **Verify Supabase connection** is working
- **Check RLS policies** are properly configured
- **Ensure user authentication** is valid

#### 3. Mock Data Issues
- **Only works in development** environment
- **Requires user authentication** to seed data
- **May conflict with existing data** (uses upsert)

### Debug Tips
1. **Check browser console** for client-side errors
2. **Review server logs** for API errors
3. **Use network tab** to inspect API responses
4. **Verify database state** in Supabase dashboard

---

## 🎯 Success Criteria

### ✅ System Setup
- [ ] Database tables created successfully
- [ ] Mock data seeded without errors
- [ ] System status shows all components active
- [ ] UI loads without errors

### ✅ Prompt Customization
- [ ] Company profile saves successfully
- [ ] Custom prompts generate within 10 seconds
- [ ] Prompts contain industry-specific content
- [ ] All 4 agents have customized prompts

### ✅ Lead Qualification
- [ ] Qualification rules generate successfully
- [ ] Individual lead qualification works
- [ ] Batch qualification processes multiple leads
- [ ] Results include detailed reasoning

### ✅ Performance
- [ ] API responses under 3 seconds
- [ ] UI remains responsive during operations
- [ ] Database queries execute efficiently
- [ ] Error handling works properly

---

## 📝 Next Steps

After successful testing:

1. **Integrate with existing agents** to use custom prompts
2. **Add qualification to lead generation** workflow
3. **Create performance dashboards** for monitoring
4. **Implement A/B testing** for prompt effectiveness
5. **Add advanced analytics** for qualification accuracy

---

## 🔗 Related Documentation

- [Database Schema](./database-setup/10-ai-agentic-system-final.sql)
- [API Routes](./server/routes/aiAgenticSystemRoutes.ts)
- [Services](./server/services/)
- [UI Components](./client/src/pages/ai-agentic-setup.tsx)
