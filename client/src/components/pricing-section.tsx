import React, { useState, useEffect, useRef } from "react";
import { ParallaxSection } from "@/components/ui/parallax-section";
import { useAuth } from "../hooks/useAuth";
import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { Check, Star, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import confetti from "canvas-confetti";

interface PricingPlan {
  id: string;
  name: string;
  monthlyPlanId: string;
  yearlyPlanId: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: string[];
  description: string;
  isPopular: boolean;
  buttonText: string;
  period: string;
}

export default function PricingSection() {
  const [isMonthly, setIsMonthly] = useState(true);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/payments/plans");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const plansArray = data.plans || data;

      if (!Array.isArray(plansArray)) {
        throw new Error("Plans data is not an array");
      }

      // Add missing properties to plans for original styling
      const plansWithExtras = plansArray.map((plan: any) => ({
        ...plan,
        buttonText: "Get Started",
        period: "month",
        isPopular: plan.id === "professional", // Mark professional as popular
      }));

      setPlans(plansWithExtras);
    } catch (error) {
      console.error("Error fetching plans:", error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: PricingPlan) => {
    if (!user) {
      // Redirect to sign in
      window.location.href = "/sign-in";
      return;
    }

    setProcessingPlan(plan.id);

    try {
      const planId = isMonthly ? plan.monthlyPlanId : plan.yearlyPlanId;

      // Create subscription
      const response = await fetch("/api/payments/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: planId,
          planType: plan.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create subscription");
      }

      const { subscription, clientId } = await response.json();

      // Validate order object (PayPal returns order, not subscription)
      if (!subscription || !subscription.id) {
        throw new Error("Invalid payment response from server");
      }

      // Check if order has approval links
      const approvalLink = subscription.links?.find(
        (link: any) => link.rel === "approve"
      );
      if (!approvalLink) {
        throw new Error("No approval link found in payment response");
      }

      // Redirect to PayPal for approval
      window.location.href = approvalLink.href;
    } catch (error) {
      console.error("Error creating subscription:", error);
      alert(
        `Failed to initiate subscription: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setProcessingPlan(null);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const calculateSavings = (monthlyPrice: number, yearlyPrice: number) => {
    const yearlyEquivalent = monthlyPrice * 12;
    const savings = yearlyEquivalent - yearlyPrice;
    const percentage = Math.round((savings / yearlyEquivalent) * 100);
    return { amount: savings, percentage };
  };

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);

    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: [
          "hsl(var(--primary))",
          "hsl(var(--accent))",
          "hsl(var(--secondary))",
          "#38B6FF",
          "#C1FF72",
        ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <ParallaxSection
      id="pricing"
      className="py-24 bg-background overflow-hidden relative"
      speed={0.05}
      direction="up"
    >
      <div className="relative z-10">
        <div className="container py-20 relative">
          {/* Header */}
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Choose Your Lead Generation Plan
            </h2>
            <p className="text-muted-foreground text-lg whitespace-pre-line">
              Scale your sales pipeline with AI agents that work 24/7.{"\n"}
              Start with basic lead generation and upgrade to full automation.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex flex-wrap justify-center items-center gap-4 mb-10 px-4 max-w-md mx-auto">
            <div className="flex items-center justify-between w-full bg-muted/10 p-3 rounded-xl">
              <span
                className={`font-semibold text-sm sm:text-base px-3 py-1 rounded-xl transition-colors ${
                  isMonthly
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                Monthly
              </span>
              <div className="relative inline-flex items-center mx-2 py-1">
                <Switch
                  ref={switchRef as any}
                  checked={!isMonthly}
                  onCheckedChange={handleToggle}
                  className="relative pricing-toggle"
                />
              </div>
              <span
                className={`font-semibold text-sm sm:text-base px-3 py-1 rounded-xl transition-colors ${
                  !isMonthly
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                Annual{" "}
                <span className="text-primary/80 hidden sm:inline">
                  (Save 20%)
                </span>
                <span className="text-primary/80 sm:hidden">(20% off)</span>
              </span>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading pricing plans...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && plans.length === 0 && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Unable to load pricing plans.
              </p>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchPlans();
                }}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300"
              >
                Retry
              </button>
            </div>
          )}

          {/* Pricing Cards */}
          {!loading && plans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 sm:2 gap-4">
              {plans.map((plan, index) => {
                const currentPrice = isMonthly
                  ? plan.monthlyPrice
                  : plan.yearlyPrice;
                const displayPrice = new Intl.NumberFormat("en-US").format(
                  currentPrice
                ); // Format with commas for USD

                return (
                  <motion.div
                    key={index}
                    initial={{ y: 50, opacity: 1 }}
                    whileInView={
                      isDesktop
                        ? {
                            y: plan.isPopular ? -20 : 0,
                            opacity: 1,
                            x: index === 2 ? -30 : index === 0 ? 30 : 0,
                            scale: index === 0 || index === 2 ? 0.94 : 1.0,
                          }
                        : {}
                    }
                    viewport={{ once: true }}
                    transition={{
                      duration: 1.6,
                      type: "spring",
                      stiffness: 100,
                      damping: 30,
                      delay: 0.4,
                      opacity: { duration: 0.5 },
                    }}
                    className={cn(
                      `rounded-2xl p-2 bg-background text-center lg:flex lg:flex-col lg:justify-center relative`,
                      plan.isPopular ? "z-10" : "z-0",
                      "flex flex-col",
                      !plan.isPopular && "mt-5",
                      index === 0 || index === 2
                        ? "z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-[10deg]"
                        : "z-10",
                      index === 0 && "origin-right",
                      index === 2 && "origin-left"
                    )}
                  >
                    <div className="relative h-full rounded-xl border-[0.75px] border-border">
                      {/* Glowing Effect */}
                      <GlowingEffect
                        spread={40}
                        glow={true}
                        disabled={false}
                        proximity={64}
                        inactiveZone={0.01}
                        borderWidth={3}
                        variant={plan.isPopular ? "default" : "white"}
                      />

                      <div className="relative h-full flex flex-col z-10 p-6">
                        {plan.isPopular && (
                          <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                            <Star className="text-primary-foreground h-4 w-4 fill-current" />
                            <span className="text-primary-foreground ml-1 font-sans font-semibold">
                              Popular
                            </span>
                          </div>
                        )}

                        <div className="flex-1 flex flex-col">
                          <p className="text-base font-semibold text-muted-foreground">
                            {plan.name}
                          </p>
                          <div className="mt-6 flex items-center justify-center gap-x-2">
                            <span className="text-5xl font-bold tracking-tight text-foreground">
                              ${displayPrice}
                            </span>
                            <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                              / {plan.period}
                            </span>
                          </div>

                          <p className="text-xs leading-5 text-muted-foreground">
                            {isMonthly ? "billed monthly" : "billed annually"}
                          </p>

                          <ul className="mt-5 gap-2 flex flex-col">
                            {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                                <span className="text-left">{feature}</span>
                              </li>
                            ))}
                          </ul>

                          <hr className="w-full my-4" />

                          <button
                            onClick={() => handleSubscribe(plan)}
                            disabled={processingPlan === plan.id}
                            className={cn(
                              buttonVariants({
                                variant: plan.isPopular ? "default" : "outline",
                              }),
                              "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                              "transform-gpu ring-offset-current transition-all duration-300 ease-out hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-primary-foreground",
                              processingPlan === plan.id &&
                                "opacity-50 cursor-not-allowed"
                            )}
                          >
                            {processingPlan === plan.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              plan.buttonText
                            )}
                          </button>
                          <p className="mt-6 text-xs leading-5 text-muted-foreground">
                            {plan.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#38B6FF] rounded-full filter blur-[150px] opacity-10 z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#C1FF72] rounded-full filter blur-[150px] opacity-10 z-0"></div>
    </ParallaxSection>
  );
}
