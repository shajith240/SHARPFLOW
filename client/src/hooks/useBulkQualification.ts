import { useState, useEffect, useCallback } from "react";
import {
  BulkQualificationRequest,
  QualificationJob,
} from "@/types/lead-generation";

interface UseBulkQualificationOptions {
  userId?: string;
  onJobComplete?: (job: QualificationJob) => void;
  onJobFailed?: (job: QualificationJob, error: string) => void;
  onJobProgress?: (job: QualificationJob, progress: number) => void;
}

interface UseBulkQualificationReturn {
  jobs: QualificationJob[];
  activeJobs: QualificationJob[];
  loading: boolean;
  error: string | null;
  startBulkQualification: (
    request: BulkQualificationRequest
  ) => Promise<string>;
  cancelJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  refreshJobs: () => Promise<void>;
  clearCompletedJobs: () => Promise<void>;
}

export function useBulkQualification({
  userId,
  onJobComplete,
  onJobFailed,
  onJobProgress,
}: UseBulkQualificationOptions = {}): UseBulkQualificationReturn {
  const [jobs, setJobs] = useState<QualificationJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter active jobs (queued or processing)
  const activeJobs = jobs.filter(
    (job) => job.jobStatus === "queued" || job.jobStatus === "processing"
  );

  const fetchJobs = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch("/api/lead-qualification/jobs/recent", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Transform backend data to match frontend interface
        const transformedJobs = data.data.map((job: any) => ({
          id: job.id,
          userId: job.user_id,
          leadId: job.lead_id,
          jobType: job.job_type,
          jobStatus: job.job_status,
          priority: job.priority,
          leadsToProcess: job.leads_to_process,
          leadsProcessed: job.leads_processed,
          leadsQualified: job.leads_qualified,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          processingTimeMs: job.processing_time_ms,
          errorMessage: job.error_message,
          retryCount: job.retry_count,
          maxRetries: job.max_retries,
          qualificationResults: job.qualification_results || {},
          tokensUsed: job.tokens_used,
          createdAt: job.created_at,
          updatedAt: job.updated_at,
        }));
        setJobs(transformedJobs);
      } else {
        throw new Error(data.error || "Failed to fetch qualification jobs");
      }
    } catch (err) {
      console.error("Error fetching qualification jobs:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    }
  }, []);

  const startBulkQualification = useCallback(
    async (request: BulkQualificationRequest): Promise<string> => {
      try {
        setLoading(true);
        setError(null);

        // Determine the API endpoint based on request type
        let endpoint = "/api/lead-qualification/bulk/start";
        let requestBody = request;

        // If specific leadIds are provided, use the requalify endpoint
        if (request.leadIds && request.leadIds.length > 0) {
          endpoint = "/api/lead-qualification/requalify";
          requestBody = { leadIds: request.leadIds };
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to start bulk qualification: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.success && data.data?.jobId) {
          // Refresh jobs to include the new one
          await fetchJobs();
          return data.data.jobId;
        } else {
          throw new Error(data.error || "Failed to start bulk qualification");
        }
      } catch (err) {
        console.error("Error starting bulk qualification:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [fetchJobs]
  );

  const cancelJob = useCallback(
    async (jobId: string): Promise<void> => {
      try {
        setError(null);

        const response = await fetch(
          `/api/lead-qualification/jobs/${jobId}/cancel`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to cancel job: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          // Refresh jobs to get updated status
          await fetchJobs();
        } else {
          throw new Error(data.error || "Failed to cancel job");
        }
      } catch (err) {
        console.error("Error cancelling job:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      }
    },
    [fetchJobs]
  );

  const retryJob = useCallback(
    async (jobId: string): Promise<void> => {
      try {
        setError(null);

        const response = await fetch(
          `/api/lead-qualification/jobs/${jobId}/retry`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to retry job: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          // Refresh jobs to get updated status
          await fetchJobs();
        } else {
          throw new Error(data.error || "Failed to retry job");
        }
      } catch (err) {
        console.error("Error retrying job:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      }
    },
    [fetchJobs]
  );

  const clearCompletedJobs = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      const response = await fetch(
        "/api/lead-qualification/jobs/clear-completed",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to clear completed jobs: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success) {
        // Remove completed jobs from local state
        setJobs((prevJobs) =>
          prevJobs.filter(
            (job) =>
              job.jobStatus !== "completed" &&
              job.jobStatus !== "failed" &&
              job.jobStatus !== "cancelled"
          )
        );
      } else {
        throw new Error(data.error || "Failed to clear completed jobs");
      }
    } catch (err) {
      console.error("Error clearing completed jobs:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    }
  }, []);

  const refreshJobs = useCallback(async (): Promise<void> => {
    await fetchJobs();
  }, [fetchJobs]);

  // Set up WebSocket for real-time job updates
  useEffect(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}`;

    let ws: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log("🔗 Connected to qualification jobs WebSocket");
          reconnectAttempts = 0;

          // Subscribe to job updates
          ws.send(
            JSON.stringify({
              type: "subscribe_qualification_jobs",
              userId,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "qualification_job_update" && data.data) {
              const updatedJob = data.data as QualificationJob;

              setJobs((prevJobs) => {
                const existingJobIndex = prevJobs.findIndex(
                  (job) => job.id === updatedJob.id
                );

                if (existingJobIndex >= 0) {
                  // Update existing job
                  const newJobs = [...prevJobs];
                  newJobs[existingJobIndex] = updatedJob;
                  return newJobs;
                } else {
                  // Add new job
                  return [updatedJob, ...prevJobs];
                }
              });

              // Call appropriate callbacks
              if (updatedJob.jobStatus === "completed" && onJobComplete) {
                onJobComplete(updatedJob);
              } else if (updatedJob.jobStatus === "failed" && onJobFailed) {
                onJobFailed(
                  updatedJob,
                  updatedJob.errorMessage || "Unknown error"
                );
              } else if (
                updatedJob.jobStatus === "processing" &&
                onJobProgress
              ) {
                const progress =
                  updatedJob.leadsToProcess > 0
                    ? (updatedJob.leadsProcessed / updatedJob.leadsToProcess) *
                      100
                    : 0;
                onJobProgress(updatedJob, progress);
              }
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        ws.onclose = (event) => {
          console.log(
            "🔌 Qualification jobs WebSocket disconnected:",
            event.code
          );

          // Attempt to reconnect if not a normal closure
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(
              1000 * Math.pow(2, reconnectAttempts),
              30000
            );

            console.log(
              `🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`
            );

            reconnectTimeout = setTimeout(connect, delay);
          }
        };

        ws.onerror = (error) => {
          console.error("❌ Qualification jobs WebSocket error:", error);
        };
      } catch (err) {
        console.error("Failed to create WebSocket connection:", err);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "Component unmounted");
      }
    };
  }, [userId, onJobComplete, onJobFailed, onJobProgress]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchJobs();
    }
  }, [userId, fetchJobs]);

  // Periodic refresh for active jobs
  useEffect(() => {
    if (activeJobs.length === 0) return;

    const interval = setInterval(() => {
      fetchJobs();
    }, 5000); // Refresh every 5 seconds when there are active jobs

    return () => clearInterval(interval);
  }, [activeJobs.length, fetchJobs]);

  return {
    jobs,
    activeJobs,
    loading,
    error,
    startBulkQualification,
    cancelJob,
    retryJob,
    refreshJobs,
    clearCompletedJobs,
  };
}

export default useBulkQualification;
