import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EmailPersistenceService } from '../services/EmailPersistenceService.js';

// Mock Supabase
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
        single: jest.fn(),
        order: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }))
};

// Mock the db module
jest.mock('../db.js', () => ({
  supabase: mockSupabase
}));

describe('EmailPersistenceService', () => {
  let emailPersistence: EmailPersistenceService;

  beforeEach(() => {
    emailPersistence = new EmailPersistenceService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('saveEmailThread', () => {
    it('should save email thread successfully', async () => {
      const mockThreadData = {
        user_id: 'user123',
        thread_id: 'thread123',
        subject: 'Test Email',
        participants: ['test@example.com'],
        status: 'active' as const,
        classification: 'sales' as const,
        is_calendar_request: false,
        requires_response: true,
        escalated: false,
      };

      const mockResponse = {
        data: { id: 'thread123', ...mockThreadData },
        error: null
      };

      mockSupabase.from().upsert().select().single.mockResolvedValue(mockResponse);

      const result = await emailPersistence.saveEmailThread(mockThreadData);

      expect(mockSupabase.from).toHaveBeenCalledWith('email_threads');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle database errors', async () => {
      const mockThreadData = {
        user_id: 'user123',
        thread_id: 'thread123',
        subject: 'Test Email',
      };

      const mockError = { message: 'Database error' };
      mockSupabase.from().upsert().select().single.mockResolvedValue({
        data: null,
        error: mockError
      });

      await expect(emailPersistence.saveEmailThread(mockThreadData))
        .rejects.toThrow('Failed to save email thread: Database error');
    });
  });

  describe('saveEmailMessage', () => {
    it('should save email message successfully', async () => {
      const mockMessageData = {
        user_id: 'user123',
        thread_id: 'thread123',
        message_id: 'msg123',
        from_address: 'sender@example.com',
        to_addresses: ['recipient@example.com'],
        subject: 'Test Message',
        body_text: 'Test body',
        is_from_customer: true,
      };

      const mockResponse = {
        data: { id: 'msg123', ...mockMessageData },
        error: null
      };

      mockSupabase.from().upsert().select().single.mockResolvedValue(mockResponse);

      const result = await emailPersistence.saveEmailMessage(mockMessageData);

      expect(mockSupabase.from).toHaveBeenCalledWith('email_messages');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('saveEmailResponse', () => {
    it('should save email response successfully', async () => {
      const mockResponseData = {
        user_id: 'user123',
        thread_id: 'thread123',
        subject: 'Re: Test Email',
        body: 'Response body',
        status: 'pending_approval' as const,
        confidence_score: 0.8,
        requires_approval: true,
      };

      const mockResponse = {
        data: { id: 'response123', ...mockResponseData },
        error: null
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockResponse);

      const result = await emailPersistence.saveEmailResponse(mockResponseData);

      expect(mockSupabase.from).toHaveBeenCalledWith('email_responses');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('saveCalendarBooking', () => {
    it('should save calendar booking successfully', async () => {
      const mockBookingData = {
        user_id: 'user123',
        thread_id: 'thread123',
        requester_email: 'requester@example.com',
        requester_name: 'John Doe',
        duration_minutes: 30,
        meeting_type: 'consultation',
        status: 'pending' as const,
      };

      const mockResponse = {
        data: { id: 'booking123', ...mockBookingData },
        error: null
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockResponse);

      const result = await emailPersistence.saveCalendarBooking(mockBookingData);

      expect(mockSupabase.from).toHaveBeenCalledWith('calendar_bookings');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('saveEmailEscalation', () => {
    it('should save email escalation successfully', async () => {
      const mockEscalationData = {
        user_id: 'user123',
        thread_id: 'thread123',
        escalation_reason: 'Complex query requiring human review',
        escalation_type: 'complex_query' as const,
        priority: 'high' as const,
        status: 'pending' as const,
      };

      const mockResponse = {
        data: { id: 'escalation123', ...mockEscalationData },
        error: null
      };

      mockSupabase.from().insert().select().single.mockResolvedValue(mockResponse);

      const result = await emailPersistence.saveEmailEscalation(mockEscalationData);

      expect(mockSupabase.from).toHaveBeenCalledWith('email_escalations');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getEmailThreadByGmailId', () => {
    it('should retrieve email thread by Gmail ID', async () => {
      const mockThread = {
        id: 'thread123',
        user_id: 'user123',
        thread_id: 'gmail_thread_123',
        subject: 'Test Email',
      };

      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: mockThread,
        error: null
      });

      const result = await emailPersistence.getEmailThreadByGmailId('user123', 'gmail_thread_123');

      expect(mockSupabase.from).toHaveBeenCalledWith('email_threads');
      expect(result).toEqual(mockThread);
    });

    it('should return null when thread not found', async () => {
      mockSupabase.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found error
      });

      const result = await emailPersistence.getEmailThreadByGmailId('user123', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPendingResponses', () => {
    it('should retrieve pending responses for user', async () => {
      const mockResponses = [
        {
          id: 'response1',
          user_id: 'user123',
          status: 'pending_approval',
          subject: 'Response 1',
        },
        {
          id: 'response2',
          user_id: 'user123',
          status: 'pending_approval',
          subject: 'Response 2',
        }
      ];

      mockSupabase.from().select().eq().eq().order.mockResolvedValue({
        data: mockResponses,
        error: null
      });

      const result = await emailPersistence.getPendingResponses('user123');

      expect(mockSupabase.from).toHaveBeenCalledWith('email_responses');
      expect(result).toEqual(mockResponses);
    });
  });

  describe('updateResponseStatus', () => {
    it('should update response status successfully', async () => {
      const mockUpdatedResponse = {
        id: 'response123',
        status: 'approved',
        approved_by: 'user123',
        approved_at: expect.any(String),
      };

      mockSupabase.from().update().eq().eq().select().single.mockResolvedValue({
        data: mockUpdatedResponse,
        error: null
      });

      const result = await emailPersistence.updateResponseStatus(
        'response123',
        'approved',
        'user123',
        'user123'
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('email_responses');
      expect(result).toEqual(mockUpdatedResponse);
    });
  });

  describe('error handling', () => {
    it('should handle Supabase not configured', async () => {
      // Temporarily mock supabase as null
      const originalSupabase = require('../db.js').supabase;
      require('../db.js').supabase = null;

      await expect(emailPersistence.saveEmailThread({ user_id: 'test', thread_id: 'test' }))
        .rejects.toThrow('Supabase not configured');

      // Restore original supabase
      require('../db.js').supabase = originalSupabase;
    });
  });
});
