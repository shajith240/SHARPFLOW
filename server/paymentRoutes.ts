import type { Express } from "express";
import { paypalService, PAYPAL_PLAN_IDS, PLAN_PRICING } from "./paypal";
import { storage } from "./storage";
import { isAuthenticated } from "./googleAuth";
import crypto from "crypto";

export function registerPaymentRoutes(app: Express) {
  // Create subscription
  app.post(
    "/api/payments/create-subscription",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { planId, planType } = req.body;
        const user = req.user;

        if (!planId || !planType) {
          return res
            .status(400)
            .json({ message: "Missing planId or planType" });
        }

        // Validate plan ID
        const validPlanIds = Object.values(PAYPAL_PLAN_IDS);
        if (!validPlanIds.includes(planId)) {
          return res.status(400).json({ message: "Invalid plan ID" });
        }

        const subscription = await paypalService.createSubscription({
          planId,
          userId: user.id,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`.trim(),
          userPhone: user.phone,
        });

        res.json({
          subscription: subscription,
          clientId: process.env.PAYPAL_CLIENT_ID,
        });
      } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({ message: "Failed to create subscription" });
      }
    }
  );

  // Create payment order for one-time payments
  app.post(
    "/api/payments/create-order",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { amount, currency = "USD", planType } = req.body;
        const user = req.user;

        if (!amount || !planType) {
          return res
            .status(400)
            .json({ message: "Missing amount or planType" });
        }

        const order = await paypalService.createPaymentOrder({
          amount: amount * 100, // Convert to cents
          currency: currency,
          receipt: `order_${user.id}_${Date.now()}`,
          notes: {
            userId: user.id,
            planType: planType,
          },
        });

        res.json({
          orderId: order.id,
          amount: order.purchase_units?.[0]?.amount?.value,
          currency: order.purchase_units?.[0]?.amount?.currency_code,
          clientId: process.env.PAYPAL_CLIENT_ID,
        });
      } catch (error) {
        console.error("Error creating payment order:", error);
        res.status(500).json({ message: "Failed to create payment order" });
      }
    }
  );

  // PayPal payment verification is handled through webhooks and success/cancel redirects
  // No separate verification endpoint needed for PayPal

  // Get user subscription status
  app.get(
    "/api/payments/subscription",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const user = req.user;
        const subscriptions = await storage.getUserSubscriptions(user.id);

        // Get the most recent active subscription
        const activeSubscription = subscriptions.find(
          (sub) => sub.status === "active" || sub.status === "authenticated"
        );

        res.json({
          hasActiveSubscription:
            !!activeSubscription || !!user.subscriptionPlan, // For testing: allow if user has a plan
          subscription: activeSubscription,
          subscriptionStatus: user.subscriptionStatus || "inactive",
          subscriptionPlan: user.subscriptionPlan,
          subscriptionPeriodEnd: user.subscriptionPeriodEnd,
        });
      } catch (error) {
        console.error("Error fetching subscription:", error);
        res.status(500).json({ message: "Failed to fetch subscription" });
      }
    }
  );

  // Cancel subscription
  app.post(
    "/api/payments/cancel-subscription",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { subscriptionId } = req.body;
        const user = req.user;

        if (!subscriptionId) {
          return res.status(400).json({ message: "Missing subscription ID" });
        }

        const subscription = await paypalService.cancelSubscription(
          subscriptionId
        );

        // Update user subscription status
        await storage.updateUserSubscription(user.id, {
          subscriptionStatus: "canceled",
        });

        res.json({ success: true, subscription });
      } catch (error) {
        console.error("Error canceling subscription:", error);
        res.status(500).json({ message: "Failed to cancel subscription" });
      }
    }
  );

  // Get payment history
  app.get("/api/payments/history", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const payments = await storage.getUserPayments(user.id);
      res.json({ payments });
    } catch (error) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ message: "Failed to fetch payment history" });
    }
  });

  // Get pricing plans
  app.get("/api/payments/plans", async (req, res) => {
    try {
      const plans = [
        {
          id: "starter",
          name: "Starter",
          monthlyPlanId: PAYPAL_PLAN_IDS.starter_monthly,
          yearlyPlanId: PAYPAL_PLAN_IDS.starter_yearly,
          monthlyPrice: PLAN_PRICING.starter_monthly / 100,
          yearlyPrice: PLAN_PRICING.starter_yearly / 100,
          currency: "USD",
          features: [
            "LeadGen Agent only",
            "Up to 100 leads per month",
            "Basic lead filtering by location",
            "Occupation-based targeting",
            "Industry-specific searches",
            "Email support",
          ],
        },
        {
          id: "professional",
          name: "Professional",
          monthlyPlanId: PAYPAL_PLAN_IDS.professional_monthly,
          yearlyPlanId: PAYPAL_PLAN_IDS.professional_yearly,
          monthlyPrice: PLAN_PRICING.professional_monthly / 100,
          yearlyPrice: PLAN_PRICING.professional_yearly / 100,
          currency: "USD",
          features: [
            "LeadGen Agent + LinkedIn Research Agent",
            "Up to 500 leads per month",
            "Detailed LinkedIn research reports",
            "Automated email delivery",
            "Advanced lead filtering & targeting",
            "Contact information discovery",
            "Priority email support",
          ],
        },
        {
          id: "enterprise",
          name: "Ultra",
          monthlyPlanId: PAYPAL_PLAN_IDS.enterprise_monthly,
          yearlyPlanId: PAYPAL_PLAN_IDS.enterprise_yearly,
          monthlyPrice: PLAN_PRICING.enterprise_monthly / 100,
          yearlyPrice: PLAN_PRICING.enterprise_yearly / 100,
          currency: "USD",
          features: [
            "All three agents (LeadGen + LinkedIn Research + Auto-Reply)",
            "1000+ leads per month",
            "Complete sales automation workflow",
            "Personalized email responses",
            "Follow-up sequences",
            "Performance analytics & insights",
            "Priority support & custom integrations",
            "Dedicated success manager",
          ],
        },
      ];

      res.json({ plans });
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  // PayPal webhook endpoint
  app.post("/api/payments/webhook", async (req, res) => {
    const signature = req.headers["paypal-transmission-sig"] as string;
    const body = JSON.stringify(req.body);

    try {
      // Verify webhook signature (simplified for now)
      const event = paypalService.verifyWebhookSignature(body, signature);

      // Check if we've already processed this event
      const existingEvent = await storage.getWebhookEvent(event.id);
      if (existingEvent && existingEvent.processed) {
        console.log(`Event ${event.id} already processed`);
        return res.json({ received: true });
      }

      // Store the webhook event
      await storage.createWebhookEvent({
        id: event.id,
        type: event.event_type,
        processed: false,
        data: event,
      });

      // Handle the event
      await handlePayPalWebhook(event);

      // Mark as processed
      await storage.markWebhookProcessed(event.id);

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Handle payment success callback from PayPal
  app.get("/api/payments/success", async (req: any, res) => {
    try {
      const { token, PayerID } = req.query;

      console.log("Payment success callback received:", {
        token,
        PayerID,
        sessionId: req.sessionID,
        user: req.user?.email,
      });

      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        console.log(
          "User not authenticated in success callback, redirecting to sign-in"
        );
        return res.redirect("/sign-in?error=session_expired");
      }

      const user = req.user;

      // For now, we'll activate the subscription since PayPal payment was successful
      // In production, you would verify the payment with PayPal first
      try {
        const updatedUser = await storage.updateUserSubscription(user.id, {
          subscriptionStatus: "active",
          subscriptionPlan: "professional", // You can determine this from the payment
          subscriptionPeriodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ), // 30 days
        });

        console.log("✅ Subscription activated for user:", user.email);

        // Create a subscription record
        await storage.createSubscription({
          id: crypto.randomUUID(),
          userId: user.id,
          planId: "professional",
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
        });

        // Redirect to success page
        res.redirect("/payment/success?activated=true");
      } catch (error) {
        console.error("Error activating subscription:", error);
        res.redirect("/payment/cancel?error=activation_failed");
      }
    } catch (error) {
      console.error("Payment success handler error:", error);
      res.redirect("/payment/cancel?error=processing_failed");
    }
  });

  // Handle payment cancellation
  app.get("/api/payments/cancel", async (req: any, res) => {
    console.log("Payment cancelled, redirecting to cancel page");
    res.redirect("/payment/cancel");
  });

  // Test endpoint to simulate subscription activation (for development only)
  if (process.env.NODE_ENV === "development") {
    app.post(
      "/api/payments/test-activate-subscription",
      isAuthenticated,
      async (req: any, res) => {
        try {
          const user = req.user;

          // Update user subscription status
          const updatedUser = await storage.updateUserSubscription(user.id, {
            subscriptionStatus: "active",
            subscriptionPlan: "professional",
            subscriptionPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ), // 30 days from now
          });

          // Create a subscription record
          await storage.createSubscription({
            id: crypto.randomUUID(),
            userId: user.id,
            planId: "professional",
            status: "active",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            cancelAtPeriodEnd: false,
          });

          res.json({
            message: "Subscription activated for testing",
            user: updatedUser,
          });
        } catch (error) {
          console.error("Test subscription activation error:", error);
          res
            .status(500)
            .json({ message: "Failed to activate test subscription" });
        }
      }
    );
  }
}

async function handlePayPalWebhook(event: any) {
  switch (event.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      await handleSubscriptionActivated(event.resource);
      break;

    case "BILLING.SUBSCRIPTION.PAYMENT.COMPLETED":
      await handleSubscriptionCharged(event.resource);
      break;

    case "BILLING.SUBSCRIPTION.CANCELLED":
      await handleSubscriptionCancelled(event.resource);
      break;

    case "BILLING.SUBSCRIPTION.SUSPENDED":
      await handleSubscriptionPaused(event.resource);
      break;

    case "BILLING.SUBSCRIPTION.RE-ACTIVATED":
      await handleSubscriptionResumed(event.resource);
      break;

    case "PAYMENT.CAPTURE.COMPLETED":
      await handlePaymentCaptured(event.resource);
      break;

    case "PAYMENT.CAPTURE.DENIED":
      await handlePaymentFailed(event.resource);
      break;

    default:
      console.log(`Unhandled event type: ${event.event_type}`);
  }
}

async function handleSubscriptionActivated(subscription: any) {
  const userId = subscription.custom_id;
  if (!userId) {
    console.error("No userId in subscription custom_id");
    return;
  }

  // Determine plan type from plan ID
  const planId = subscription.plan_id;
  let planType = "starter";

  if (
    planId === PAYPAL_PLAN_IDS.professional_monthly ||
    planId === PAYPAL_PLAN_IDS.professional_yearly
  ) {
    planType = "professional";
  } else if (
    planId === PAYPAL_PLAN_IDS.enterprise_monthly ||
    planId === PAYPAL_PLAN_IDS.enterprise_yearly
  ) {
    planType = "enterprise";
  }

  // Update user subscription status
  await storage.updateUserSubscription(userId, {
    paypalCustomerId: subscription.subscriber?.payer_id || "",
    subscriptionStatus: "active",
    subscriptionPlan: planType,
    subscriptionPeriodEnd: new Date(
      subscription.billing_info?.next_billing_time ||
        Date.now() + 30 * 24 * 60 * 60 * 1000
    ),
  });

  // Create or update subscription record
  try {
    await storage.createSubscription({
      id: subscription.id,
      userId,
      paypalCustomerId: subscription.subscriber?.payer_id || "",
      paypalPlanId: planId,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.start_time || Date.now()),
      currentPeriodEnd: new Date(
        subscription.billing_info?.next_billing_time ||
          Date.now() + 30 * 24 * 60 * 60 * 1000
      ),
      cancelAtPeriodEnd: false,
    });
  } catch (error) {
    // If subscription already exists, update it
    await storage.updateSubscription(subscription.id, {
      status: subscription.status,
      currentPeriodStart: new Date(subscription.start_time || Date.now()),
      currentPeriodEnd: new Date(
        subscription.billing_info?.next_billing_time ||
          Date.now() + 30 * 24 * 60 * 60 * 1000
      ),
      cancelAtPeriodEnd: false,
    });
  }
}

async function handleSubscriptionCharged(payment: any) {
  const subscriptionId = payment.billing_agreement_id;
  if (!subscriptionId) return;

  const subscription = await paypalService.getSubscription(subscriptionId);
  if (!subscription) return;

  const userId = subscription.custom_id;
  if (!userId) return;

  // Record the payment
  await storage.createPayment({
    id: payment.id,
    userId,
    subscriptionId,
    paypalCustomerId: payment.payer?.payer_id || "",
    amount: payment.amount?.value || "0",
    currency: payment.amount?.currency_code || "USD",
    status: payment.status,
    description: `Subscription payment for ${subscription.plan_id}`,
    metadata: {
      subscriptionId,
      paymentId: payment.id,
    },
  });
}

async function handleSubscriptionCancelled(subscription: any) {
  const userId = subscription.custom_id;
  if (!userId) {
    console.error("No userId in subscription custom_id");
    return;
  }

  // Update user subscription status
  await storage.updateUserSubscription(userId, {
    subscriptionStatus: "canceled",
  });

  // Update subscription record
  await storage.updateSubscription(subscription.id, {
    status: "canceled",
    cancelAtPeriodEnd: true,
  });
}

async function handleSubscriptionPaused(subscription: any) {
  const userId = subscription.custom_id;
  if (!userId) {
    console.error("No userId in subscription custom_id");
    return;
  }

  // Update user subscription status
  await storage.updateUserSubscription(userId, {
    subscriptionStatus: "paused",
  });

  // Update subscription record
  await storage.updateSubscription(subscription.id, {
    status: "paused",
  });
}

async function handleSubscriptionResumed(subscription: any) {
  const userId = subscription.custom_id;
  if (!userId) {
    console.error("No userId in subscription custom_id");
    return;
  }

  // Update user subscription status
  await storage.updateUserSubscription(userId, {
    subscriptionStatus: "active",
  });

  // Update subscription record
  await storage.updateSubscription(subscription.id, {
    status: "active",
  });
}

async function handlePaymentCaptured(payment: any) {
  // This handles one-time payments
  const userId = payment.custom_id;
  if (!userId) return;

  // Record the payment
  await storage.createPayment({
    id: payment.id,
    userId,
    subscriptionId: null,
    paypalCustomerId: payment.payer?.payer_id || "",
    amount: payment.amount?.value || "0",
    currency: payment.amount?.currency_code || "USD",
    status: "captured",
    description: `One-time payment for service`,
    metadata: {
      paymentId: payment.id,
    },
  });
}

async function handlePaymentFailed(payment: any) {
  const userId = payment.custom_id;
  if (!userId) return;

  // Record the failed payment
  await storage.createPayment({
    id: payment.id || `failed_${Date.now()}`,
    userId,
    subscriptionId: payment.billing_agreement_id || null,
    paypalCustomerId: payment.payer?.payer_id || "",
    amount: payment.amount?.value || "0",
    currency: payment.amount?.currency_code || "USD",
    status: "failed",
    description: `Failed payment for service`,
    metadata: {
      paymentId: payment.id,
      failureReason: payment.reason_code || "Payment failed",
    },
  });

  // If it's a subscription payment failure, update subscription status
  if (payment.billing_agreement_id) {
    const subscription = await paypalService.getSubscription(
      payment.billing_agreement_id
    );
    if (subscription && subscription.custom_id) {
      await storage.updateUserSubscription(subscription.custom_id, {
        subscriptionStatus: "past_due",
      });
    }
  }
}
