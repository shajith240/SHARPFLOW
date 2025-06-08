import { GmailService } from '../services/GmailService';

describe('Gmail Integration Test', () => {
  let gmailService: GmailService;

  beforeEach(() => {
    const mockCredentials = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      refreshToken: 'test-refresh-token',
    };

    gmailService = new GmailService(mockCredentials);
  });

  it('should create Gmail service instance', () => {
    expect(gmailService).toBeDefined();
    expect(gmailService).toBeInstanceOf(GmailService);
  });

  it('should have all required methods', () => {
    expect(typeof gmailService.testConnection).toBe('function');
    expect(typeof gmailService.getNewEmails).toBe('function');
    expect(typeof gmailService.getMessageById).toBe('function');
    expect(typeof gmailService.getThreadById).toBe('function');
    expect(typeof gmailService.extractEmailContent).toBe('function');
    expect(typeof gmailService.sendEmail).toBe('function');
    expect(typeof gmailService.markAsRead).toBe('function');
  });

  it('should extract email content correctly', () => {
    const mockMessage = {
      id: 'test-message-id',
      threadId: 'test-thread-id',
      payload: {
        headers: [
          { name: 'From', value: 'sender@example.com' },
          { name: 'To', value: 'recipient@example.com' },
          { name: 'Subject', value: 'Test Subject' },
          { name: 'Date', value: 'Mon, 1 Jan 2024 10:00:00 +0000' },
        ],
        body: {
          data: Buffer.from('Test email body').toString('base64'),
        },
      },
    };

    const result = gmailService.extractEmailContent(mockMessage);

    expect(result.from).toBe('sender@example.com');
    expect(result.to).toBe('recipient@example.com');
    expect(result.subject).toBe('Test Subject');
    expect(result.textBody).toBe('Test email body');
    expect(result.date).toBe('Mon, 1 Jan 2024 10:00:00 +0000');
  });

  it('should handle multipart email content', () => {
    const mockMessage = {
      id: 'test-message-id',
      threadId: 'test-thread-id',
      payload: {
        headers: [
          { name: 'From', value: 'sender@example.com' },
          { name: 'Subject', value: 'Test Subject' },
        ],
        parts: [
          {
            mimeType: 'text/plain',
            body: {
              data: Buffer.from('Plain text body').toString('base64'),
            },
          },
          {
            mimeType: 'text/html',
            body: {
              data: Buffer.from('<p>HTML body</p>').toString('base64'),
            },
          },
        ],
      },
    };

    const result = gmailService.extractEmailContent(mockMessage);

    expect(result.textBody).toBe('Plain text body');
    expect(result.htmlBody).toBe('<p>HTML body</p>');
  });

  it('should handle missing headers gracefully', () => {
    const mockMessage = {
      id: 'test-message-id',
      threadId: 'test-thread-id',
      payload: {
        headers: [],
        body: {
          data: Buffer.from('Test body').toString('base64'),
        },
      },
    };

    const result = gmailService.extractEmailContent(mockMessage);

    expect(result.from).toBe('');
    expect(result.to).toBe('');
    expect(result.subject).toBe('');
    expect(result.textBody).toBe('Test body');
  });
});
