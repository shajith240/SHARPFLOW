import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { FalconAgent } from "../ai-agents/agents/FalconAgent";
import { SageAgent } from "../ai-agents/agents/SageAgent";
import { SentinelAgent } from "../ai-agents/agents/SentinelAgent";
import type { AgentJob, AgentResult } from "../ai-agents/types/index";

describe("Two-Stage OpenAI Integration", () => {
  let falconAgent: FalconAgent;
  let sageAgent: SageAgent;
  let sentinelAgent: SentinelAgent;

  beforeEach(() => {
    falconAgent = new FalconAgent();
    sageAgent = new SageAgent();
    sentinelAgent = new SentinelAgent();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe("Stage 1 - Acknowledgment Messages", () => {
    it("should generate contextual acknowledgment for Falcon lead generation", async () => {
      const job: AgentJob = {
        id: "test-job-1",
        userId: "test-user",
        agentName: "falcon",
        jobType: "lead_generation",
        status: "processing",
        progress: 0,
        inputData: {
          location: "San Francisco",
          businessType: "SaaS",
          jobTitles: ["CEO", "CTO"],
          companySize: "1-50",
        },
        createdAt: new Date(),
      };

      const originalMessage = "Find me 50 SaaS CEOs in San Francisco";

      const acknowledgment = await falconAgent.generateAcknowledgmentMessage(
        job,
        originalMessage
      );

      expect(acknowledgment).toBeTruthy();
      expect(acknowledgment.length).toBeGreaterThan(10);
      expect(acknowledgment.toLowerCase()).toContain("lead");
      console.log("Falcon Acknowledgment:", acknowledgment);
    });

    it("should generate contextual acknowledgment for Sage research", async () => {
      const job: AgentJob = {
        id: "test-job-2",
        userId: "test-user",
        agentName: "sage",
        jobType: "linkedin_research",
        status: "processing",
        progress: 0,
        inputData: {
          linkedinUrl: "https://linkedin.com/in/johndoe",
        },
        createdAt: new Date(),
      };

      const originalMessage =
        "Research this LinkedIn profile: https://linkedin.com/in/johndoe";

      const acknowledgment = await sageAgent.generateAcknowledgmentMessage(
        job,
        originalMessage
      );

      expect(acknowledgment).toBeTruthy();
      expect(acknowledgment.length).toBeGreaterThan(10);
      expect(acknowledgment.toLowerCase()).toContain("research");
      console.log("Sage Acknowledgment:", acknowledgment);
    });

    it("should generate contextual acknowledgment for Sentinel reminder", async () => {
      const job: AgentJob = {
        id: "test-job-3",
        userId: "test-user",
        agentName: "sentinel",
        jobType: "reminder",
        status: "processing",
        progress: 0,
        inputData: {
          reminderText: "Call mom",
          reminderTime: "2024-01-15T18:00:00Z",
        },
        createdAt: new Date(),
      };

      const originalMessage = "Set a reminder to call mom tomorrow at 6 PM";

      const acknowledgment = await sentinelAgent.generateAcknowledgmentMessage(
        job,
        originalMessage
      );

      expect(acknowledgment).toBeTruthy();
      expect(acknowledgment.length).toBeGreaterThan(10);
      expect(acknowledgment.toLowerCase()).toContain("reminder");
      console.log("Sentinel Acknowledgment:", acknowledgment);
    });
  });

  describe("Stage 2 - Completion Messages", () => {
    it("should generate contextual completion for successful Falcon job", async () => {
      const job: AgentJob = {
        id: "test-job-4",
        userId: "test-user",
        agentName: "falcon",
        jobType: "lead_generation",
        status: "completed",
        progress: 100,
        inputData: {
          location: "San Francisco",
          businessType: "SaaS",
        },
        createdAt: new Date(),
      };

      const result: AgentResult = {
        success: true,
        data: {
          leadsGenerated: 25,
          leadsProcessed: 30,
          duplicatesRemoved: 5,
        },
      };

      const originalMessage = "Find me SaaS leads in San Francisco";

      const completion = await falconAgent.generateCompletionMessage(
        job,
        result,
        originalMessage
      );

      expect(completion).toBeTruthy();
      expect(completion.length).toBeGreaterThan(10);
      expect(completion.toLowerCase()).toContain("25");
      console.log("Falcon Completion:", completion);
    });

    it("should generate contextual completion for failed job", async () => {
      const job: AgentJob = {
        id: "test-job-5",
        userId: "test-user",
        agentName: "sage",
        jobType: "linkedin_research",
        status: "failed",
        progress: 0,
        inputData: {
          linkedinUrl: "https://linkedin.com/in/invalid",
        },
        createdAt: new Date(),
      };

      const result: AgentResult = {
        success: false,
        error: "LinkedIn profile not found or private",
      };

      const originalMessage =
        "Research this LinkedIn profile: https://linkedin.com/in/invalid";

      const completion = await sageAgent.generateCompletionMessage(
        job,
        result,
        originalMessage
      );

      expect(completion).toBeTruthy();
      expect(completion.length).toBeGreaterThan(10);
      expect(completion.toLowerCase()).toContain("issue");
      console.log("Sage Error Completion:", completion);
    });
  });

  describe("Fallback Messages", () => {
    it("should provide fallback acknowledgment when OpenAI is not available", async () => {
      // Temporarily disable OpenAI by setting the client to null
      const originalOpenAI = (falconAgent as any).openai;
      (falconAgent as any).openai = null;

      const job: AgentJob = {
        id: "test-job-6",
        userId: "test-user",
        agentName: "falcon",
        jobType: "lead_generation",
        status: "processing",
        progress: 0,
        inputData: {},
        createdAt: new Date(),
      };

      const acknowledgment = await falconAgent.generateAcknowledgmentMessage(
        job,
        "Test message"
      );

      expect(acknowledgment).toBeTruthy();
      expect(acknowledgment).toContain("lead generation");
      console.log("Falcon Fallback Acknowledgment:", acknowledgment);

      // Restore OpenAI client
      (falconAgent as any).openai = originalOpenAI;
    });
  });
});
