import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextEffect } from "@/components/ui/text-effect";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import {
  DashboardCard,
  MetricCard,
  StatusCard,
} from "@/components/ui/dashboard-card";
import {
  DashboardParallaxSection,
  DashboardParallaxItem,
  DashboardStaggerContainer,
  DashboardGlowEffect,
} from "@/components/ui/dashboard-parallax";
import {
  BarChart3,
  Package,
  Calendar,
  ShoppingCart,
  TrendingUp,
  Users,
  DollarSign,
  Plus,
  Search,
  Filter,
  Download,
  Settings,
  LogOut,
  Bell,
  User,
  ChevronDown,
  Activity,
  Clock,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  Mail,
  Target,
  FileText,
  Bot,
  CreditCard,
  HelpCircle,
  Calendar as CalendarIcon,
  Home,
  Building,
  Store,
  GraduationCap,
  Zap,
  BarChart,
  PieChart,
  LineChart,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
// Clean dashboard - removed unused Select components
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { LeadGenerationDashboard } from "@/components/dashboard/LeadGenerationDashboard";
import MultiBotConfigTab from "@/components/dashboard/MultiBotConfigTab";
import DataIsolationStatus from "@/components/dashboard/DataIsolationStatus";
import { TelegramSettings } from "@/components/dashboard/TelegramSettings";
import { ReportsSection } from "@/components/dashboard/ReportsSection";
import { SubscriptionPlan } from "@/types/lead-generation";

// Clean dashboard focused on lead generation only

// Simplified interface for lead generation dashboard
interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: string;
}

export default function Dashboard() {
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("leads");

  // Enhanced loading state management for seamless shimmer-to-fade transitions
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);
  const [isMessageTransitioning, setIsMessageTransitioning] = useState(false);
  const [messageOpacity, setMessageOpacity] = useState(1);
  const [isLoadingInitialized, setIsLoadingInitialized] = useState(false);
  const [shimmerCompleted, setShimmerCompleted] = useState(false);

  // Optimized loading duration for seamless shimmer-to-fade transitions
  const MINIMUM_LOADING_DURATION = 6000; // 6 seconds total for professional experience
  const FADE_TRANSITION_DURATION = 300; // Apple-style fade duration
  const MESSAGE_FADE_DURATION = 200; // Fast Apple-style transitions
  const SHIMMER_DURATION = 1200; // 1.2 seconds shimmer animation
  const MESSAGE_DISPLAY_DURATION = SHIMMER_DURATION + MESSAGE_FADE_DURATION; // Immediate transition after shimmer

  // Fast, efficient loading messages with optimized TextEffect shimmer animation
  const loadingMessages = [
    "Loading your leads...",
    "Setting up your environment...",
    "All ready, hang tight...",
  ];

  // Get user's subscription plan from auth data
  const userPlan: SubscriptionPlan = "professional"; // This should be dynamic based on user's subscription

  // Helper function to get user initials for avatar
  const getUserInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  // Clean dashboard - no mock data needed

  // Check if user has active subscription
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useQuery({
    queryKey: ["/api/payments/subscription"],
    enabled: isAuthenticated,
    staleTime: 0, // Always refetch to get latest subscription data
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: 3, // Retry failed requests
  });

  // Clean dashboard - no additional data fetching needed

  // Redirect if not authenticated or no subscription - BUT ONLY AFTER AUTH LOADING IS COMPLETE
  useEffect(() => {
    // CRITICAL: Don't redirect while auth is still loading
    if (authLoading) {
      return;
    }

    // Only redirect if auth has finished loading AND user is not authenticated
    if (!authLoading && !isAuthenticated) {
      setLocation("/sign-in");
      return;
    }

    // Only redirect if subscription data has loaded and user doesn't have active subscription
    if (
      !authLoading &&
      isAuthenticated &&
      subscriptionData !== undefined &&
      !subscriptionData.hasActiveSubscription
    ) {
      setLocation("/?subscription=required");
      return;
    }
  }, [
    authLoading,
    isAuthenticated,
    subscriptionData,
    subscriptionLoading,
    setLocation,
  ]);

  // INSTANT loading initialization - ZERO DELAY, starts immediately
  useEffect(() => {
    const shouldStartLoading =
      (authLoading || subscriptionLoading) && !isLoadingInitialized;

    if (shouldStartLoading) {
      const startTime = Date.now();

      // Set all states in a single batch to prevent multiple renders - IMMEDIATE
      setLoadingStartTime(startTime);
      setShowDashboard(false);
      setIsTransitioning(false);
      setCurrentMessageIndex(0);
      setAnimationKey(startTime); // Unique key based on start time
      setIsMessageTransitioning(false);
      setMessageOpacity(1);
      setIsLoadingInitialized(true); // Prevent re-initialization
    }
  }, [authLoading, subscriptionLoading, isLoadingInitialized]);

  // Seamless shimmer-to-fade message transitions
  useEffect(() => {
    let messageInterval: NodeJS.Timeout;

    if (loadingStartTime && !isTransitioning && !isMessageTransitioning) {
      messageInterval = setInterval(() => {
        const currentIndex = currentMessageIndex;
        const messages = [
          "Loading your leads...",
          "Setting up your environment...",
          "All ready, hang tight...",
        ];
        const nextIndex = (currentIndex + 1) % messages.length;

        // Start fade transition immediately after shimmer completes
        setIsMessageTransitioning(true);

        // Fade out current message
        setMessageOpacity(0);

        setTimeout(() => {
          // Switch to next message
          setCurrentMessageIndex(nextIndex);
          setAnimationKey(Date.now()); // Fresh animation key
          setShimmerCompleted(false); // Reset shimmer state

          // Fade in new message
          setTimeout(() => {
            setMessageOpacity(1);

            // Complete transition
            setTimeout(() => {
              setIsMessageTransitioning(false);
            }, MESSAGE_FADE_DURATION);
          }, 50); // Brief delay to ensure DOM update
        }, MESSAGE_FADE_DURATION);
      }, MESSAGE_DISPLAY_DURATION); // Shimmer duration + fade duration for seamless flow
    }

    return () => {
      if (messageInterval) {
        clearInterval(messageInterval);
      }
    };
  }, [
    loadingStartTime,
    isTransitioning,
    isMessageTransitioning,
    currentMessageIndex,
  ]);

  // Handle immediate fade-out when shimmer animation completes
  const handleShimmerComplete = () => {
    setShimmerCompleted(true);
  };

  // Handle transition to dashboard with minimum duration
  useEffect(() => {
    const shouldShowDashboard =
      !authLoading &&
      isAuthenticated &&
      !subscriptionLoading &&
      subscriptionData?.hasActiveSubscription;

    if (
      shouldShowDashboard &&
      loadingStartTime &&
      !showDashboard &&
      !isTransitioning
    ) {
      const elapsedTime = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, MINIMUM_LOADING_DURATION - elapsedTime);

      if (remainingTime > 0) {
        // Wait for minimum duration, then start transition
        setTimeout(() => {
          setIsTransitioning(true);

          // After fade transition, show dashboard
          setTimeout(() => {
            setShowDashboard(true);
            setLoadingStartTime(null);
            setIsLoadingInitialized(false); // Reset for next time
          }, FADE_TRANSITION_DURATION);
        }, remainingTime);
      } else {
        // Minimum time already elapsed, start transition immediately
        setIsTransitioning(true);

        setTimeout(() => {
          setShowDashboard(true);
          setLoadingStartTime(null);
          setIsLoadingInitialized(false); // Reset for next time
        }, FADE_TRANSITION_DURATION);
      }
    }
  }, [
    authLoading,
    isAuthenticated,
    subscriptionLoading,
    subscriptionData,
    loadingStartTime,
    showDashboard,
    isTransitioning,
  ]);

  // Show loading while checking authentication or subscription, or during minimum duration
  if (
    !showDashboard &&
    (authLoading ||
      (!authLoading && !isAuthenticated) ||
      (isAuthenticated && subscriptionLoading) ||
      (isAuthenticated && subscriptionData === undefined) ||
      loadingStartTime !== null)
  ) {
    const loadingMessage = authLoading
      ? "Checking authentication..."
      : !authLoading && !isAuthenticated
      ? "Redirecting to sign-in..."
      : "Loading subscription data...";

    return (
      <div
        className={`min-h-screen bg-black flex items-center justify-center transition-opacity duration-300 ${
          isTransitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="text-center">
          {/* Premium TextEffect with Shimmer Animation */}
          <div
            className="transition-opacity duration-250 ease-out"
            style={{
              opacity: messageOpacity,
              transitionDuration: `${MESSAGE_FADE_DURATION}ms`,
            }}
          >
            <TextEffect
              key={`shimmer-${currentMessageIndex}-${animationKey}`}
              className="text-3xl font-medium text-white font-sans"
              preset="shimmer"
              per="char"
              trigger={true}
              delay={0}
              onAnimationComplete={handleShimmerComplete}
            >
              {loadingMessages[currentMessageIndex]}
            </TextEffect>
          </div>
        </div>
      </div>
    );
  }

  // Show access restricted only after subscription data has loaded and user doesn't have subscription
  if (!subscriptionData?.hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          {/* SharpFlow Logo */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#C1FF72] mb-2">
              SharpFlow
            </h1>
            <p className="text-slate-300 text-lg">Lead Generation System</p>
          </div>

          {/* Access Restricted Message */}
          <div className="mb-8">
            <TextEffect
              className="text-2xl font-bold mb-4 text-red-400 font-sans"
              preset="fade"
              per="word"
              trigger={true}
              delay={0.2}
            >
              Access Restricted
            </TextEffect>
            <p className="text-slate-300 text-lg mt-4">
              You need an active subscription to access the dashboard.
            </p>
          </div>

          <Button
            onClick={() => setLocation("/")}
            className="bg-[#C1FF72] text-black hover:bg-[#A8E85A] px-8 py-3 text-lg font-medium"
          >
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  // Clean dashboard - no additional loading needed

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-dashboard-bg-primary via-dashboard-bg-secondary to-dashboard-bg-primary transition-opacity duration-300 ${
        showDashboard ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Enhanced Dashboard Header with Scroll Behavior */}
      <DashboardHeader
        title="SharpFlow"
        subtitle="Lead Generation System"
        showNotifications={true}
      />

      {/* Main Dashboard Content with Parallax Effects */}
      <DashboardParallaxSection
        className="pt-20 pb-8"
        backgroundPattern="dots"
        speed={0.1}
      >
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Enhanced Welcome Section with Parallax */}
          <DashboardParallaxItem direction="up" distance={30} delay={0.1}>
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-dashboard-text-primary flex items-center">
                    👋 Hello,{" "}
                    {user?.firstName || user?.email?.split("@")[0] || "User"}!
                  </h1>
                  <p className="text-dashboard-text-secondary mt-1">
                    Plan:{" "}
                    <span className="text-dashboard-text-accent font-medium">
                      {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}{" "}
                      Plan
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </DashboardParallaxItem>

          {/* Enhanced Navigation Tabs */}
          <DashboardParallaxItem direction="up" distance={20} delay={0.4}>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="grid w-full grid-cols-6 bg-dashboard-bg-tertiary backdrop-blur-sm border border-dashboard-border-primary">
                <TabsTrigger
                  value="leads"
                  className="data-[state=active]:bg-dashboard-secondary data-[state=active]:text-dashboard-bg-primary text-dashboard-text-secondary hover:text-dashboard-text-primary transition-colors"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Leads
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="data-[state=active]:bg-dashboard-secondary data-[state=active]:text-dashboard-bg-primary text-dashboard-text-secondary hover:text-dashboard-text-primary transition-colors"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Reports
                </TabsTrigger>
                <TabsTrigger
                  value="bot-config"
                  className="data-[state=active]:bg-dashboard-secondary data-[state=active]:text-dashboard-bg-primary text-dashboard-text-secondary hover:text-dashboard-text-primary transition-colors"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  Bot Config
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="data-[state=active]:bg-dashboard-secondary data-[state=active]:text-dashboard-bg-primary text-dashboard-text-secondary hover:text-dashboard-text-primary transition-colors"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger
                  value="telegram"
                  className="data-[state=active]:bg-dashboard-secondary data-[state=active]:text-dashboard-bg-primary text-dashboard-text-secondary hover:text-dashboard-text-primary transition-colors"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Telegram
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="data-[state=active]:bg-dashboard-secondary data-[state=active]:text-dashboard-bg-primary text-dashboard-text-secondary hover:text-dashboard-text-primary transition-colors"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </TabsTrigger>
              </TabsList>

              {/* Leads Tab - Clean Lead Generation Dashboard */}
              <TabsContent value="leads" className="space-y-6">
                <LeadGenerationDashboard
                  userPlan={userPlan}
                  className="space-y-8"
                />
              </TabsContent>

              {/* Reports Tab - Research Reports Section */}
              <TabsContent value="reports" className="space-y-6">
                <ReportsSection />
              </TabsContent>

              {/* Bot Configuration Tab */}
              <TabsContent value="bot-config" className="space-y-6">
                <MultiBotConfigTab />
              </TabsContent>

              {/* Security & Data Isolation Tab */}
              <TabsContent value="security" className="space-y-6">
                <DataIsolationStatus />
              </TabsContent>

              {/* Telegram Configuration Tab */}
              <TabsContent value="telegram" className="space-y-6">
                <TelegramSettings />
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-6">
                <h2 className="text-2xl font-bold text-white">
                  Billing & Account Management
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Current Plan */}
                  <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <span className="flex items-center">
                          <CreditCard className="h-5 w-5 mr-2 text-[#C1FF72]" />
                          Current Plan
                        </span>
                        <Badge className="bg-[#C1FF72]/20 text-[#C1FF72]">
                          {subscriptionData?.subscriptionPlan || "Professional"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-white/80">
                          <span>Plan:</span>
                          <span className="text-white">
                            {subscriptionData?.subscriptionPlan ||
                              "Professional"}
                          </span>
                        </div>
                        <div className="flex justify-between text-white/80">
                          <span>Billing Cycle:</span>
                          <span className="text-white">Monthly</span>
                        </div>
                        <div className="flex justify-between text-white/80">
                          <span>Next Billing:</span>
                          <span className="text-white">
                            {subscriptionData?.subscriptionPeriodEnd
                              ? new Date(
                                  subscriptionData.subscriptionPeriodEnd
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="pt-4 space-y-2">
                        <Button className="w-full bg-[#38B6FF] text-white hover:bg-[#2A9FE8]">
                          Upgrade Plan
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10"
                        >
                          Change Billing Cycle
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment History */}
                  <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <span className="flex items-center">
                          <DollarSign className="h-5 w-5 mr-2 text-[#38B6FF]" />
                          Payment History
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-white font-medium">
                              Professional Plan
                            </p>
                            <p className="text-white/60 text-sm">
                              Dec 24, 2024
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">$49.99</p>
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Paid
                            </Badge>
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-white font-medium">
                              Professional Plan
                            </p>
                            <p className="text-white/60 text-sm">
                              Nov 24, 2024
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-medium">$49.99</p>
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Paid
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Method */}
                <Card className="bg-black/20 backdrop-blur-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-purple-400" />
                      Payment Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-500/20 rounded">
                          <CreditCard className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">PayPal</p>
                          <p className="text-white/60 text-sm">
                            Connected account
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        Update
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </DashboardParallaxItem>
        </main>
      </DashboardParallaxSection>
    </div>
  );
}
