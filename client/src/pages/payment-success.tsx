import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { useQueryClient } from "@tanstack/react-query";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const activated = urlParams.get("activated");
    const errorParam = urlParams.get("error");

    if (errorParam) {
      setError(`Payment processing error: ${errorParam}`);
      setLoading(false);
      return;
    }

    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#38B6FF", "#C1FF72", "#FFD700"],
    });

    // Simulate processing time and invalidate queries
    const timer = setTimeout(async () => {
      try {
        // If subscription was activated, invalidate auth and subscription queries
        if (activated === "true") {
          // Invalidate and refetch user data and subscription status
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          await queryClient.invalidateQueries({
            queryKey: ["/api/payments/subscription"],
          });

          // Wait a bit more for queries to refetch
          setTimeout(() => {
            setLoading(false);
          }, 1000);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Payment success error:", error);
        setLoading(false);
      }
    }, 2000);

    return () => {
      clearTimeout(timer);
    };
  }, [queryClient]);

  const handleContinue = async () => {
    try {
      // Ensure queries are fresh before navigation
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      await queryClient.invalidateQueries({
        queryKey: ["/api/payments/subscription"],
      });

      // Wait longer for queries to refetch and complete
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Prefetch the queries to ensure they're ready
      await queryClient.prefetchQuery({ queryKey: ["/api/auth/user"] });
      await queryClient.prefetchQuery({
        queryKey: ["/api/payments/subscription"],
      });

      setLocation("/dashboard");
    } catch (error) {
      console.error("Error in handleContinue:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#C1FF72] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Processing Your Subscription
          </h2>
          <p className="text-muted-foreground">
            Please wait while we confirm your payment...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">✕</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Payment Error
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={handleContinue}
            className="bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] text-black px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-md mx-auto p-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-black" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-foreground mb-4"
        >
          🎉 Welcome to ARTIVANCE!
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-6 text-lg"
        >
          Your subscription has been successfully activated. You now have access
          to all the powerful AI automation features.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-muted/20 rounded-lg p-4 mb-6"
        >
          <h3 className="font-semibold text-foreground mb-2">What's Next?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Access your dashboard to manage products & services</li>
            <li>• Create and track orders & bookings</li>
            <li>• View analytics and performance metrics</li>
            <li>• Get 24/7 support when you need it</li>
          </ul>
        </motion.div>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={handleContinue}
          className="bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] text-black px-8 py-4 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2 mx-auto"
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5" />
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-muted-foreground mt-4"
        >
          You will receive a confirmation email shortly with your subscription
          details.
        </motion.p>
      </motion.div>
    </div>
  );
}
