import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SentinelAgent } from '../ai-agents/agents/SentinelAgent.js';
import { EmailMonitoringManager } from '../services/EmailMonitoringManager.js';

// Mock external dependencies
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

const mockGmailService = {
  getNewEmails: jest.fn(),
  getThreadById: jest.fn(),
  sendEmail: jest.fn(),
  testConnection: jest.fn(),
  extractEmailContent: jest.fn(),
};

const mockSupabase = {
  from: jest.fn(() => ({
    upsert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  }))
};

// Mock modules
jest.mock('openai', () => {
  return jest.fn(() => mockOpenAI);
});

jest.mock('../services/GmailService.js', () => ({
  GmailService: jest.fn(() => mockGmailService)
}));

jest.mock('../db.js', () => ({
  supabase: mockSupabase
}));

describe('Sentinel Email Monitoring Integration', () => {
  let sentinelAgent: SentinelAgent;
  let monitoringManager: EmailMonitoringManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GMAIL_CLIENT_ID = 'test-client-id';
    process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
    process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token';

    sentinelAgent = new SentinelAgent();
    monitoringManager = EmailMonitoringManager.getInstance();
  });

  afterEach(async () => {
    await monitoringManager.shutdown();
    jest.resetAllMocks();
  });

  describe('Email Monitoring Workflow', () => {
    it('should process complete email monitoring workflow', async () => {
      const userId = 'test-user-123';
      const mockEmails = [
        {
          id: 'msg123',
          threadId: 'thread123',
          From: 'customer@example.com',
          To: 'business@company.com',
          Subject: 'Inquiry about your services',
          Body: 'I am interested in learning more about your services.',
          Date: new Date().toISOString(),
        }
      ];

      const mockThread = {
        threadId: 'thread123',
        emails: [
          {
            dateTime: new Date().toISOString(),
            from: 'customer@example.com',
            message: 'I am interested in learning more about your services.',
            subject: 'Inquiry about your services',
            messageId: 'msg123',
          }
        ]
      };

      const mockReformattedThread = {
        newProspectEmail: 'I am interested in learning more about your services.',
        previousEmails: ''
      };

      // Mock Gmail service responses
      mockGmailService.getNewEmails.mockResolvedValue(mockEmails);
      mockGmailService.getThreadById.mockResolvedValue({
        messages: [
          {
            id: 'msg123',
            internalDate: Date.now().toString(),
          }
        ]
      });
      mockGmailService.extractEmailContent.mockReturnValue({
        from: 'customer@example.com',
        subject: 'Inquiry about your services',
        textBody: 'I am interested in learning more about your services.',
        date: new Date().toISOString(),
      });

      // Mock OpenAI responses
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockReformattedThread) } }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ decision: 'Sales' }) } }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify({ calendar: false, reasoning: 'Information request' }) } }]
        });

      // Mock database responses
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: { id: 'thread123' },
        error: null
      });

      // Create monitoring job
      const job = {
        id: 'job123',
        userId,
        jobType: 'email_monitoring',
        inputData: {
          checkInterval: 1,
          automated: true,
        },
        createdAt: new Date().toISOString(),
      };

      // Process the job
      const result = await sentinelAgent.processJob(job);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.data.emailsProcessed).toBe(1);
      expect(result.data.results).toHaveLength(1);

      // Verify Gmail API was called
      expect(mockGmailService.getNewEmails).toHaveBeenCalled();
      expect(mockGmailService.getThreadById).toHaveBeenCalledWith('thread123');

      // Verify OpenAI was called for classification
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);

      // Verify database operations
      expect(mockSupabase.from).toHaveBeenCalledWith('email_threads');
      expect(mockSupabase.from).toHaveBeenCalledWith('email_messages');
    });

    it('should handle email response generation workflow', async () => {
      const userId = 'test-user-123';
      const threadId = 'thread123';

      const mockThread = {
        threadId,
        emails: [
          {
            dateTime: new Date().toISOString(),
            from: 'customer@example.com',
            message: 'I would like to schedule a consultation.',
            subject: 'Consultation Request',
          }
        ]
      };

      const mockResponseData = {
        subject: 'Re: Consultation Request',
        body: 'Thank you for your interest. I would be happy to schedule a consultation with you.',
        tone: 'professional',
        confidence: 0.85,
        requiresApproval: true,
      };

      // Mock Gmail service
      mockGmailService.getThreadById.mockResolvedValue({
        messages: [
          {
            id: 'msg123',
            internalDate: Date.now().toString(),
          }
        ]
      });
      mockGmailService.extractEmailContent.mockReturnValue({
        from: 'customer@example.com',
        subject: 'Consultation Request',
        textBody: 'I would like to schedule a consultation.',
      });

      // Mock OpenAI response generation
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponseData) } }]
      });

      // Mock database save
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'response123' },
        error: null
      });

      // Create email response job
      const job = {
        id: 'job456',
        userId,
        jobType: 'email_response',
        inputData: {
          threadId,
          messageId: 'msg123',
          responseType: 'sales_inquiry',
          userApproval: false, // Requires approval
        },
        createdAt: new Date().toISOString(),
      };

      // Process the job
      const result = await sentinelAgent.processJob(job);

      // Verify the result
      expect(result.success).toBe(true);
      expect(result.data.message).toContain('awaiting your approval');
      expect(result.data.requiresApproval).toBe(true);
      expect(result.data.responseId).toBe('response123');

      // Verify OpenAI was called for response generation
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();

      // Verify response was saved to database
      expect(mockSupabase.from).toHaveBeenCalledWith('email_responses');
    });

    it('should handle calendar booking workflow', async () => {
      const userId = 'test-user-123';

      // Create calendar booking job
      const job = {
        id: 'job789',
        userId,
        jobType: 'calendar_booking',
        inputData: {
          emailAddress: 'customer@example.com',
          requestedDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 30,
          eventType: 'consultation',
        },
        createdAt: new Date().toISOString(),
      };

      // Mock user email lookup
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { email: 'business@company.com' },
        error: null
      });

      // Process the job
      const result = await sentinelAgent.processJob(job);

      // Verify the result
      expect(result.success).toBe(false); // Should be false since Google Calendar not configured
      expect(result.data.message).toContain('Placeholder reminder created');
      expect(result.data.isPlaceholder).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle Gmail API errors gracefully', async () => {
      const userId = 'test-user-123';

      // Mock Gmail API error
      mockGmailService.getNewEmails.mockRejectedValue(new Error('Gmail API rate limit exceeded'));

      const job = {
        id: 'job123',
        userId,
        jobType: 'email_monitoring',
        inputData: { checkInterval: 1 },
        createdAt: new Date().toISOString(),
      };

      const result = await sentinelAgent.processJob(job);

      // Should still succeed but with 0 emails processed
      expect(result.success).toBe(true);
      expect(result.data.emailsProcessed).toBe(0);
    });

    it('should handle OpenAI API errors', async () => {
      const userId = 'test-user-123';
      const threadId = 'thread123';

      // Mock OpenAI error
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));

      const job = {
        id: 'job456',
        userId,
        jobType: 'email_response',
        inputData: {
          threadId,
          messageId: 'msg123',
          responseType: 'sales_inquiry',
        },
        createdAt: new Date().toISOString(),
      };

      // Should throw error since OpenAI is required for response generation
      await expect(sentinelAgent.processJob(job)).rejects.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      const userId = 'test-user-123';

      // Mock database error
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const mockEmails = [
        {
          id: 'msg123',
          threadId: 'thread123',
          From: 'customer@example.com',
          Subject: 'Test',
          Body: 'Test message',
        }
      ];

      mockGmailService.getNewEmails.mockResolvedValue(mockEmails);

      const job = {
        id: 'job123',
        userId,
        jobType: 'email_monitoring',
        inputData: { checkInterval: 1 },
        createdAt: new Date().toISOString(),
      };

      // Should continue processing even with database errors
      const result = await sentinelAgent.processJob(job);
      expect(result.success).toBe(true);
    });
  });
});
