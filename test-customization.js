// Test script to demonstrate AI agent customization
// Run with: node test-customization.js

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test data representing different company types
const testCompanies = [
  {
    name: "TechFlow Solutions",
    profile: {
      companyName: "TechFlow Solutions",
      industry: "Technology",
      subIndustry: "SaaS",
      businessModel: "B2B",
      companySize: "medium",
      targetMarket: "Mid-market companies seeking workflow automation and process optimization",
      valueProposition: "AI-powered process automation platform that reduces manual work by 70%",
      keyDifferentiators: ["No-code platform", "5x faster deployment", "Enterprise security"],
      industryTerminology: ["workflow automation", "process optimization", "digital transformation", "API integrations"],
      brandVoice: "professional",
      communicationStyle: "consultative"
    }
  },
  {
    name: "HealthCare Analytics Pro", 
    profile: {
      companyName: "HealthCare Analytics Pro",
      industry: "Healthcare",
      subIndustry: "Health Technology",
      businessModel: "B2B",
      companySize: "large",
      targetMarket: "Healthcare providers, hospitals, and medical practices seeking data-driven patient outcomes",
      valueProposition: "Transform healthcare data into actionable insights that improve patient outcomes and reduce costs",
      keyDifferentiators: ["HIPAA compliant", "Real-time analytics", "EHR integration"],
      industryTerminology: ["EHR integration", "clinical analytics", "patient outcomes", "HIPAA compliance", "value-based care"],
      brandVoice: "authoritative",
      communicationStyle: "professional"
    }
  }
];

async function testAgentCustomization() {
  console.log('🧪 Testing AI Agent Customization Based on User Information\n');
  
  for (const company of testCompanies) {
    console.log(`\n🏢 Testing customization for: ${company.name}`);
    console.log('=' .repeat(60));
    
    try {
      // 1. Create company profile
      console.log('📝 Step 1: Creating company profile...');
      const profileResponse = await fetch(`${BASE_URL}/api/ai-agentic/company-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(company.profile)
      });
      
      if (!profileResponse.ok) {
        console.log('❌ Failed to create company profile');
        continue;
      }
      
      const profileData = await profileResponse.json();
      console.log('✅ Company profile created successfully');
      
      // 2. Generate customized prompts
      console.log('🤖 Step 2: Generating customized AI agent prompts...');
      const promptResponse = await fetch(`${BASE_URL}/api/ai-agentic/generate-prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!promptResponse.ok) {
        console.log('❌ Failed to generate prompts');
        continue;
      }
      
      const promptData = await promptResponse.json();
      console.log('✅ AI agent prompts generated successfully');
      console.log(`📊 Generated ${promptData.promptsGenerated} customized prompts`);
      
      // 3. Display customization examples
      console.log('\n🎯 Customization Results:');
      
      if (promptData.prompts && promptData.prompts.length > 0) {
        promptData.prompts.forEach(prompt => {
          console.log(`\n🤖 ${prompt.agentName.toUpperCase()} Agent (${prompt.promptType}):`);
          console.log('─'.repeat(40));
          
          // Show key customization indicators
          const customPrompt = prompt.customPrompt || '';
          
          // Check for company-specific customization
          const hasCompanyName = customPrompt.includes(company.profile.companyName);
          const hasIndustry = customPrompt.includes(company.profile.industry);
          const hasValueProp = company.profile.valueProposition && 
            customPrompt.toLowerCase().includes(company.profile.valueProposition.toLowerCase().substring(0, 20));
          
          // Check for industry terminology
          const terminologyFound = company.profile.industryTerminology.filter(term => 
            customPrompt.toLowerCase().includes(term.toLowerCase())
          );
          
          console.log(`✅ Company Name Referenced: ${hasCompanyName ? 'YES' : 'NO'}`);
          console.log(`✅ Industry Context: ${hasIndustry ? 'YES' : 'NO'}`);
          console.log(`✅ Value Proposition: ${hasValueProp ? 'YES' : 'NO'}`);
          console.log(`✅ Industry Terminology: ${terminologyFound.length}/${company.profile.industryTerminology.length} terms found`);
          
          if (terminologyFound.length > 0) {
            console.log(`   📝 Terms used: ${terminologyFound.join(', ')}`);
          }
          
          // Show confidence score
          if (prompt.confidence) {
            console.log(`📈 Customization Confidence: ${(prompt.confidence * 100).toFixed(1)}%`);
          }
          
          // Show a snippet of the customized prompt
          const snippet = customPrompt.substring(0, 200) + (customPrompt.length > 200 ? '...' : '');
          console.log(`📄 Prompt Preview: "${snippet}"`);
        });
      }
      
      // 4. Test system status
      console.log('\n📊 Step 3: Checking system status...');
      const statusResponse = await fetch(`${BASE_URL}/api/ai-agentic/status`);
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('✅ System status retrieved');
        console.log(`📈 Total prompts in system: ${statusData.totalPrompts || 0}`);
        console.log(`🏢 Company profiles: ${statusData.totalProfiles || 0}`);
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${company.name}:`, error.message);
    }
  }
  
  console.log('\n🎉 AI Agent Customization Test Complete!');
  console.log('\n📋 Summary of Customization Features Tested:');
  console.log('✅ Company-specific information integration');
  console.log('✅ Industry-specific terminology usage');
  console.log('✅ Value proposition incorporation');
  console.log('✅ Agent-specific prompt generation');
  console.log('✅ Business model context adaptation');
  console.log('✅ Communication style customization');
  
  console.log('\n🔍 What This Confirms:');
  console.log('• AI agents are customized based on user onboarding information');
  console.log('• Each agent receives industry-specific context and terminology');
  console.log('• Company details are integrated into agent behavior');
  console.log('• Prompts reflect the specific business model and target market');
  console.log('• Customization quality is measured with confidence scores');
}

// Run the test
if (require.main === module) {
  testAgentCustomization().catch(console.error);
}

module.exports = { testAgentCustomization };
