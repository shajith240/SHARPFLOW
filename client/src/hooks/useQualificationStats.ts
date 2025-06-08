import { useState, useEffect } from "react";
import { QualificationStats } from "@/types/lead-generation";

interface UseQualificationStatsOptions {
  userId?: string;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseQualificationStatsReturn {
  stats: QualificationStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useQualificationStats({
  userId,
  refreshInterval = 30000, // 30 seconds
  enabled = true,
}: UseQualificationStatsOptions = {}): UseQualificationStatsReturn {
  const [stats, setStats] = useState<QualificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/lead-qualification/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch qualification stats: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success && data.data) {
        // Transform the backend response to match our frontend interface
        const backendData = data.data;
        const transformedStats: QualificationStats = {
          totalLeads: backendData.total_leads || 0,
          qualifiedLeads: backendData.qualified_leads || 0,
          highQualityLeads: backendData.high_quality_leads || 0,
          mediumQualityLeads: backendData.medium_quality_leads || 0,
          lowQualityLeads: backendData.low_quality_leads || 0,
          unqualifiedLeads: backendData.unqualified_leads || 0,
          avgQualificationScore:
            parseFloat(backendData.avg_qualification_score) || 0,
          qualificationRate:
            backendData.total_leads > 0
              ? Math.round(
                  (backendData.qualified_leads / backendData.total_leads) * 100
                )
              : 0,
        };
        setStats(transformedStats);
      } else {
        throw new Error(data.error || "Failed to fetch qualification stats");
      }
    } catch (err) {
      console.error("Error fetching qualification stats:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchStats();
  };

  useEffect(() => {
    if (enabled) {
      fetchStats();
    }
  }, [enabled, userId]);

  useEffect(() => {
    if (!enabled || !refreshInterval) return;

    const interval = setInterval(fetchStats, refreshInterval);
    return () => clearInterval(interval);
  }, [enabled, refreshInterval]);

  return {
    stats,
    loading,
    error,
    refetch,
  };
}

// Hook for real-time qualification stats updates via WebSocket
export function useRealtimeQualificationStats(userId?: string) {
  const [stats, setStats] = useState<QualificationStats | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) return;

    // WebSocket connection for real-time updates
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
          console.log("🔗 Connected to qualification stats WebSocket");
          reconnectAttempts = 0;

          // Subscribe to qualification stats updates
          ws.send(
            JSON.stringify({
              type: "subscribe_qualification_stats",
              userId,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "qualification_stats_update" && data.data) {
              setStats(data.data);
              setLastUpdate(new Date());
            }
          } catch (err) {
            console.error("Error parsing WebSocket message:", err);
          }
        };

        ws.onclose = (event) => {
          console.log(
            "🔌 Qualification stats WebSocket disconnected:",
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
          console.error("❌ Qualification stats WebSocket error:", error);
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
  }, [userId]);

  return {
    stats,
    lastUpdate,
    isConnected: stats !== null,
  };
}

// Hook for qualification stats with caching
export function useCachedQualificationStats(userId?: string) {
  const cacheKey = `qualification_stats_${userId}`;
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes

  const [stats, setStats] = useState<QualificationStats | null>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheExpiry) {
          return data;
        }
      }
    } catch (err) {
      console.error("Error reading cached qualification stats:", err);
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAndCacheStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/lead-qualification/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch qualification stats: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success && data.data) {
        setStats(data.data);

        // Cache the data
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: data.data,
              timestamp: Date.now(),
            })
          );
        } catch (err) {
          console.warn("Failed to cache qualification stats:", err);
        }
      } else {
        throw new Error(data.error || "Failed to fetch qualification stats");
      }
    } catch (err) {
      console.error("Error fetching qualification stats:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    try {
      localStorage.removeItem(cacheKey);
    } catch (err) {
      console.warn("Failed to clear qualification stats cache:", err);
    }
  };

  useEffect(() => {
    if (userId && !stats) {
      fetchAndCacheStats();
    }
  }, [userId]);

  return {
    stats,
    loading,
    error,
    refetch: fetchAndCacheStats,
    clearCache,
  };
}

export default useQualificationStats;
