import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Settings, 
  CheckCircle, 
  Mail, 
  ArrowRight,
  Sparkles,
  Shield,
  Zap
} from "lucide-react";

interface PendingActivationProps {
  userEmail: string;
  subscriptionPlan: string;
  subscriptionDate: string;
  onRefresh?: () => void;
}

const planDisplayNames: Record<string, string> = {
  falcon_individual: "Falcon Individual",
  sage_individual: "Sage Individual", 
  sentinel_individual: "Sentinel Individual",
  professional_combo: "Professional Combo",
  ultra_premium: "Ultra Premium"
};

const planFeatures: Record<string, string[]> = {
  falcon_individual: ["Lead Generation Agent", "LinkedIn Prospecting", "Apollo Integration"],
  sage_individual: ["Research Agent", "Market Analysis", "Perplexity Integration"],
  sentinel_individual: ["Email Automation", "Gmail Integration", "Calendar Booking"],
  professional_combo: ["Falcon + Sage Agents", "Lead Gen + Research", "Multi-platform Integration"],
  ultra_premium: ["All AI Agents", "Complete Automation", "Premium Support", "Advanced Analytics"]
};

export function PendingActivation({ 
  userEmail, 
  subscriptionPlan, 
  subscriptionDate,
  onRefresh 
}: PendingActivationProps) {
  const planName = planDisplayNames[subscriptionPlan] || subscriptionPlan;
  const features = planFeatures[subscriptionPlan] || [];

  const handleContactSupport = () => {
    window.open(`mailto:shajith240@gmail.com?subject=SharpFlow Activation Status - ${userEmail}&body=Hi, I'm checking on the activation status for my ${planName} subscription. Please let me know when my dashboard will be ready. Thanks!`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* SharpFlow Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#C1FF72] mb-2">
            SharpFlow
          </h1>
          <p className="text-slate-300 text-lg">AI-Powered Lead Generation</p>
        </div>

        {/* Main Status Card */}
        <Card className="bg-gray-900/80 border-gray-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-yellow-500/20 rounded-full w-fit">
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
            <CardTitle className="text-2xl text-white mb-2">
              Dashboard Under Construction
            </CardTitle>
            <CardDescription className="text-lg text-gray-300">
              Your dashboard is being constructed within 5 hours. You will be notified once it's ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subscription Details */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Plan:</span>
                <Badge variant="secondary" className="bg-[#C1FF72] text-black font-semibold">
                  {planName}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-white">{userEmail}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Subscribed:</span>
                <span className="text-white">
                  {new Date(subscriptionDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Plan Features */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#38B6FF]" />
                Your {planName} Includes:
              </h3>
              <div className="grid gap-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 text-gray-300">
                    <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup Process */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#38B6FF]" />
                Setup Process:
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-300">Payment Confirmed</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-300">Configuring AI Agents</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-gray-400">Dashboard Activation (Pending)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={onRefresh}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Check Status
              </Button>
              <Button
                onClick={handleContactSupport}
                className="flex-1 bg-[#38B6FF] hover:bg-[#38B6FF]/80 text-white"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4 mt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-blue-300 font-medium">Secure Setup</h4>
                  <p className="text-blue-200/80 text-sm">
                    Our team is manually configuring your AI agents with enterprise-grade security. 
                    This ensures your data remains completely isolated and secure.
                  </p>
                </div>
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center pt-4 border-t border-gray-700">
              <p className="text-gray-300">
                Thanks for subscribing to <span className="text-[#C1FF72] font-semibold">{planName}</span>. 
                Have a nice day! 🚀
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
