import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MessageCircle,
  Link,
  Unlink,
  Copy,
  Check,
  Bell,
  BellOff,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface TelegramStatus {
  isLinked: boolean;
  telegramId: number | null;
  username: string | null;
  linkedAt: string | null;
  botUsername: string;
}

interface NotificationPreferences {
  leadGenerationComplete: boolean;
  researchReportComplete: boolean;
  jobFailed: boolean;
  planLimitReached: boolean;
  dailySummary: boolean;
  systemAnnouncements: boolean;
}

export function TelegramSettings() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [codeExpiry, setCodeExpiry] = useState<string>("");
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTelegramStatus();
    fetchNotificationPreferences();
  }, []);

  const fetchTelegramStatus = async () => {
    try {
      const response = await fetch("/api/telegram/status");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch Telegram status:", error);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      const response = await fetch("/api/telegram/preferences");
      const data = await response.json();
      setPreferences(data.preferences);
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error);
    }
  };

  const generateVerificationCode = async () => {
    setIsGeneratingCode(true);
    try {
      const response = await fetch("/api/telegram/generate-link-code", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setVerificationCode(data.verificationCode);
        setCodeExpiry(data.expiresAt);
        toast({
          title: "Verification Code Generated",
          description:
            "Send this code to your Telegram bot to link your account.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate verification code.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyVerificationCode = async () => {
    if (verificationCode) {
      await navigator.clipboard.writeText(verificationCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Verification code copied to clipboard.",
      });
    }
  };

  const unlinkTelegram = async () => {
    setIsUnlinking(true);
    try {
      const response = await fetch("/api/telegram/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUnlink: true }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchTelegramStatus();
        setVerificationCode("");
        setCodeExpiry("");
        toast({
          title: "Account Unlinked",
          description: "Your Telegram account has been unlinked successfully.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink Telegram account.",
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  const updateNotificationPreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    if (!preferences) return;

    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);

    try {
      const response = await fetch("/api/telegram/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedPreferences),
      });

      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }

      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      // Revert the change
      setPreferences(preferences);
      toast({
        title: "Error",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
    }
  };

  const sendTestNotification = async () => {
    if (!testMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test message.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch("/api/telegram/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testMessage }),
      });

      const data = await response.json();

      if (data.success) {
        setTestMessage("");
        toast({
          title: "Test Sent!",
          description: "Check your Telegram for the test notification.",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notification.",
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const isCodeExpired = () => {
    if (!codeExpiry) return false;
    return new Date() > new Date(codeExpiry);
  };

  const getTimeUntilExpiry = () => {
    if (!codeExpiry) return "";
    const now = new Date();
    const expiry = new Date(codeExpiry);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!status) {
    return (
      <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dashboard-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
        <CardHeader>
          <CardTitle className="text-dashboard-text-primary flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-dashboard-primary" />
            Telegram Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dashboard-text-primary font-medium">
                Connection Status
              </p>
              <p className="text-sm text-dashboard-text-secondary">
                {status.isLinked
                  ? `Connected as @${status.username || "Unknown"}`
                  : "Not connected"}
              </p>
            </div>
            <Badge
              className={
                status.isLinked
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              }
            >
              {status.isLinked ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>

          {status.isLinked ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm">
                  ✅ Your Telegram account is connected! You'll receive
                  notifications for lead generation, research reports, and more.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={unlinkTelegram}
                disabled={isUnlinking}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <Unlink className="w-4 h-4 mr-2" />
                {isUnlinking ? "Unlinking..." : "Unlink Account"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-400 text-sm mb-2">
                  📱 Connect your Telegram account to receive real-time
                  notifications for:
                </p>
                <ul className="text-blue-400 text-sm space-y-1 ml-4">
                  <li>• Lead generation completion</li>
                  <li>• Research report generation</li>
                  <li>• Job failures and errors</li>
                  <li>• Plan limit notifications</li>
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-dashboard-text-secondary text-sm">
                  1. Start a chat with <strong>@{status.botUsername}</strong> on
                  Telegram
                </p>
                <p className="text-dashboard-text-secondary text-sm">
                  2. Generate a verification code and send it to the bot
                </p>

                {!verificationCode ? (
                  <Button
                    onClick={generateVerificationCode}
                    disabled={isGeneratingCode}
                    className="bg-dashboard-primary hover:bg-dashboard-primary/90"
                  >
                    <Link className="w-4 h-4 mr-2" />
                    {isGeneratingCode
                      ? "Generating..."
                      : "Generate Verification Code"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={verificationCode}
                        readOnly
                        className="font-mono text-center text-lg"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyVerificationCode}
                        className="border-dashboard-border-primary"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-dashboard-text-secondary" />
                      <span
                        className={`${
                          isCodeExpired()
                            ? "text-red-400"
                            : "text-dashboard-text-secondary"
                        }`}
                      >
                        {isCodeExpired()
                          ? "Code expired"
                          : `Expires in ${getTimeUntilExpiry()}`}
                      </span>
                    </div>

                    <p className="text-dashboard-text-secondary text-sm">
                      Send this code to <strong>@{status.botUsername}</strong>{" "}
                      on Telegram to complete the connection.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      {status.isLinked && preferences && (
        <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
          <CardHeader>
            <CardTitle className="text-dashboard-text-primary flex items-center gap-3">
              <Bell className="w-5 h-5 text-dashboard-primary" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(preferences).map(([key, value]) => {
              const labels = {
                leadGenerationComplete: "Lead Generation Complete",
                researchReportComplete: "Research Report Complete",
                jobFailed: "Job Failures",
                planLimitReached: "Plan Limit Reached",
                dailySummary: "Daily Summary",
                systemAnnouncements: "System Announcements",
              };

              return (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-dashboard-text-primary">
                    {labels[key as keyof typeof labels]}
                  </Label>
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) =>
                      updateNotificationPreference(
                        key as keyof NotificationPreferences,
                        checked
                      )
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Test Notifications */}
      {status.isLinked && (
        <Card className="bg-dashboard-bg-secondary/50 backdrop-blur-sm border-dashboard-border-primary">
          <CardHeader>
            <CardTitle className="text-dashboard-text-primary flex items-center gap-3">
              <Send className="w-5 h-5 text-dashboard-primary" />
              Test Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="testMessage"
                className="text-dashboard-text-primary"
              >
                Test Message
              </Label>
              <Input
                id="testMessage"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message..."
                className="bg-dashboard-bg-tertiary border-dashboard-border-primary"
              />
            </div>
            <Button
              onClick={sendTestNotification}
              disabled={isSendingTest || !testMessage.trim()}
              className="bg-dashboard-primary hover:bg-dashboard-primary/90"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSendingTest ? "Sending..." : "Send Test Notification"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
