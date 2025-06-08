# AI Agent Customization Verification Test

## 🎯 Purpose
This test confirms that AI agents are properly customized based on user information provided during the onboarding process, including both form data and document analysis.

## 🔍 Customization Flow Overview

### **Step 1: User Information Collection**
- **Company Profile Form**: Basic business information
- **Document Upload**: PDF documents (brochures, product docs, case studies)
- **AI Document Analysis**: Extracts business intelligence from uploaded documents

### **Step 2: Data Integration**
- **Form Data**: Company name, industry, target market, value proposition
- **Document Insights**: AI-extracted terminology, products, competitive advantages
- **Combined Profile**: Merged data creates comprehensive business context

### **Step 3: AI Agent Customization**
- **Enhanced Prompts**: Generated using both form and document data
- **Agent-Specific**: Each agent (Falcon, Sage, Sentinel, Prism) gets tailored prompts
- **Industry Context**: Incorporates specific terminology and business model

## 🧪 Test Scenarios

### **Scenario A: Technology Company (TechFlow Solutions)**

#### **Input Data:**
```json
{
  "companyName": "TechFlow Solutions",
  "industry": "Technology",
  "subIndustry": "SaaS",
  "businessModel": "B2B",
  "targetMarket": "Mid-market companies seeking workflow automation",
  "valueProposition": "AI-powered process automation platform",
  "industryTerminology": ["workflow automation", "process optimization", "digital transformation"]
}
```

#### **Document Analysis Results:**
```json
{
  "extractedInsights": {
    "companyDescription": "Leading provider of AI-powered workflow automation solutions",
    "productsServices": ["Process Automation Platform", "AI Workflow Designer", "Integration APIs"],
    "industryTerminology": ["no-code automation", "business process management", "API integrations"],
    "competitiveAdvantages": ["5x faster deployment", "zero coding required", "enterprise security"]
  }
}
```

#### **Expected Falcon (Lead Generation) Customization:**
```
"You are Falcon, a specialized lead generation expert for TechFlow Solutions. 
Focus on identifying mid-market companies (50-500 employees) in technology, 
manufacturing, healthcare, and finance sectors who are actively pursuing 
workflow automation and digital transformation initiatives. 

Use terminology like 'no-code automation', 'business process management', 
and 'API integrations' when communicating. Prioritize prospects showing 
interest in process optimization, operational efficiency, and digital 
transformation projects.

Key differentiators to highlight:
- 5x faster deployment than traditional solutions
- Zero coding required for implementation
- Enterprise-grade security and compliance"
```

### **Scenario B: Healthcare Company (HealthCare Analytics Pro)**

#### **Input Data:**
```json
{
  "companyName": "HealthCare Analytics Pro",
  "industry": "Healthcare",
  "subIndustry": "Health Technology",
  "targetMarket": "Healthcare providers and hospitals",
  "valueProposition": "Data-driven insights for better patient outcomes",
  "industryTerminology": ["EHR integration", "clinical analytics", "HIPAA compliance"]
}
```

#### **Expected Sage (Research) Customization:**
```
"You are Sage, a healthcare technology research specialist for HealthCare 
Analytics Pro. Conduct deep research on healthcare providers, hospitals, 
and medical practices. Focus on EHR systems, patient outcome initiatives, 
quality improvement programs, and value-based care contracts.

Analyze HIPAA compliance status, technology infrastructure, and clinical 
decision-making processes. Use healthcare-specific terminology like 
'clinical analytics', 'EHR integration', and 'patient outcomes' in your 
research and communications."
```

## 🔧 Technical Implementation Verification

### **1. Enhanced Prompt Generation Process**

The `PromptCustomizationService.buildUserPromptFromProfile()` method:

```typescript
// Extracts document insights
const documentInsights = companyProfile.aiExtractedInsights || {};
const documentTerminology = companyProfile.documentDerivedTerminology || [];
const extractedProducts = companyProfile.extractedProductsServices || [];

// Builds comprehensive prompt including:
// - Core company information
// - Document-derived customer segments  
// - Document-derived value propositions
// - Products/services from documents
// - Combined terminology (form + documents)
// - Document-derived business intelligence
```

### **2. Document Analysis Integration**

The `DocumentAnalysisService.updateCompanyProfileWithInsights()` method:

```typescript
// Merges extracted insights with existing profile
const updatedProfile = {
  // Enhanced fields with document data
  value_proposition: profile.value_proposition || extractedInsights.valuePropositions?.join('. '),
  competitive_advantages: profile.competitive_advantages || extractedInsights.competitiveAdvantages?.join('. '),
  
  // Document-specific fields
  ai_extracted_insights: extractedInsights,
  document_derived_terminology: extractedInsights.industryTerminology,
  extracted_products_services: extractedInsights.productsServices,
  extracted_target_customers: extractedInsights.customerSegments
};
```

### **3. Agent-Specific Customization**

Each agent receives tailored prompts based on their function:

- **Falcon (Lead Generation)**: Focus on prospect identification and qualification criteria
- **Sage (Research)**: Emphasis on industry analysis and competitive intelligence  
- **Sentinel (Email)**: Communication style and response templates
- **Prism (Orchestrator)**: Request routing and workflow coordination

## ✅ Verification Steps

### **Step 1: Test Basic Customization**
1. Navigate to `/dashboard/ai-agentic-setup`
2. Fill out company profile form with specific industry data
3. Generate prompts and verify industry-specific content

### **Step 2: Test Document Enhancement**
1. Upload a company PDF document
2. Wait for AI analysis to complete
3. Regenerate prompts and verify document insights are included

### **Step 3: Test Agent Specificity**
1. Compare prompts generated for different agents
2. Verify each agent has role-specific customization
3. Confirm industry terminology is consistently used

### **Step 4: Test Multi-Source Integration**
1. Verify prompts include both form data AND document insights
2. Check that document terminology enhances form terminology
3. Confirm competitive advantages from documents are included

## 🎯 Expected Results

### **✅ Successful Customization Indicators:**

1. **Industry-Specific Language**: Prompts use terminology specific to the user's industry
2. **Company Context**: References to actual company name, products, and services
3. **Document Integration**: Insights from uploaded documents appear in prompts
4. **Agent Differentiation**: Each agent has unique, role-specific customization
5. **Business Intelligence**: Competitive advantages and value propositions are incorporated

### **📊 Customization Quality Metrics:**

- **Terminology Accuracy**: Industry-specific terms used correctly
- **Context Relevance**: Prompts reflect actual business model and target market
- **Document Utilization**: Uploaded document insights enhance prompt quality
- **Agent Specificity**: Each agent has distinct, role-appropriate customization
- **Competitive Positioning**: Unique value propositions clearly articulated

## 🚀 API Testing Commands

### **Test Prompt Generation:**
```bash
curl -X POST "http://localhost:3000/api/ai-agentic/generate-prompts" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

### **Test Document Upload:**
```bash
curl -X POST "http://localhost:3000/api/ai-agentic/documents/upload" \
  -H "Content-Type: multipart/form-data" \
  -F "document=@company-brochure.pdf" \
  -F "companyProfileId=profile-id" \
  -F "documentType=company_brochure" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

### **Test Enhanced Prompts:**
```bash
curl -X GET "http://localhost:3000/api/ai-agentic/prompts" \
  -H "Content-Type: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

## 🎉 Confirmation Criteria

The AI agents are properly customized when:

1. ✅ **Form Data Integration**: Company information appears in generated prompts
2. ✅ **Document Analysis**: PDF insights enhance prompt customization  
3. ✅ **Industry Specificity**: Terminology matches user's business sector
4. ✅ **Agent Differentiation**: Each agent has unique, role-specific prompts
5. ✅ **Business Context**: Value propositions and competitive advantages included
6. ✅ **Multi-Source Synthesis**: Both form and document data combined effectively

When all criteria are met, the AI agents are successfully customized based on comprehensive user information from the onboarding process.
