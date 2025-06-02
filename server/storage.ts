import { supabase } from "./db";
import type {
  User,
  UpsertUser,
  ContactSubmission,
  InsertContactSubmission,
  Subscription,
  Payment,
  WebhookEvent,
  Product,
  InsertProduct,
  Service,
  InsertService,
  Analytics,
  InsertAnalytics,
  Booking,
  InsertBooking,
  Order,
  InsertOrder,
  OrderItem,
  InsertOrderItem,
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(
    userId: string,
    subscriptionData: {
      paypalCustomerId?: string;
      subscriptionStatus?: string;
      subscriptionPlan?: string;
      subscriptionPeriodEnd?: Date;
    }
  ): Promise<User>;

  // Contact form operations
  createContactSubmission(
    submission: InsertContactSubmission
  ): Promise<ContactSubmission>;

  // Subscription operations
  createSubscription(
    subscription: Omit<Subscription, "createdAt" | "updatedAt">
  ): Promise<Subscription>;
  updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription>;
  getSubscription(subscriptionId: string): Promise<Subscription | undefined>;
  getUserSubscriptions(userId: string): Promise<Subscription[]>;

  // Payment operations
  createPayment(payment: Omit<Payment, "createdAt">): Promise<Payment>;
  getPayment(paymentId: string): Promise<Payment | undefined>;
  getUserPayments(userId: string): Promise<Payment[]>;

  // Webhook operations
  createWebhookEvent(
    event: Omit<WebhookEvent, "createdAt">
  ): Promise<WebhookEvent>;
  getWebhookEvent(eventId: string): Promise<WebhookEvent | undefined>;
  markWebhookProcessed(eventId: string): Promise<void>;

  // Dashboard operations
  // Products
  getUserProducts(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      category?: string;
      status?: string;
      search?: string;
    }
  ): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Services
  getUserServices(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      category?: string;
      status?: string;
      search?: string;
    }
  ): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<Service>): Promise<Service>;
  deleteService(id: string): Promise<void>;

  // Analytics
  getUserAnalytics(
    userId: string,
    days?: number,
    options?: {
      metricType?: string;
      category?: string;
    }
  ): Promise<Analytics[]>;
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;

  // Orders
  getUserOrders(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    }
  ): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  updateOrderStatus(id: string, status: string): Promise<Order>;

  // Bookings
  getUserBookings(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    }
  ): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: string): Promise<Booking>;
}

export class SupabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return undefined;
        }
        throw error;
      }

      // Map snake_case database columns to camelCase TypeScript interface
      const user: User = {
        id: data.id,
        email: data.email,
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        profileImageUrl: data.profile_image_url || "",
        paypalCustomerId: data.paypal_customer_id,
        subscriptionStatus: data.subscription_status,
        subscriptionPlan: data.subscription_plan,
        subscriptionPeriodEnd: data.subscription_period_end
          ? new Date(data.subscription_period_end)
          : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return user;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned
          return undefined;
        }
        throw error;
      }

      // Map snake_case database columns to camelCase TypeScript interface
      const user: User = {
        id: data.id,
        email: data.email,
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        profileImageUrl: data.profile_image_url || "",
        paypalCustomerId: data.paypal_customer_id,
        subscriptionStatus: data.subscription_status,
        subscriptionPlan: data.subscription_plan,
        subscriptionPeriodEnd: data.subscription_period_end
          ? new Date(data.subscription_period_end)
          : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return user;
    } catch (error) {
      console.error("Error getting user by email:", error);
      return undefined;
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const now = new Date().toISOString();
      // Use snake_case column names to match database schema
      const userWithTimestamps = {
        id: userData.id,
        email: userData.email,
        first_name: userData.firstName || "",
        last_name: userData.lastName || "",
        profile_image_url: userData.profileImageUrl || "",
        paypal_customer_id: userData.paypalCustomerId,
        subscription_status: userData.subscriptionStatus || "inactive",
        subscription_plan: userData.subscriptionPlan,
        subscription_period_end: userData.subscriptionPeriodEnd?.toISOString(),
        created_at: now,
        updated_at: now,
      };

      console.log("🔍 Attempting to upsert user:", userWithTimestamps);

      const { data, error } = await supabase
        .from("users")
        .upsert(userWithTimestamps, {
          onConflict: "id",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Map snake_case database columns to camelCase TypeScript interface
      const user: User = {
        id: data.id,
        email: data.email,
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        profileImageUrl: data.profile_image_url || "",
        paypalCustomerId: data.paypal_customer_id,
        subscriptionStatus: data.subscription_status,
        subscriptionPlan: data.subscription_plan,
        subscriptionPeriodEnd: data.subscription_period_end
          ? new Date(data.subscription_period_end)
          : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return user;
    } catch (error) {
      console.error("Error upserting user:", error);
      throw error;
    }
  }

  // Contact form operations
  async createContactSubmission(
    submission: InsertContactSubmission
  ): Promise<ContactSubmission> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const submissionWithTimestamp = {
        ...submission,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("contact_submissions")
        .insert(submissionWithTimestamp)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as ContactSubmission;
    } catch (error) {
      console.error("Error creating contact submission:", error);
      throw error;
    }
  }

  // User subscription update
  async updateUserSubscription(
    userId: string,
    subscriptionData: {
      paypalCustomerId?: string;
      subscriptionStatus?: string;
      subscriptionPlan?: string;
      subscriptionPeriodEnd?: Date;
    }
  ): Promise<User> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (subscriptionData.paypalCustomerId) {
        updateData.paypal_customer_id = subscriptionData.paypalCustomerId;
      }
      if (subscriptionData.subscriptionStatus) {
        updateData.subscription_status = subscriptionData.subscriptionStatus;
      }
      if (subscriptionData.subscriptionPlan) {
        updateData.subscription_plan = subscriptionData.subscriptionPlan;
      }
      if (subscriptionData.subscriptionPeriodEnd) {
        updateData.subscription_period_end =
          subscriptionData.subscriptionPeriodEnd.toISOString();
      }

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const user: User = {
        id: data.id,
        email: data.email,
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        profileImageUrl: data.profile_image_url || "",
        paypalCustomerId: data.paypal_customer_id,
        subscriptionStatus: data.subscription_status,
        subscriptionPlan: data.subscription_plan,
        subscriptionPeriodEnd: data.subscription_period_end
          ? new Date(data.subscription_period_end)
          : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      return user;
    } catch (error) {
      console.error("Error updating user subscription:", error);
      throw error;
    }
  }

  // Subscription operations
  async createSubscription(
    subscription: Omit<Subscription, "createdAt" | "updatedAt">
  ): Promise<Subscription> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const now = new Date().toISOString();
      const subscriptionData = {
        id: subscription.id,
        user_id: subscription.userId,
        paypal_customer_id: subscription.paypalCustomerId,
        paypal_plan_id: subscription.paypalPlanId,
        status: subscription.status,
        current_period_start: subscription.currentPeriodStart.toISOString(),
        current_period_end: subscription.currentPeriodEnd.toISOString(),
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabase
        .from("subscriptions")
        .insert(subscriptionData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        paypalCustomerId: data.paypal_customer_id,
        paypalPlanId: data.paypal_plan_id,
        status: data.status,
        currentPeriodStart: new Date(data.current_period_start),
        currentPeriodEnd: new Date(data.current_period_end),
        cancelAtPeriodEnd: data.cancel_at_period_end,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", subscriptionId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        paypalCustomerId: data.paypal_customer_id,
        paypalPlanId: data.paypal_plan_id,
        status: data.status,
        currentPeriodStart: new Date(data.current_period_start),
        currentPeriodEnd: new Date(data.current_period_end),
        cancelAtPeriodEnd: data.cancel_at_period_end,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error("Error updating subscription:", error);
      throw error;
    }
  }

  async getSubscription(
    subscriptionId: string
  ): Promise<Subscription | undefined> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", subscriptionId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return undefined;
        }
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        paypalCustomerId: data.paypal_customer_id,
        paypalPlanId: data.paypal_plan_id,
        status: data.status,
        currentPeriodStart: new Date(data.current_period_start),
        currentPeriodEnd: new Date(data.current_period_end),
        cancelAtPeriodEnd: data.cancel_at_period_end,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error("Error getting subscription:", error);
      return undefined;
    }
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data.map((item) => ({
        id: item.id,
        userId: item.user_id,
        paypalCustomerId: item.paypal_customer_id,
        paypalPlanId: item.paypal_plan_id,
        status: item.status,
        currentPeriodStart: new Date(item.current_period_start),
        currentPeriodEnd: new Date(item.current_period_end),
        cancelAtPeriodEnd: item.cancel_at_period_end,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
      }));
    } catch (error) {
      console.error("Error getting user subscriptions:", error);
      return [];
    }
  }

  // Payment operations
  async createPayment(payment: Omit<Payment, "createdAt">): Promise<Payment> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const paymentData = {
        id: payment.id,
        user_id: payment.userId,
        subscription_id: payment.subscriptionId,
        paypal_customer_id: payment.paypalCustomerId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        metadata: payment.metadata,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("payments")
        .insert(paymentData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        subscriptionId: data.subscription_id,
        paypalCustomerId: data.paypal_customer_id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        description: data.description,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error("Error creating payment:", error);
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<Payment | undefined> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return undefined;
        }
        throw error;
      }

      return {
        id: data.id,
        userId: data.user_id,
        subscriptionId: data.subscription_id,
        paypalCustomerId: data.paypal_customer_id,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        description: data.description,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error("Error getting payment:", error);
      return undefined;
    }
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return data.map((item) => ({
        id: item.id,
        userId: item.user_id,
        subscriptionId: item.subscription_id,
        paypalCustomerId: item.paypal_customer_id,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        description: item.description,
        metadata: item.metadata,
        createdAt: new Date(item.created_at),
      }));
    } catch (error) {
      console.error("Error getting user payments:", error);
      return [];
    }
  }

  // Webhook operations
  async createWebhookEvent(
    event: Omit<WebhookEvent, "createdAt">
  ): Promise<WebhookEvent> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const eventData = {
        id: event.id,
        type: event.type,
        processed: event.processed,
        data: event.data,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("webhook_events")
        .insert(eventData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        type: data.type,
        processed: data.processed,
        data: data.data,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error("Error creating webhook event:", error);
      throw error;
    }
  }

  async getWebhookEvent(eventId: string): Promise<WebhookEvent | undefined> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { data, error } = await supabase
        .from("webhook_events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return undefined;
        }
        throw error;
      }

      return {
        id: data.id,
        type: data.type,
        processed: data.processed,
        data: data.data,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error("Error getting webhook event:", error);
      return undefined;
    }
  }

  async markWebhookProcessed(eventId: string): Promise<void> {
    try {
      if (!supabase) {
        throw new Error("Supabase client not initialized");
      }

      const { error } = await supabase
        .from("webhook_events")
        .update({ processed: true })
        .eq("id", eventId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error marking webhook as processed:", error);
      throw error;
    }
  }
}

// Fallback in-memory storage for when Supabase is not configured
export class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private contacts: ContactSubmission[] = [];
  private subscriptions: Map<string, Subscription> = new Map();
  private payments: Map<string, Payment> = new Map();
  private webhookEvents: Map<string, WebhookEvent> = new Map();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const user: User = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      profileImageUrl: userData.profileImageUrl || "",
      razorpayCustomerId: userData.razorpayCustomerId,
      subscriptionStatus: userData.subscriptionStatus || "inactive",
      subscriptionPlan: userData.subscriptionPlan,
      subscriptionPeriodEnd: userData.subscriptionPeriodEnd,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);
    console.log(`✅ User stored in memory: ${user.email} (${user.id})`);
    return user;
  }

  async createContactSubmission(
    submission: InsertContactSubmission
  ): Promise<ContactSubmission> {
    const now = new Date();
    const contact: ContactSubmission = {
      id: Date.now().toString(),
      name: submission.name,
      email: submission.email,
      message: submission.message,
      createdAt: now,
    };

    this.contacts.push(contact);
    console.log(`✅ Contact submission stored: ${contact.email}`);
    return contact;
  }

  async updateUserSubscription(
    userId: string,
    subscriptionData: {
      paypalCustomerId?: string;
      subscriptionStatus?: string;
      subscriptionPlan?: string;
      subscriptionPeriodEnd?: Date;
    }
  ): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...user,
      paypalCustomerId:
        subscriptionData.paypalCustomerId || user.paypalCustomerId,
      subscriptionStatus:
        subscriptionData.subscriptionStatus || user.subscriptionStatus,
      subscriptionPlan:
        subscriptionData.subscriptionPlan || user.subscriptionPlan,
      subscriptionPeriodEnd:
        subscriptionData.subscriptionPeriodEnd || user.subscriptionPeriodEnd,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async createSubscription(
    subscription: Omit<Subscription, "createdAt" | "updatedAt">
  ): Promise<Subscription> {
    const now = new Date();
    const newSubscription: Subscription = {
      ...subscription,
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(subscription.id, newSubscription);
    return newSubscription;
  }

  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const updatedSubscription: Subscription = {
      ...subscription,
      ...updates,
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, updatedSubscription);
    return updatedSubscription;
  }

  async getSubscription(
    subscriptionId: string
  ): Promise<Subscription | undefined> {
    return this.subscriptions.get(subscriptionId);
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values())
      .filter((sub) => sub.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createPayment(payment: Omit<Payment, "createdAt">): Promise<Payment> {
    const newPayment: Payment = {
      ...payment,
      createdAt: new Date(),
    };

    this.payments.set(payment.id, newPayment);
    return newPayment;
  }

  async getPayment(paymentId: string): Promise<Payment | undefined> {
    return this.payments.get(paymentId);
  }

  async getUserPayments(userId: string): Promise<Payment[]> {
    return Array.from(this.payments.values())
      .filter((payment) => payment.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createWebhookEvent(
    event: Omit<WebhookEvent, "createdAt">
  ): Promise<WebhookEvent> {
    const newEvent: WebhookEvent = {
      ...event,
      createdAt: new Date(),
    };

    this.webhookEvents.set(event.id, newEvent);
    return newEvent;
  }

  async getWebhookEvent(eventId: string): Promise<WebhookEvent | undefined> {
    return this.webhookEvents.get(eventId);
  }

  async markWebhookProcessed(eventId: string): Promise<void> {
    const event = this.webhookEvents.get(eventId);
    if (event) {
      event.processed = true;
      this.webhookEvents.set(eventId, event);
    }
  }

  // Dashboard operations - Products
  private products: Map<string, Product> = new Map();

  async getUserProducts(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      category?: string;
      status?: string;
      search?: string;
    }
  ): Promise<Product[]> {
    const userProducts = Array.from(this.products.values()).filter(
      (p) => p.userId === userId
    );

    let filtered = userProducts;

    if (options?.category) {
      filtered = filtered.filter((p) => p.category === options.category);
    }
    if (options?.status) {
      filtered = filtered.filter((p) => p.status === options.status);
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description?.toLowerCase().includes(search)
      );
    }

    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return filtered.slice(start, end);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const now = new Date();
    const newProduct: Product = {
      ...product,
      createdAt: now,
      updatedAt: now,
    };
    this.products.set(product.id, newProduct);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const product = this.products.get(id);
    if (!product) {
      throw new Error("Product not found");
    }

    const updatedProduct: Product = {
      ...product,
      ...updates,
      updatedAt: new Date(),
    };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    this.products.delete(id);
  }

  // Dashboard operations - Services
  private services: Map<string, Service> = new Map();

  async getUserServices(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      category?: string;
      status?: string;
      search?: string;
    }
  ): Promise<Service[]> {
    const userServices = Array.from(this.services.values()).filter(
      (s) => s.userId === userId
    );

    let filtered = userServices;

    if (options?.category) {
      filtered = filtered.filter((s) => s.category === options.category);
    }
    if (options?.status) {
      filtered = filtered.filter((s) => s.status === options.status);
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          s.description?.toLowerCase().includes(search)
      );
    }

    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return filtered.slice(start, end);
  }

  async getService(id: string): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async createService(service: InsertService): Promise<Service> {
    const now = new Date();
    const newService: Service = {
      ...service,
      createdAt: now,
      updatedAt: now,
    };
    this.services.set(service.id, newService);
    return newService;
  }

  async updateService(id: string, updates: Partial<Service>): Promise<Service> {
    const service = this.services.get(id);
    if (!service) {
      throw new Error("Service not found");
    }

    const updatedService: Service = {
      ...service,
      ...updates,
      updatedAt: new Date(),
    };
    this.services.set(id, updatedService);
    return updatedService;
  }

  async deleteService(id: string): Promise<void> {
    this.services.delete(id);
  }

  // Dashboard operations - Analytics
  private analytics: Map<string, Analytics> = new Map();

  async getUserAnalytics(
    userId: string,
    days?: number,
    options?: {
      metricType?: string;
      category?: string;
    }
  ): Promise<Analytics[]> {
    const userAnalytics = Array.from(this.analytics.values()).filter(
      (a) => a.userId === userId
    );

    let filtered = userAnalytics;

    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter((a) => new Date(a.metricDate) >= cutoffDate);
    }

    if (options?.metricType) {
      filtered = filtered.filter((a) => a.metricType === options.metricType);
    }
    if (options?.category) {
      filtered = filtered.filter((a) => a.category === options.category);
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.metricDate).getTime() - new Date(a.metricDate).getTime()
    );
  }

  async createAnalytics(analytics: InsertAnalytics): Promise<Analytics> {
    const now = new Date();
    const newAnalytics: Analytics = {
      ...analytics,
      createdAt: now,
    };
    this.analytics.set(analytics.id, newAnalytics);
    return newAnalytics;
  }

  // Dashboard operations - Orders
  private orders: Map<string, Order> = new Map();

  async getUserOrders(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    }
  ): Promise<Order[]> {
    const userOrders = Array.from(this.orders.values()).filter(
      (o) => o.userId === userId
    );

    let filtered = userOrders;

    if (options?.status) {
      filtered = filtered.filter((o) => o.status === options.status);
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.customerName.toLowerCase().includes(search) ||
          o.customerEmail.toLowerCase().includes(search)
      );
    }

    // Sort by creation date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return filtered.slice(start, end);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) {
      throw new Error("Order not found");
    }

    const updatedOrder: Order = {
      ...order,
      status,
      updatedAt: new Date(),
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Dashboard operations - Bookings
  private bookings: Map<string, Booking> = new Map();

  async getUserBookings(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
    }
  ): Promise<Booking[]> {
    const userBookings = Array.from(this.bookings.values()).filter(
      (b) => b.userId === userId
    );

    let filtered = userBookings;

    if (options?.status) {
      filtered = filtered.filter((b) => b.status === options.status);
    }
    if (options?.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.clientName.toLowerCase().includes(search) ||
          b.clientEmail.toLowerCase().includes(search)
      );
    }

    // Sort by booking date (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.bookingDate).getTime() - new Date(a.bookingDate).getTime()
    );

    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;

    return filtered.slice(start, end);
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking> {
    const booking = this.bookings.get(id);
    if (!booking) {
      throw new Error("Booking not found");
    }

    const updatedBooking: Booking = {
      ...booking,
      status,
      updatedAt: new Date(),
    };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }
}

// Use Supabase storage if configured, otherwise fall back to memory storage
const isSupabaseConfigured = !!(
  supabase &&
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const storage = isSupabaseConfigured
  ? new SupabaseStorage()
  : new MemoryStorage();

if (!isSupabaseConfigured) {
  console.log("📝 Using in-memory storage (Supabase not configured)");
  console.log("⚠️  WARNING: Data will not persist between server restarts!");
  console.log("🔧 Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
} else {
  console.log("🗄️  Using Supabase storage - data will persist");
  console.log(
    "🔗 Connected to:",
    process.env.SUPABASE_URL?.replace(/https?:\/\//, "")
  );

  // Test the connection on startup
  testSupabaseConnection();
}

async function testSupabaseConnection() {
  try {
    if (!supabase) return;

    const { data, error } = await supabase.from("users").select("*").limit(1);

    if (error) {
      console.log("❌ Supabase connection test failed:", error.message);
      console.log("💡 Please check your Supabase configuration");
    } else {
      console.log("✅ Supabase connection test passed");
    }
  } catch (error) {
    console.log("❌ Supabase connection error:", error);
  }
}
