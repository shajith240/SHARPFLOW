// Subscription types for SharpFlow

export interface SubscriptionData {
  hasActiveSubscription: boolean;
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  subscriptionStatus: string;
  subscriptionPlan?: string;
  subscriptionPeriodEnd?: string;
}

export interface SubscriptionStatus {
  status: string;
  plan: string;
  periodEnd: string;
  botStatus: string;
  hasPaypalId: boolean;
  accountCreated: string;
}

export type SubscriptionPlan = "starter" | "professional" | "ultra";
