import {
  Client,
  Environment,
  OrdersController,
  OrderRequest,
  CheckoutPaymentIntent,
} from "@paypal/paypal-server-sdk";

// Plan pricing in USD (cents - smallest currency unit)
export const PLAN_PRICING = {
  starter_monthly: 2900, // $29.00
  starter_yearly: 27900, // $279.00 (20% discount)
  professional_monthly: 9900, // $99.00
  professional_yearly: 94900, // $949.00 (20% discount)
  enterprise_monthly: 19900, // $199.00
  enterprise_yearly: 190900, // $1909.00 (20% discount)
};

// PayPal Plan IDs (will be updated with actual IDs after creating plans)
export const PAYPAL_PLAN_IDS = {
  starter_monthly: "P-STARTER-MONTHLY-USD",
  starter_yearly: "P-STARTER-YEARLY-USD",
  professional_monthly: "P-PROFESSIONAL-MONTHLY-USD",
  professional_yearly: "P-PROFESSIONAL-YEARLY-USD",
  enterprise_monthly: "P-ENTERPRISE-MONTHLY-USD",
  enterprise_yearly: "P-ENTERPRISE-YEARLY-USD",
};

// Initialize PayPal client
const environment =
  process.env.NODE_ENV === "production"
    ? Environment.Live
    : Environment.Sandbox;

const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID || "PLACEHOLDER_CLIENT_ID",
    oAuthClientSecret:
      process.env.PAYPAL_CLIENT_SECRET || "PLACEHOLDER_CLIENT_SECRET",
  },
  environment: environment,
});

// Initialize controllers - correct way according to PayPal docs
const ordersController = new OrdersController(paypalClient);

export interface CreateSubscriptionParams {
  planId: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
}

export interface CreatePaymentOrderParams {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, any>;
}

class PayPalService {
  async createSubscription(params: CreateSubscriptionParams) {
    try {
      const { planId, userId, userEmail, userName } = params;

      // Note: PayPal Server SDK doesn't support subscriptions yet
      // Creating a one-time payment order instead

      // Get price based on plan ID
      let amount = "29.00";
      let description = "SharpFlow Starter Plan";

      switch (planId) {
        case PAYPAL_PLAN_IDS.starter_monthly:
          amount = (PLAN_PRICING.starter_monthly / 100).toFixed(2);
          description = "SharpFlow Starter Plan - Monthly";
          break;
        case PAYPAL_PLAN_IDS.starter_yearly:
          amount = (PLAN_PRICING.starter_yearly / 100).toFixed(2);
          description = "SharpFlow Starter Plan - Yearly";
          break;
        case PAYPAL_PLAN_IDS.professional_monthly:
          amount = (PLAN_PRICING.professional_monthly / 100).toFixed(2);
          description = "SharpFlow Professional Plan - Monthly";
          break;
        case PAYPAL_PLAN_IDS.professional_yearly:
          amount = (PLAN_PRICING.professional_yearly / 100).toFixed(2);
          description = "SharpFlow Professional Plan - Yearly";
          break;
        case PAYPAL_PLAN_IDS.enterprise_monthly:
          amount = (PLAN_PRICING.enterprise_monthly / 100).toFixed(2);
          description = "SharpFlow Ultra Plan - Monthly";
          break;
        case PAYPAL_PLAN_IDS.enterprise_yearly:
          amount = (PLAN_PRICING.enterprise_yearly / 100).toFixed(2);
          description = "SharpFlow Ultra Plan - Yearly";
          break;
      }

      const orderRequest: OrderRequest = {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: "USD",
              value: amount,
            },
            description: description,
            customId: userId,
          },
        ],
        applicationContext: {
          brandName: "SharpFlow",
          locale: "en-US",
          landingPage: "BILLING",
          shippingPreference: "NO_SHIPPING",
          userAction: "PAY_NOW",
          returnUrl: `${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/api/payments/success`,
          cancelUrl: `${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/api/payments/cancel`,
        },
      };

      const response = await ordersController.ordersCreate({
        body: orderRequest,
      });

      return response.result;
    } catch (error) {
      console.error("PayPal subscription creation error:", error);
      throw new Error("Failed to create PayPal subscription");
    }
  }

  async createPaymentOrder(params: CreatePaymentOrderParams) {
    try {
      const { amount, currency, receipt, notes } = params;

      const request: OrderRequest = {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            referenceId: receipt,
            amount: {
              currencyCode: currency,
              value: (amount / 100).toFixed(2), // Convert cents to dollars
            },
            description: `ARTIVANCE ${notes.planType} Plan`,
            customId: notes.userId,
          },
        ],
        applicationContext: {
          brandName: "ARTIVANCE",
          locale: "en-US",
          landingPage: "BILLING",
          shippingPreference: "NO_SHIPPING",
          userAction: "PAY_NOW",
          returnUrl: `${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/api/payments/success`,
          cancelUrl: `${
            process.env.CLIENT_URL || "http://localhost:3000"
          }/api/payments/cancel`,
        },
      };

      const response = await ordersController.ordersCreate({
        body: request,
      });

      return response.result;
    } catch (error) {
      console.error("PayPal order creation error:", error);
      throw new Error("Failed to create PayPal order");
    }
  }

  async getSubscription(subscriptionId: string) {
    // Note: PayPal Server SDK doesn't support subscriptions yet
    // This is a placeholder for future implementation
    console.warn("PayPal subscriptions not supported in current SDK version");
    return { id: subscriptionId, status: "active" };
  }

  async cancelSubscription(
    subscriptionId: string,
    reason = "User requested cancellation"
  ) {
    // Note: PayPal Server SDK doesn't support subscriptions yet
    // This is a placeholder for future implementation
    console.warn(
      "PayPal subscription cancellation not supported in current SDK version"
    );
    return { id: subscriptionId, status: "cancelled" };
  }

  async getPayment(paymentId: string) {
    try {
      // Use orders API to get order details instead
      const response = await ordersController.ordersGet({
        id: paymentId,
      });
      return response.result;
    } catch (error) {
      console.error("PayPal get payment error:", error);
      throw new Error("Failed to get PayPal payment");
    }
  }

  verifyWebhookSignature(body: string, signature: string): any {
    // PayPal webhook verification will be implemented
    // For now, return parsed body
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error("Invalid webhook payload");
    }
  }
}

export const paypalService = new PayPalService();

// Helper function for backward compatibility
export async function createSubscription(params: CreateSubscriptionParams) {
  return paypalService.createSubscription(params);
}
