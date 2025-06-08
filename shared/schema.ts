import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  decimal,
  boolean,
  integer,
  json,
  date,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  paypalCustomerId: varchar("paypal_customer_id"),
  subscriptionStatus: varchar("subscription_status").default("inactive"), // inactive, active, canceled, past_due
  subscriptionPlan: varchar("subscription_plan"), // starter, professional, enterprise
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  activationStatus: varchar("activation_status").default("pending"), // pending, active
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contact form submissions table
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  company: varchar("company").notNull(),
  challenge: varchar("challenge").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().notNull(), // PayPal subscription ID
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  paypalCustomerId: varchar("paypal_customer_id").notNull(),
  paypalPlanId: varchar("paypal_plan_id").notNull(),
  status: varchar("status").notNull(), // active, canceled, incomplete, past_due, etc.
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment transactions table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().notNull(), // PayPal payment ID
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  subscriptionId: varchar("subscription_id").references(() => subscriptions.id),
  paypalCustomerId: varchar("paypal_customer_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("usd"),
  status: varchar("status").notNull(), // captured, authorized, failed, refunded
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// PayPal webhook events table (for idempotency)
export const webhookEvents = pgTable("webhook_events", {
  id: varchar("id").primaryKey().notNull(), // PayPal event ID
  type: varchar("type").notNull(),
  processed: boolean("processed").default(false),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Leads table for AI agent lead generation
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  // Core lead information
  fullName: varchar("full_name").notNull(),
  emailAddress: varchar("email_address"),
  phoneNumber: varchar("phone_number"),
  country: varchar("country"),
  location: varchar("location").notNull(),
  industry: varchar("industry").notNull(),
  companyName: varchar("company_name").notNull(),
  jobTitle: varchar("job_title").notNull(),
  seniority: varchar("seniority"),
  websiteUrl: varchar("website_url"),
  linkedinUrl: varchar("linkedin_url"),
  // Status and scoring
  leadStatus: varchar("lead_status").default("new"), // new, contacted, qualified, converted, rejected
  contactStatus: varchar("contact_status").default("not_contacted"), // not_contacted, email_sent, responded, bounced
  leadScore: integer("lead_score").default(0), // 0-100 lead quality score
  // Metadata
  source: varchar("source").default("Falcon"),
  tags: jsonb("tags").default("[]"),
  notes: text("notes"),
  // External tracking
  n8nExecutionId: varchar("n8n_execution_id"),
  apolloPersonId: varchar("apollo_person_id"),
  apolloOrganizationId: varchar("apollo_organization_id"),
  // Qualification fields
  qualificationRating: varchar("qualification_rating"), // high, medium, low
  qualificationScore: integer("qualification_score").default(0), // 0-100
  qualificationDate: timestamp("qualification_date"),
  qualificationCriteria: jsonb("qualification_criteria").default("{}"),
  qualificationReasoning: text("qualification_reasoning"),
  autoQualified: boolean("auto_qualified").default(false),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastContactedAt: timestamp("last_contacted_at"),
});

// Lead qualification jobs table for background processing
export const leadQualificationJobs = pgTable("lead_qualification_jobs", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  leadId: uuid("lead_id").references(() => leads.id),
  // Job configuration
  jobType: varchar("job_type").notNull(), // single_lead, bulk_qualification, auto_qualification
  jobStatus: varchar("job_status").default("queued"), // queued, processing, completed, failed, cancelled
  priority: integer("priority").default(5), // 1-10, 1 = highest
  // Processing details
  leadsToProcess: integer("leads_to_process").default(1),
  leadsProcessed: integer("leads_processed").default(0),
  leadsQualified: integer("leads_qualified").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  processingTimeMs: integer("processing_time_ms"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  // Results
  qualificationResults: jsonb("qualification_results").default("{}"),
  tokensUsed: integer("tokens_used").default(0),
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Research reports table for AI agent research outputs
export const researchReports = pgTable("research_reports", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  leadId: varchar("lead_id").references(() => leads.id),
  jobId: varchar("job_id"), // References agent_jobs but not enforced due to different schema
  // Report content
  reportTitle: varchar("report_title").notNull(),
  reportContent: text("report_content").notNull(), // HTML content
  reportType: varchar("report_type").default("linkedin_research"), // linkedin_research, company_research, market_research
  // Metadata
  researchSources: jsonb("research_sources").default("[]"), // Array of sources used
  confidenceScore: integer("confidence_score").default(0), // 0-100 confidence score
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type UpsertLead = typeof leads.$inferInsert;
export type ResearchReport = typeof researchReports.$inferSelect;
export type UpsertResearchReport = typeof researchReports.$inferInsert;

export const insertContactSubmissionSchema = createInsertSchema(
  contactSubmissions
).omit({
  id: true,
  createdAt: true,
});

export type InsertContactSubmission = z.infer<
  typeof insertContactSubmissionSchema
>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;

// Products table for user product management
export const products = pgTable("products", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  stockQuantity: integer("stock_quantity").default(0),
  sku: varchar("sku"),
  imageUrl: varchar("image_url"),
  status: varchar("status").default("active"), // active, inactive, out_of_stock
  tags: json("tags"), // Array of tags
  metadata: json("metadata"), // Additional product data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Services table for user service management
export const services = pgTable("services", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  duration: integer("duration"), // Duration in minutes
  availability: json("availability"), // Available time slots
  location: varchar("location"),
  isOnline: boolean("is_online").default(false),
  maxBookings: integer("max_bookings").default(1),
  status: varchar("status").default("active"), // active, inactive, booked
  tags: json("tags"), // Array of tags
  metadata: json("metadata"), // Additional service data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analytics data table for dashboard metrics
export const analytics = pgTable("analytics", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  metricType: varchar("metric_type").notNull(), // sales, views, conversions, etc.
  metricValue: decimal("metric_value", { precision: 15, scale: 2 }).notNull(),
  metricDate: date("metric_date").notNull(),
  category: varchar("category"), // product, service, general
  entityId: varchar("entity_id"), // Reference to product/service ID
  metadata: json("metadata"), // Additional metric data
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings table for service appointments
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  serviceId: varchar("service_id")
    .notNull()
    .references(() => services.id),
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email").notNull(),
  clientPhone: varchar("client_phone"),
  bookingDate: timestamp("booking_date").notNull(),
  duration: integer("duration").notNull(), // Duration in minutes
  status: varchar("status").default("pending"), // pending, confirmed, completed, cancelled
  notes: text("notes"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  paymentStatus: varchar("payment_status").default("pending"), // pending, paid, refunded
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders table for product purchases
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  customerName: varchar("customer_name").notNull(),
  customerEmail: varchar("customer_email").notNull(),
  customerPhone: varchar("customer_phone"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  status: varchar("status").default("pending"), // pending, processing, shipped, delivered, cancelled
  shippingAddress: json("shipping_address"),
  paymentStatus: varchar("payment_status").default("pending"), // pending, paid, refunded
  paymentMethod: varchar("payment_method"),
  trackingNumber: varchar("tracking_number"),
  notes: text("notes"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items table for product order details
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().notNull(),
  orderId: varchar("order_id")
    .notNull()
    .references(() => orders.id),
  productId: varchar("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table for real-time AI agent notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().notNull(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  type: varchar("type").notNull(), // job_completed, job_failed, job_started, system_notification, maintenance_notification
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  agentName: varchar("agent_name"), // prism, falcon, sage, sentinel
  jobId: varchar("job_id"),
  jobType: varchar("job_type"),
  metadata: jsonb("metadata").default("{}"),
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
  dismissedAt: timestamp("dismissed_at"),
});

// TypeScript types for the new tables
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
