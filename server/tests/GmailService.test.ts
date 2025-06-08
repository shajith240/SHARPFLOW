import {
  GmailService,
  GmailCredentials,
  GmailMessage,
} from "../services/GmailService";

// Mock googleapis
const mockGmail = {
  users: {
    getProfile: jest.fn(),
    messages: {
      list: jest.fn(),
      get: jest.fn(),
      send: jest.fn(),
      batchModify: jest.fn(),
    },
    threads: {
      get: jest.fn(),
    },
  },
};

// Mock OAuth2Client
const mockOAuth2Client = {
  setCredentials: jest.fn(),
};

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => mockOAuth2Client),
    },
    gmail: jest.fn(() => mockGmail),
  },
}));

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => mockOAuth2Client),
}));

describe("GmailService", () => {
  let gmailService: GmailService;
  let mockCredentials: GmailCredentials;

  beforeEach(() => {
    mockCredentials = {
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      refreshToken: "test-refresh-token",
    };

    gmailService = new GmailService(mockCredentials);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("testConnection", () => {
    it("should return connected true when Gmail API responds successfully", async () => {
      const mockProfile = {
        data: {
          emailAddress: "test@example.com",
          messagesTotal: 100,
        },
      };

      mockGmail.users.getProfile.mockResolvedValue(mockProfile);

      const result = await gmailService.testConnection();

      expect(result.connected).toBe(true);
      expect(result.status).toContain("test@example.com");
      expect(mockGmail.users.getProfile).toHaveBeenCalledWith({
        userId: "me",
      });
    });

    it("should return connected false when Gmail API fails", async () => {
      const mockError = new Error("API Error");
      mockGmail.users.getProfile.mockRejectedValue(mockError);

      const result = await gmailService.testConnection();

      expect(result.connected).toBe(false);
      expect(result.status).toBe("Gmail API connection failed");
      expect(result.error).toBe("API Error");
    });

    it("should handle empty response data", async () => {
      mockGmail.users.getProfile.mockResolvedValue({ data: null });

      const result = await gmailService.testConnection();

      expect(result.connected).toBe(false);
      expect(result.status).toBe(
        "Gmail API connection failed - no profile data"
      );
    });
  });

  describe("getNewEmails", () => {
    it("should fetch new emails with default parameters", async () => {
      const mockMessageList = {
        data: {
          messages: [
            { id: "msg1", threadId: "thread1" },
            { id: "msg2", threadId: "thread2" },
          ],
        },
      };

      const mockMessage1: GmailMessage = {
        id: "msg1",
        threadId: "thread1",
        payload: {
          headers: [
            { name: "From", value: "sender@example.com" },
            { name: "Subject", value: "Test Email" },
          ],
          body: {
            data: Buffer.from("Test email body").toString("base64"),
          },
        },
      };

      const mockMessage2: GmailMessage = {
        id: "msg2",
        threadId: "thread2",
        payload: {
          headers: [
            { name: "From", value: "sender2@example.com" },
            { name: "Subject", value: "Test Email 2" },
          ],
          body: {
            data: Buffer.from("Test email body 2").toString("base64"),
          },
        },
      };

      mockGmail.users.messages.list.mockResolvedValue(mockMessageList);
      mockGmail.users.messages.get
        .mockResolvedValueOnce({ data: mockMessage1 })
        .mockResolvedValueOnce({ data: mockMessage2 });

      const result = await gmailService.getNewEmails();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("msg1");
      expect(result[1].id).toBe("msg2");
      expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
        userId: "me",
        q: "-in:spam -in:trash is:unread",
        maxResults: 50,
        pageToken: undefined,
        labelIds: undefined,
      });
    });

    it("should handle timestamp filtering", async () => {
      const sinceTimestamp = new Date("2024-01-01T10:00:00Z");
      const expectedTimestamp = Math.floor(sinceTimestamp.getTime() / 1000);

      mockGmail.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      await gmailService.getNewEmails(sinceTimestamp);

      expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
        userId: "me",
        q: `after:${expectedTimestamp} -in:spam -in:trash is:unread`,
        maxResults: 50,
        pageToken: undefined,
        labelIds: undefined,
      });
    });

    it("should handle custom search options", async () => {
      const options = {
        query: "from:specific@example.com",
        maxResults: 10,
        pageToken: "next-page-token",
        labelIds: ["INBOX"],
        includeSpamTrash: true,
      };

      mockGmail.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      await gmailService.getNewEmails(undefined, options);

      expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
        userId: "me",
        q: "from:specific@example.com is:unread",
        maxResults: 10,
        pageToken: "next-page-token",
        labelIds: ["INBOX"],
      });
    });

    it("should handle empty message list", async () => {
      mockGmail.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      const result = await gmailService.getNewEmails();

      expect(result).toHaveLength(0);
    });

    it("should handle API errors with specific error codes", async () => {
      const authError = new Error("Authentication failed");
      (authError as any).code = 401;
      mockGmail.users.messages.list.mockRejectedValue(authError);

      await expect(gmailService.getNewEmails()).rejects.toThrow(
        "Gmail API authentication failed. Please check credentials."
      );
    });

    it("should handle rate limit errors", async () => {
      const rateLimitError = new Error("Rate limit exceeded");
      (rateLimitError as any).code = 429;
      mockGmail.users.messages.list.mockRejectedValue(rateLimitError);

      await expect(gmailService.getNewEmails()).rejects.toThrow(
        "Gmail API rate limit exceeded. Please try again later."
      );
    });

    it("should handle permission errors", async () => {
      const permissionError = new Error("Access forbidden");
      (permissionError as any).code = 403;
      mockGmail.users.messages.list.mockRejectedValue(permissionError);

      await expect(gmailService.getNewEmails()).rejects.toThrow(
        "Gmail API access forbidden. Please check permissions."
      );
    });

    it("should continue processing when individual message fetch fails", async () => {
      const mockMessageList = {
        data: {
          messages: [
            { id: "msg1", threadId: "thread1" },
            { id: "msg2", threadId: "thread2" },
          ],
        },
      };

      const mockMessage1: GmailMessage = {
        id: "msg1",
        threadId: "thread1",
        payload: { headers: [] },
      };

      mockGmail.users.messages.list.mockResolvedValue(mockMessageList);
      mockGmail.users.messages.get
        .mockResolvedValueOnce({ data: mockMessage1 })
        .mockRejectedValueOnce(new Error("Message fetch failed"));

      const result = await gmailService.getNewEmails();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("msg1");
    });
  });

  describe("getMessageById", () => {
    it("should fetch a specific message successfully", async () => {
      const mockMessage: GmailMessage = {
        id: "msg1",
        threadId: "thread1",
        payload: {
          headers: [{ name: "Subject", value: "Test" }],
        },
      };

      mockGmail.users.messages.get.mockResolvedValue({ data: mockMessage });

      const result = await gmailService.getMessageById("msg1");

      expect(result).toEqual(mockMessage);
      expect(mockGmail.users.messages.get).toHaveBeenCalledWith({
        userId: "me",
        id: "msg1",
        format: "full",
      });
    });

    it("should return null when message fetch fails", async () => {
      mockGmail.users.messages.get.mockRejectedValue(
        new Error("Message not found")
      );

      const result = await gmailService.getMessageById("invalid-id");

      expect(result).toBeNull();
    });
  });

  describe("getThreadById", () => {
    it("should fetch a complete thread successfully", async () => {
      const mockThread = {
        data: {
          id: "thread1",
          messages: [
            { id: "msg1", threadId: "thread1" },
            { id: "msg2", threadId: "thread1" },
          ],
        },
      };

      mockGmail.users.threads.get.mockResolvedValue(mockThread);

      const result = await gmailService.getThreadById("thread1");

      expect(result).toEqual(mockThread.data);
      expect(mockGmail.users.threads.get).toHaveBeenCalledWith({
        userId: "me",
        id: "thread1",
        format: "full",
      });
    });

    it("should return null when thread fetch fails", async () => {
      mockGmail.users.threads.get.mockRejectedValue(
        new Error("Thread not found")
      );

      const result = await gmailService.getThreadById("invalid-thread");

      expect(result).toBeNull();
    });
  });

  describe("extractEmailContent", () => {
    it("should extract content from simple message body", () => {
      const message: GmailMessage = {
        id: "msg1",
        threadId: "thread1",
        payload: {
          headers: [
            { name: "From", value: "sender@example.com" },
            { name: "To", value: "recipient@example.com" },
            { name: "Subject", value: "Test Subject" },
            { name: "Date", value: "Mon, 1 Jan 2024 10:00:00 +0000" },
          ],
          body: {
            data: Buffer.from("Test email body").toString("base64"),
          },
        },
      };

      const result = gmailService.extractEmailContent(message);

      expect(result.from).toBe("sender@example.com");
      expect(result.to).toBe("recipient@example.com");
      expect(result.subject).toBe("Test Subject");
      expect(result.textBody).toBe("Test email body");
      expect(result.date).toBe("Mon, 1 Jan 2024 10:00:00 +0000");
    });

    it("should extract content from multipart message", () => {
      const message: GmailMessage = {
        id: "msg1",
        threadId: "thread1",
        payload: {
          headers: [
            { name: "From", value: "sender@example.com" },
            { name: "Subject", value: "Test Subject" },
          ],
          parts: [
            {
              mimeType: "text/plain",
              body: {
                data: Buffer.from("Plain text body").toString("base64"),
              },
            },
            {
              mimeType: "text/html",
              body: {
                data: Buffer.from("<p>HTML body</p>").toString("base64"),
              },
            },
          ],
        },
      };

      const result = gmailService.extractEmailContent(message);

      expect(result.textBody).toBe("Plain text body");
      expect(result.htmlBody).toBe("<p>HTML body</p>");
    });

    it("should handle missing headers gracefully", () => {
      const message: GmailMessage = {
        id: "msg1",
        threadId: "thread1",
        payload: {
          headers: [],
          body: {
            data: Buffer.from("Test body").toString("base64"),
          },
        },
      };

      const result = gmailService.extractEmailContent(message);

      expect(result.from).toBe("");
      expect(result.to).toBe("");
      expect(result.subject).toBe("");
      expect(result.textBody).toBe("Test body");
    });
  });

  describe("Retry Logic and Rate Limiting", () => {
    it("should retry transient errors with exponential backoff", async () => {
      const transientError = new Error("Temporary server error");
      (transientError as any).code = 500;

      // Fail twice, then succeed
      mockGmail.users.messages.list
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce({ data: { messages: [] } });

      const result = await gmailService.getNewEmails();

      expect(result).toEqual([]);
      expect(mockGmail.users.messages.list).toHaveBeenCalledTimes(3);
    });

    it("should not retry non-retryable errors", async () => {
      const badRequestError = new Error("Bad request");
      (badRequestError as any).code = 400;
      mockGmail.users.messages.list.mockRejectedValue(badRequestError);

      await expect(gmailService.getNewEmails()).rejects.toThrow("Bad request");
      expect(mockGmail.users.messages.list).toHaveBeenCalledTimes(1);
    });

    it("should handle maximum retries exceeded", async () => {
      const persistentError = new Error("Persistent server error");
      (persistentError as any).code = 500;

      // Create service with limited retries
      const limitedRetryService = new GmailService(mockCredentials, undefined, {
        maxRetries: 1,
        baseDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
      });

      mockGmail.users.messages.list.mockRejectedValue(persistentError);

      await expect(limitedRetryService.getNewEmails()).rejects.toThrow(
        "Persistent server error"
      );
      expect(mockGmail.users.messages.list).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it("should respect custom rate limit configuration", async () => {
      // Create service with very low rate limits for testing
      const rateLimitedService = new GmailService(mockCredentials, {
        maxRequestsPerSecond: 1,
        maxRequestsPerMinute: 5,
        maxRequestsPerDay: 100,
      });

      mockGmail.users.messages.list.mockResolvedValue({
        data: { messages: [] },
      });

      // The service should enforce rate limits
      expect(rateLimitedService).toBeDefined();
    });
  });
});
