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

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

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
