import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Database,
  Users,
  Activity,
  BarChart3
} from 'lucide-react';

interface IsolationCheck {
  table_name: string;
  user_data_count: number;
  total_data_count: number;
  isolation_status: string;
}

interface UserStats {
  user_email: string;
  subscription_plan: string;
  subscription_status: string;
  bot_status: string;
  total_leads: number;
  total_reports: number;
  total_bot_activity: number;
  total_campaigns: number;
  account_created: string;
  last_activity: string | null;
}

interface SubscriptionStatus {
  status: string;
  plan: string;
  periodEnd: string;
  botStatus: string;
  hasPaypalId: boolean;
  accountCreated: string;
}

export default function DataIsolationStatus() {
  const [isolationData, setIsolationData] = useState<IsolationCheck[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
    verifyDataIsolation();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscription/status');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data.subscription);
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    }
  };

  const verifyDataIsolation = async () => {
    setVerifying(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/subscription/verify-isolation');
      if (response.ok) {
        const data = await response.json();
        setIsolationData(data.details);
        setMessage({
          type: data.isolated ? 'success' : 'error',
          text: data.message
        });
      } else {
        setMessage({ type: 'error', text: 'Failed to verify data isolation' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getBotStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'configured':
        return <Badge className="bg-blue-500">Configured</Badge>;
      case 'not_configured':
        return <Badge className="bg-gray-500">Not Configured</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  const getIsolationBadge = (status: string) => {
    if (status.includes('✅')) {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Isolated</Badge>;
    } else {
      return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Breach</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verifying data isolation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Account & Data Security</h2>
          <p className="text-gray-600">Multi-tenant isolation and subscription status</p>
        </div>
        <Button onClick={verifyDataIsolation} disabled={verifying}>
          {verifying ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
          Verify Isolation
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Subscription Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptionStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Status</div>
                <div className="mt-1">{getStatusBadge(subscriptionStatus.status)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Plan</div>
                <div className="mt-1 font-medium">{subscriptionStatus.plan || 'No plan'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Bot Status</div>
                <div className="mt-1">{getBotStatusBadge(subscriptionStatus.botStatus)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Account Created</div>
                <div className="mt-1 font-medium">
                  {new Date(subscriptionStatus.accountCreated).toLocaleDateString()}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Loading subscription status...</p>
          )}
        </CardContent>
      </Card>

      {/* User Statistics */}
      {userStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Your Data Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{userStats.total_leads}</div>
                <div className="text-sm text-gray-600">Total Leads</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{userStats.total_reports}</div>
                <div className="text-sm text-gray-600">Research Reports</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{userStats.total_bot_activity}</div>
                <div className="text-sm text-gray-600">Bot Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{userStats.total_campaigns}</div>
                <div className="text-sm text-gray-600">Email Campaigns</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Isolation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Isolation Verification
          </CardTitle>
          <CardDescription>
            Ensures your data is completely isolated from other users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isolationData.length === 0 ? (
              <p className="text-gray-500">No isolation data available</p>
            ) : (
              isolationData.map((check) => (
                <div key={check.table_name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium capitalize">
                      {check.table_name.replace('_', ' ')} Table
                    </div>
                    <div className="text-sm text-gray-600">
                      Your data: {check.user_data_count} records | Total system: {check.total_data_count} records
                    </div>
                  </div>
                  <div>
                    {getIsolationBadge(check.isolation_status)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Information */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Multi-Tenant Security Features
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-700">
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Row Level Security (RLS):</strong> Database-level isolation ensures you can only access your own data</li>
            <li><strong>Dedicated Bot Instance:</strong> Your Telegram bot is completely separate from other users</li>
            <li><strong>Isolated n8n Workflow:</strong> Your workflow processes only your requests</li>
            <li><strong>Private Data Space:</strong> All leads, reports, and activities are stored in your isolated space</li>
            <li><strong>Automatic Provisioning:</strong> Your workspace is automatically set up when you subscribe</li>
            <li><strong>Real-time Verification:</strong> Continuous monitoring ensures data isolation integrity</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
