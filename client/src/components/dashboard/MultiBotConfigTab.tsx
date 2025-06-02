import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Activity,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';

interface BotConfig {
  botToken: string;
  botUsername: string;
  webhookUrl: string;
  status: 'not_configured' | 'configured' | 'active' | 'error';
  lastActivity: string | null;
}

interface BotStats {
  totalMessages: number;
  leadsGenerated: number;
  reportsCreated: number;
  lastWeekActivity: number;
}

interface ActivityLog {
  id: string;
  messageType: string;
  messageContent: string;
  processingStatus: string;
  leadsGenerated: number;
  processingTimeMs: number;
  startedAt: string;
  completedAt: string | null;
}

export default function MultiBotConfigTab() {
  const [config, setConfig] = useState<BotConfig>({
    botToken: '',
    botUsername: '',
    webhookUrl: '',
    status: 'not_configured',
    lastActivity: null
  });
  
  const [stats, setStats] = useState<BotStats>({
    totalMessages: 0,
    leadsGenerated: 0,
    reportsCreated: 0,
    lastWeekActivity: 0
  });
  
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchBotConfig();
    fetchBotStats();
    fetchActivityLogs();
  }, []);

  const fetchBotConfig = async () => {
    try {
      const response = await fetch('/api/multi-bot/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching bot config:', error);
    }
  };

  const fetchBotStats = async () => {
    try {
      const response = await fetch('/api/multi-bot/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching bot stats:', error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const response = await fetch('/api/multi-bot/activity-logs');
      if (response.ok) {
        const data = await response.json();
        setActivityLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  const saveBotConfig = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/multi-bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.botToken,
          botUsername: config.botUsername,
          webhookUrl: config.webhookUrl
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Bot configuration saved successfully!' });
        fetchBotConfig();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const testBotConnection = async () => {
    setTesting(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/multi-bot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.botToken,
          webhookUrl: config.webhookUrl
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ 
          type: 'success', 
          text: `Bot test successful! Bot: @${result.botUsername}` 
        });
        fetchBotConfig();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Bot test failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bot test failed' });
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'configured':
        return <Badge className="bg-blue-500"><Settings className="w-3 h-3 mr-1" />Configured</Badge>;
      case 'error':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge className="bg-gray-500"><AlertTriangle className="w-3 h-3 mr-1" />Not Configured</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Personal Telegram Bot</h2>
          <p className="text-gray-600">Your dedicated bot connected to your n8n workflow</p>
        </div>
        {getStatusBadge(config.status)}
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Bot Configuration
              </CardTitle>
              <CardDescription>
                Configure your personal Telegram bot and n8n workflow connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="botToken">Bot Token</Label>
                  <Input
                    id="botToken"
                    type="password"
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={config.botToken}
                    onChange={(e) => setConfig({...config, botToken: e.target.value})}
                  />
                  <p className="text-xs text-gray-500">
                    Provided by your SharpFlow administrator
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="botUsername">Bot Username</Label>
                  <Input
                    id="botUsername"
                    placeholder="your_personal_bot"
                    value={config.botUsername}
                    onChange={(e) => setConfig({...config, botUsername: e.target.value})}
                  />
                  <p className="text-xs text-gray-500">
                    Your bot's @username (without @)
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">n8n Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  placeholder="https://your-n8n-instance.com/webhook/abc123"
                  value={config.webhookUrl}
                  onChange={(e) => setConfig({...config, webhookUrl: e.target.value})}
                />
                <p className="text-xs text-gray-500">
                  Your personal n8n workflow webhook URL
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={saveBotConfig} disabled={loading || !config.botToken || !config.webhookUrl}>
                  {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Settings className="w-4 h-4 mr-2" />}
                  Save Configuration
                </Button>
                <Button variant="outline" onClick={testBotConnection} disabled={testing || !config.botToken}>
                  {testing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                  Test Bot
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security & Data Isolation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Your bot is completely isolated from other clients</li>
                <li>All your data is stored securely in your dedicated space</li>
                <li>Your n8n workflow processes only your requests</li>
                <li>No data sharing between different client accounts</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
                <p className="text-xs text-gray-600">Messages processed</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.leadsGenerated.toLocaleString()}</div>
                <p className="text-xs text-gray-600">Total leads found</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Reports Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.reportsCreated.toLocaleString()}</div>
                <p className="text-xs text-gray-600">Research reports</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.lastWeekActivity.toLocaleString()}</div>
                <p className="text-xs text-gray-600">Recent activity</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Bot Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Bot Status</span>
                  {getStatusBadge(config.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Activity</span>
                  <span className="text-sm text-gray-600">
                    {config.lastActivity ? new Date(config.lastActivity).toLocaleString() : 'Never'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bot Username</span>
                  <span className="text-sm font-mono">
                    {config.botUsername ? `@${config.botUsername}` : 'Not configured'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Bot Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activityLogs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No bot activity yet</p>
                ) : (
                  activityLogs.slice(0, 20).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium truncate max-w-md">
                          {log.messageType}: "{log.messageContent}"
                        </div>
                        <div className="text-sm text-gray-600">
                          {log.leadsGenerated} leads • {log.processingTimeMs}ms
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={log.processingStatus === 'completed' ? 'bg-green-500' : 
                                       log.processingStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}>
                          {log.processingStatus}
                        </Badge>
                        <div className="text-xs text-gray-600 mt-1">
                          {new Date(log.startedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
