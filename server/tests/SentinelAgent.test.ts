import { SentinelAgent } from '../ai-agents/agents/SentinelAgent';
import { GmailService } from '../services/GmailService';
import { GoogleCalendarService } from '../services/GoogleCalendarService';

// Mock the services
jest.mock('../services/GmailService');
jest.mock('../services/GoogleCalendarService');
jest.mock('../db', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  },
}));

// Mock OpenAI
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('SentinelAgent - Gmail Integration', () => {
  let sentinelAgent: SentinelAgent;
  let mockGmailService: jest.Mocked<GmailService>;

  beforeEach(() => {
    // Set up environment variables for testing
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.GMAIL_CLIENT_ID = 'test-gmail-client-id';
    process.env.GMAIL_CLIENT_SECRET = 'test-gmail-client-secret';
    process.env.GMAIL_REFRESH_TOKEN = 'test-gmail-refresh-token';

    // Create mocked Gmail service
    mockGmailService = {
      testConnection: jest.fn(),
      getNewEmails: jest.fn(),
      getMessageById: jest.fn(),
      getThreadById: jest.fn(),
      extractEmailContent: jest.fn(),
      sendEmail: jest.fn(),
      markAsRead: jest.fn(),
    } as any;

    // Mock the GmailService constructor
    (GmailService as jest.MockedClass<typeof GmailService>).mockImplementation(() => mockGmailService);

    sentinelAgent = new SentinelAgent();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Gmail Service Initialization', () => {
    it('should initialize Gmail service when credentials are provided', () => {
      expect(GmailService).toHaveBeenCalledWith({
        clientId: 'test-gmail-client-id',
        clientSecret: 'test-gmail-client-secret',
        refreshToken: 'test-gmail-refresh-token',
      });
    });

    it('should not initialize Gmail service when credentials are missing', () => {
      delete process.env.GMAIL_CLIENT_ID;
      const agentWithoutCredentials = new SentinelAgent();
      
      // The agent should still be created but without Gmail service
      expect(agentWithoutCredentials).toBeDefined();
    });
  });

  describe('Email Monitoring', () => {
    it('should fetch new emails using Gmail API', async () => {
      const mockEmails = [
        {
          id: 'test-email-1',
          threadId: 'test-thread-1',
          payload: {
            headers: [
              { name: 'From', value: 'test@example.com' },
              { name: 'Subject', value: 'Test Email' },
            ],
          },
          internalDate: Date.now().toString(),
        },
      ];

      const mockEmailContent = {
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test Email',
        textBody: 'Test email body',
        htmlBody: '',
        date: new Date().toISOString(),
      };

      mockGmailService.getNewEmails.mockResolvedValue(mockEmails);
      mockGmailService.extractEmailContent.mockReturnValue(mockEmailContent);

      // Create a test job for email monitoring
      const testJob = {
        id: 'test-job-1',
        userId: 'test-user-1',
        jobType: 'email_monitoring' as const,
        inputData: {},
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const result = await sentinelAgent.process(testJob);

      expect(result.success).toBe(true);
      expect(mockGmailService.getNewEmails).toHaveBeenCalledWith(
        expect.any(Date),
        {
          maxResults: 20,
          includeSpamTrash: false,
        }
      );
    });

    it('should handle Gmail API errors gracefully', async () => {
      mockGmailService.getNewEmails.mockRejectedValue(new Error('Gmail API error'));

      const testJob = {
        id: 'test-job-1',
        userId: 'test-user-1',
        jobType: 'email_monitoring' as const,
        inputData: {},
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const result = await sentinelAgent.process(testJob);

      expect(result.success).toBe(true);
      expect(result.data.emailsProcessed).toBe(0);
    });

    it('should skip monitoring when Gmail service is not configured', async () => {
      // Create agent without credentials
      delete process.env.GMAIL_CLIENT_ID;
      const agentWithoutGmail = new SentinelAgent();

      const testJob = {
        id: 'test-job-1',
        userId: 'test-user-1',
        jobType: 'email_monitoring' as const,
        inputData: {},
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const result = await agentWithoutGmail.process(testJob);

      expect(result.success).toBe(true);
      expect(result.data.emailsProcessed).toBe(0);
    });
  });

  describe('Gmail Connection Testing', () => {
    it('should test Gmail connection successfully', async () => {
      mockGmailService.testConnection.mockResolvedValue({
        connected: true,
        status: 'Connected to Gmail API for test@example.com',
      });

      const testJob = {
        id: 'test-job-1',
        userId: 'test-user-1',
        jobType: 'email_automation' as const,
        inputData: {},
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const result = await sentinelAgent.process(testJob);

      expect(result.success).toBe(true);
      expect(mockGmailService.testConnection).toHaveBeenCalled();
      expect(result.data.configuration.gmailConnected).toBe(true);
    });

    it('should handle Gmail connection failure', async () => {
      mockGmailService.testConnection.mockResolvedValue({
        connected: false,
        status: 'Gmail API authentication failed',
        error: 'Invalid credentials',
      });

      const testJob = {
        id: 'test-job-1',
        userId: 'test-user-1',
        jobType: 'email_automation' as const,
        inputData: {},
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const result = await sentinelAgent.process(testJob);

      expect(result.success).toBe(true);
      expect(result.data.configuration.gmailConnected).toBe(false);
    });
  });

  describe('Thread Processing', () => {
    it('should fetch complete email threads using Gmail API', async () => {
      const mockThread = {
        id: 'test-thread-1',
        messages: [
          {
            id: 'msg-1',
            threadId: 'test-thread-1',
            payload: {
              headers: [
                { name: 'From', value: 'sender@example.com' },
                { name: 'Subject', value: 'Test Thread' },
              ],
            },
            internalDate: Date.now().toString(),
          },
        ],
      };

      const mockEmailContent = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Thread',
        textBody: 'Thread message content',
        htmlBody: '',
        date: new Date().toISOString(),
      };

      mockGmailService.getThreadById.mockResolvedValue(mockThread);
      mockGmailService.extractEmailContent.mockReturnValue(mockEmailContent);

      // Test the private method through email monitoring
      const testJob = {
        id: 'test-job-1',
        userId: 'test-user-1',
        jobType: 'email_monitoring' as const,
        inputData: {},
        status: 'pending' as const,
        createdAt: new Date(),
      };

      // Mock getNewEmails to return an email that will trigger thread processing
      mockGmailService.getNewEmails.mockResolvedValue([
        {
          id: 'test-email-1',
          threadId: 'test-thread-1',
          payload: {
            headers: [
              { name: 'From', value: 'external@example.com' },
              { name: 'Subject', value: 'Sales Inquiry' },
            ],
          },
          internalDate: Date.now().toString(),
        },
      ]);

      await sentinelAgent.process(testJob);

      expect(mockGmailService.getThreadById).toHaveBeenCalledWith('test-thread-1');
    });

    it('should handle thread fetch errors gracefully', async () => {
      mockGmailService.getThreadById.mockRejectedValue(new Error('Thread not found'));

      const testJob = {
        id: 'test-job-1',
        userId: 'test-user-1',
        jobType: 'email_monitoring' as const,
        inputData: {},
        status: 'pending' as const,
        createdAt: new Date(),
      };

      mockGmailService.getNewEmails.mockResolvedValue([
        {
          id: 'test-email-1',
          threadId: 'invalid-thread',
          payload: {
            headers: [
              { name: 'From', value: 'external@example.com' },
            ],
          },
          internalDate: Date.now().toString(),
        },
      ]);

      const result = await sentinelAgent.process(testJob);

      expect(result.success).toBe(true);
      // Should continue processing despite thread fetch error
    });
  });

  describe('Error Handling and Rate Limiting', () => {
    it('should handle authentication errors', async () => {
      const authError = new Error('Gmail API authentication failed. Please check credentials.');
      mockGmailService.getNewEmails.mockRejectedValue(authError);

      const testJob = {
        id: 'test-job-1',
        userId: 'test-user-1',
        jobType: 'email_monitoring' as const,
        inputData: {},
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const result = await sentinelAgent.process(testJob);

      expect(result.success).toBe(true);
      expect(result.data.emailsProcessed).toBe(0);
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Gmail API rate limit exceeded. Please try again later.');
      mockGmailService.getNewEmails.mockRejectedValue(rateLimitError);

      const testJob = {
        id: 'test-job-1',
        userId: 'test-user-1',
        jobType: 'email_monitoring' as const,
        inputData: {},
        status: 'pending' as const,
        createdAt: new Date(),
      };

      const result = await sentinelAgent.process(testJob);

      expect(result.success).toBe(true);
      expect(result.data.emailsProcessed).toBe(0);
    });
  });
});
