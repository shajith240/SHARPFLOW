// Jest setup file for SharpFlow tests

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.GMAIL_CLIENT_ID = "test-gmail-client-id";
process.env.GMAIL_CLIENT_SECRET = "test-gmail-client-secret";
process.env.GMAIL_REFRESH_TOKEN = "test-gmail-refresh-token";
process.env.GOOGLE_CALENDAR_CLIENT_ID = "test-calendar-client-id";
process.env.GOOGLE_CALENDAR_CLIENT_SECRET = "test-calendar-client-secret";
process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = "test-calendar-refresh-token";

// Global error handler for unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Export test utilities
export const testUtils = {
  createMockGmailMessage: (overrides = {}) => ({
    id: "test-message-id",
    threadId: "test-thread-id",
    payload: {
      headers: [
        { name: "From", value: "test@example.com" },
        { name: "To", value: "recipient@example.com" },
        { name: "Subject", value: "Test Subject" },
        { name: "Date", value: new Date().toISOString() },
      ],
      body: {
        data: Buffer.from("Test email body").toString("base64"),
      },
    },
    internalDate: Date.now().toString(),
    ...overrides,
  }),

  createMockGmailThread: (messageCount = 2) => ({
    id: "test-thread-id",
    messages: Array.from({ length: messageCount }, (_, i) =>
      testUtils.createMockGmailMessage({
        id: `test-message-${i + 1}`,
        threadId: "test-thread-id",
      })
    ),
  }),

  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};
