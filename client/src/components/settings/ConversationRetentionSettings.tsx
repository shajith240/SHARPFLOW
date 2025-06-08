import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Clock, Database, Trash2, Settings, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CleanupStatus {
  isRunning: boolean;
  lastCleanup: string | null;
  config: {
    retentionDays: number;
    batchSize: number;
    enableSoftDelete: boolean;
    preserveSystemMessages: boolean;
    preserveErrorMessages: boolean;
    preserveSummaries: boolean;
    cleanupSchedule: string;
  };
  nextScheduledRun: string | null;
}

interface CleanupStats {
  messagesProcessed: number;
  messagesSoftDeleted: number;
  messagesHardDeleted: number;
  sessionsArchived: number;
  summariesGenerated: number;
  cacheEntriesCleared: number;
  executionTimeMs: number;
}

export function ConversationRetentionSettings() {
  const [cleanupStatus, setCleanupStatus] = useState<CleanupStatus | null>(null);
  const [retentionSettings, setRetentionSettings] = useState({
    falcon: 30,
    sage: 30,
    sentinel: 30,
    prism: 30
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lastCleanupStats, setLastCleanupStats] = useState<CleanupStats | null>(null);

  useEffect(() => {
    fetchCleanupStatus();
  }, []);

  const fetchCleanupStatus = async () => {
    try {
      const response = await fetch("/api/ai-agents/conversations/cleanup/status", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setCleanupStatus(data.status);
      }
    } catch (error) {
      console.error("Error fetching cleanup status:", error);
    }
  };

  const updateRetentionSetting = async (agentType: string, days: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/ai-agents/conversations/retention/${agentType}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ retentionDays: days }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: `Retention updated for ${agentType}: ${days} days` });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update retention setting' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const runManualCleanup = async () => {
    setIsRunningCleanup(true);
    try {
      const response = await fetch("/api/ai-agents/conversations/cleanup/run", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setLastCleanupStats(data.stats);
        setMessage({ type: 'success', text: 'Cleanup completed successfully' });
        fetchCleanupStatus(); // Refresh status
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Cleanup failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error during cleanup' });
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Cleanup Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Conversation Cleanup Status
          </CardTitle>
          <CardDescription>
            Automatic cleanup system status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cleanupStatus && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {cleanupStatus.config.retentionDays}
                  </div>
                  <div className="text-sm text-gray-600">Retention Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {cleanupStatus.config.batchSize}
                  </div>
                  <div className="text-sm text-gray-600">Batch Size</div>
                </div>
                <div className="text-center">
                  <Badge variant={cleanupStatus.isRunning ? "destructive" : "secondary"}>
                    {cleanupStatus.isRunning ? "Running" : "Idle"}
                  </Badge>
                  <div className="text-sm text-gray-600 mt-1">Status</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">
                    {formatDate(cleanupStatus.lastCleanup)}
                  </div>
                  <div className="text-sm text-gray-600">Last Cleanup</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${cleanupStatus.config.enableSoftDelete ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Soft Delete</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${cleanupStatus.config.preserveSystemMessages ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Keep System Messages</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className={`h-4 w-4 ${cleanupStatus.config.preserveSummaries ? 'text-green-500' : 'text-gray-400'}`} />
                  <span>Keep Summaries</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Schedule: {cleanupStatus.config.cleanupSchedule}
                </div>
                <Button
                  onClick={runManualCleanup}
                  disabled={isRunningCleanup || cleanupStatus.isRunning}
                  size="sm"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isRunningCleanup ? "Running..." : "Run Cleanup Now"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Last Cleanup Stats */}
      {lastCleanupStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Last Cleanup Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {lastCleanupStats.messagesSoftDeleted}
                </div>
                <div className="text-sm text-gray-600">Messages Archived</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {lastCleanupStats.messagesHardDeleted}
                </div>
                <div className="text-sm text-gray-600">Messages Deleted</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {lastCleanupStats.summariesGenerated}
                </div>
                <div className="text-sm text-gray-600">Summaries Created</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatDuration(lastCleanupStats.executionTimeMs)}
                </div>
                <div className="text-sm text-gray-600">Execution Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retention Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Agent Retention Settings
          </CardTitle>
          <CardDescription>
            Configure how long conversation history is kept for each AI agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(retentionSettings).map(([agent, days]) => (
            <div key={agent} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {agent.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium capitalize">{agent}</div>
                  <div className="text-sm text-gray-600">
                    {agent === 'falcon' && 'Lead Generation Agent'}
                    {agent === 'sage' && 'Lead Research Agent'}
                    {agent === 'sentinel' && 'Email Automation Agent'}
                    {agent === 'prism' && 'Universal Orchestrator'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={days}
                  onChange={(e) => setRetentionSettings(prev => ({
                    ...prev,
                    [agent]: parseInt(e.target.value) || 1
                  }))}
                  className="w-20"
                />
                <Label className="text-sm text-gray-600">days</Label>
                <Button
                  onClick={() => updateRetentionSetting(agent, days)}
                  disabled={isLoading}
                  size="sm"
                >
                  Update
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How Cleanup Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <div>• <strong>Soft Delete:</strong> Messages are first marked as irrelevant but kept in database</div>
          <div>• <strong>Hard Delete:</strong> Very old soft-deleted messages are permanently removed</div>
          <div>• <strong>Summaries:</strong> Conversation summaries are generated before deletion</div>
          <div>• <strong>System Messages:</strong> Important system and error messages are preserved</div>
          <div>• <strong>Sessions:</strong> Inactive conversation sessions are automatically archived</div>
          <div>• <strong>Schedule:</strong> Cleanup runs automatically based on the configured schedule</div>
        </CardContent>
      </Card>
    </div>
  );
}
