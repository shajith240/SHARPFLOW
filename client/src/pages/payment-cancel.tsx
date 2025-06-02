import React from "react";
import { useLocation } from "wouter";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function PaymentCancel() {
  const [, setLocation] = useLocation();

  const handleRetry = () => {
    setLocation("/#pricing");
  };

  const handleGoHome = () => {
    setLocation("/");
  };

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
          className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <XCircle className="w-12 h-12 text-orange-600" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-foreground mb-4"
        >
          Payment Cancelled
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-6 text-lg"
        >
          Your payment was cancelled. No charges have been made to your account.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-muted/20 rounded-lg p-4 mb-6"
        >
          <h3 className="font-semibold text-foreground mb-2">Need Help?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Check your payment method details</li>
            <li>• Try a different payment method</li>
            <li>• Contact our support team</li>
            <li>• Review our pricing plans</li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={handleRetry}
            className="bg-gradient-to-r from-[#C1FF72] to-[#38B6FF] text-black px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300 flex items-center gap-2 justify-center"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>

          <button
            onClick={handleGoHome}
            className="bg-muted text-foreground border border-border px-6 py-3 rounded-lg font-semibold hover:bg-muted/80 transition-all duration-300 flex items-center gap-2 justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Home
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-muted-foreground mt-6"
        >
          If you continue to experience issues, please contact our support team at{" "}
          <a href="mailto:support@artivance.com" className="text-[#38B6FF] hover:underline">
            support@artivance.com
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
}
