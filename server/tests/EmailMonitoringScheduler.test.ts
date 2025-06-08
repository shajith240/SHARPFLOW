import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EmailMonitoringScheduler } from '../services/EmailMonitoringScheduler.js';

// Mock dependencies
const mockRedis = {
  quit: jest.fn(),
};

const mockQueue = {
  add: jest.fn(),
  getJobs: jest.fn(),
  close: jest.fn(),
};

const mockWorker = {
  on: jest.fn(),
  close: jest.fn(),
};

const mockSentinelAgent = {
  processJob: jest.fn(),
};

const mockNotificationService = {
  createNotification: jest.fn(),
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn()
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn()
    }))
  }))
};

// Mock modules
jest.mock('ioredis', () => {
  return jest.fn(() => mockRedis);
});

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueue),
  Worker: jest.fn(() => mockWorker),
}));

jest.mock('../ai-agents/agents/SentinelAgent.js', () => ({
  SentinelAgent: jest.fn(() => mockSentinelAgent)
}));

jest.mock('../services/NotificationService.js', () => ({
  NotificationService: jest.fn(() => mockNotificationService)
}));

jest.mock('../db.js', () => ({
  supabase: mockSupabase
}));

describe('EmailMonitoringScheduler', () => {
  let scheduler: EmailMonitoringScheduler;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduler = new EmailMonitoringScheduler();
  });

  afterEach(async () => {
    await scheduler.shutdown();
    jest.resetAllMocks();
  });

  describe('initialization', () => {
    it('should initialize queue and worker', () => {
      expect(require('bullmq').Queue).toHaveBeenCalledWith('email-monitoring', expect.any(Object));
      expect(require('bullmq').Worker).toHaveBeenCalledWith(
        'email-monitoring',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should setup worker event listeners', () => {
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });
  });

  describe('startMonitoring', () => {
    it('should start monitoring for a user with valid config', async () => {
      const mockConfig = {
        id: 'config123',
        user_id: 'user123',
        monitoring_enabled: true,
        check_interval: 2,
        last_check_at: null,
      };

      // Mock getMonitoringConfig to return valid config
      jest.spyOn(scheduler as any, 'getMonitoringConfig').mockResolvedValue(mockConfig);
      
      // Mock stopMonitoring to avoid conflicts
      jest.spyOn(scheduler, 'stopMonitoring').mockResolvedValue();

      mockQueue.add.mockResolvedValue({ id: 'job123' });

      await scheduler.startMonitoring('user123');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'check-emails',
        {
          userId: 'user123',
          configId: 'config123',
          checkInterval: 2,
          lastCheckAt: null,
        },
        expect.objectContaining({
          repeat: {
            every: 120000, // 2 minutes in milliseconds
          },
          jobId: expect.stringContaining('monitor_user123_'),
        })
      );

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'system_notification',
        title: 'Email Monitoring Started',
        message: 'Sentinel is now monitoring your Gmail every 2 minute(s)',
        agentName: 'sentinel',
      });
    });

    it('should not start monitoring if user config is disabled', async () => {
      const mockConfig = {
        id: 'config123',
        user_id: 'user123',
        monitoring_enabled: false,
        check_interval: 1,
      };

      jest.spyOn(scheduler as any, 'getMonitoringConfig').mockResolvedValue(mockConfig);

      await scheduler.startMonitoring('user123');

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should not start monitoring if no config exists', async () => {
      jest.spyOn(scheduler as any, 'getMonitoringConfig').mockResolvedValue(null);

      await scheduler.startMonitoring('user123');

      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('stopMonitoring', () => {
    it('should remove existing jobs for user', async () => {
      const mockJobs = [
        { id: 'job1', data: { userId: 'user123' }, remove: jest.fn() },
        { id: 'job2', data: { userId: 'user456' }, remove: jest.fn() },
        { id: 'job3', data: { userId: 'user123' }, remove: jest.fn() },
      ];

      mockQueue.getJobs.mockResolvedValue(mockJobs);

      await scheduler.stopMonitoring('user123');

      expect(mockQueue.getJobs).toHaveBeenCalledWith(['waiting', 'delayed', 'active']);
      expect(mockJobs[0].remove).toHaveBeenCalled();
      expect(mockJobs[1].remove).not.toHaveBeenCalled();
      expect(mockJobs[2].remove).toHaveBeenCalled();
    });
  });

  describe('processEmailMonitoringJob', () => {
    it('should process monitoring job successfully', async () => {
      const mockJob = {
        data: {
          userId: 'user123',
          configId: 'config123',
          checkInterval: 1,
        }
      };

      const mockAgentResult = {
        success: true,
        data: { emailsProcessed: 3 }
      };

      // Mock updateLastCheckTime
      jest.spyOn(scheduler as any, 'updateLastCheckTime').mockResolvedValue();
      
      mockSentinelAgent.processJob.mockResolvedValue(mockAgentResult);

      const result = await (scheduler as any).processEmailMonitoringJob(mockJob);

      expect(result).toEqual({
        success: true,
        emailsProcessed: 3,
        processingTime: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'job_completed',
        title: 'New Emails Processed',
        message: 'Sentinel processed 3 new email(s)',
        agentName: 'sentinel',
        jobId: expect.any(String),
        jobType: 'email_monitoring',
        metadata: expect.any(Object),
      });
    });

    it('should handle processing errors', async () => {
      const mockJob = {
        data: {
          userId: 'user123',
          configId: 'config123',
          checkInterval: 1,
        }
      };

      const mockError = new Error('Processing failed');

      jest.spyOn(scheduler as any, 'updateLastCheckTime').mockResolvedValue();
      mockSentinelAgent.processJob.mockRejectedValue(mockError);

      await expect((scheduler as any).processEmailMonitoringJob(mockJob))
        .rejects.toThrow('Processing failed');

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'job_failed',
        title: 'Email Monitoring Error',
        message: 'Email monitoring failed: Processing failed',
        agentName: 'sentinel',
        metadata: expect.any(Object),
      });
    });
  });

  describe('getMonitoringConfig', () => {
    it('should retrieve monitoring config from database', async () => {
      const mockConfig = {
        id: 'config123',
        user_id: 'user123',
        monitoring_enabled: true,
        check_interval: 1,
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockConfig,
        error: null
      });

      const result = await (scheduler as any).getMonitoringConfig('user123');

      expect(mockSupabase.from).toHaveBeenCalledWith('email_monitoring_config');
      expect(result).toEqual(mockConfig);
    });

    it('should return null when config not found', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await (scheduler as any).getMonitoringConfig('user123');

      expect(result).toBeNull();
    });

    it('should return null when supabase not configured', async () => {
      const originalSupabase = require('../db.js').supabase;
      require('../db.js').supabase = null;

      const result = await (scheduler as any).getMonitoringConfig('user123');

      expect(result).toBeNull();

      // Restore
      require('../db.js').supabase = originalSupabase;
    });
  });

  describe('getMonitoringStatus', () => {
    it('should return monitoring status for all jobs', async () => {
      const mockJobs = [
        {
          id: 'job1',
          data: { userId: 'user123', checkInterval: 1 },
          opts: { repeat: true, delay: 60000 }
        },
        {
          id: 'job2',
          data: { userId: 'user456', checkInterval: 2 },
          opts: { repeat: true }
        }
      ];

      mockQueue.getJobs.mockResolvedValue(mockJobs);

      const result = await scheduler.getMonitoringStatus();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        jobId: 'job1',
        userId: 'user123',
        status: 'recurring',
        nextRun: expect.any(Date),
        interval: 1,
      });
    });
  });

  describe('shutdown', () => {
    it('should close worker, queue, and redis connection', async () => {
      await scheduler.shutdown();

      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalled();
      expect(mockRedis.quit).toHaveBeenCalled();
    });
  });
});
