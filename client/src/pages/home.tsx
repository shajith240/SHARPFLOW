import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { SubscriptionData } from "@/types/subscription";
import Header from "../components/header";
import HeroSection from "../components/hero-section";
import ServicesSection from "../components/services-section";
import StatsSection from "../components/stats-section";
import PricingSection from "../components/pricing-section";
import NewTestimonialsSection from "../components/new-testimonials-section";
import ContactSection from "../components/contact-section";
import Footer from "../components/footer";

export default function Home() {
  console.log("🏠 [HOME] Component rendering...");

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  console.log("🏠 [HOME] Auth state:", {
    user,
    isAuthenticated,
    authLoading,
    userExists: !!user,
  });

  // Check if authenticated user has active subscription
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useQuery<SubscriptionData>({
    queryKey: ["/api/payments/subscription"],
    enabled: isAuthenticated && !authLoading, // Only check subscription if user is authenticated
    staleTime: 0, // Always refetch to get latest subscription data
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: 3, // Retry failed requests
  });

  console.log("🏠 [HOME] Subscription state:", {
    subscriptionLoading,
    subscriptionData,
    hasActiveSubscription: subscriptionData?.hasActiveSubscription,
  });

  // Auto-redirect to dashboard if user has active subscription
  useEffect(() => {
    console.log("🔍 [HOME] useEffect - Subscription check:", {
      authLoading,
      isAuthenticated,
      subscriptionLoading,
      subscriptionData: !!subscriptionData,
      hasActiveSubscription: subscriptionData?.hasActiveSubscription,
    });

    // Don't redirect while auth or subscription is still loading
    if (authLoading || (isAuthenticated && subscriptionLoading)) {
      console.log("⏳ [HOME] Still loading, waiting...");
      return;
    }

    // Redirect to dashboard if user is authenticated and has active subscription
    if (
      !authLoading &&
      isAuthenticated &&
      !subscriptionLoading &&
      subscriptionData &&
      subscriptionData.hasActiveSubscription
    ) {
      console.log(
        "✅ [HOME] User has active subscription, redirecting to dashboard"
      );
      setLocation("/dashboard");
      return;
    }

    if (
      isAuthenticated &&
      subscriptionData &&
      !subscriptionData.hasActiveSubscription
    ) {
      console.log(
        "ℹ️ [HOME] User authenticated but no active subscription, staying on homepage"
      );
    }

    if (!isAuthenticated) {
      console.log("ℹ️ [HOME] User not authenticated, staying on homepage");
    }
  }, [
    authLoading,
    isAuthenticated,
    subscriptionLoading,
    subscriptionData,
    setLocation,
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <HeroSection />
      <ServicesSection />
      <StatsSection />
      <PricingSection />
      <NewTestimonialsSection />
      <ContactSection />
      <Footer />
    </div>
  );
}
