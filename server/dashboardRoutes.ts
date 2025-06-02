import type { Express } from "express";
import { requireActiveSubscription } from "./googleAuth";
import { storage } from "./storage";
import crypto from "crypto";

export function registerDashboardRoutes(app: Express) {
  // Lead Generation Dashboard overview - get user stats and analytics
  app.get(
    "/api/dashboard/overview",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const user = req.currentUser; // Added by requireActiveSubscription middleware

        // Mock lead generation data for testing
        // In production, this would fetch from the leads, research_reports, and email_campaigns tables
        const mockData = {
          summary: {
            totalLeads: 1247,
            leadsThisMonth: 89,
            researchReports: 23,
            emailCampaigns: 5,
            conversionRate: 12.5,
            avgLeadScore: 8.2,
            roi: 340,
          },
          recentActivity: [
            {
              type: "lead_generation",
              id: "lg-001",
              description:
                "Generated 25 new leads in San Francisco tech industry",
              count: 25,
              date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            },
            {
              type: "research_report",
              id: "rr-001",
              description:
                "Research report completed for John Smith (LinkedIn)",
              count: 1,
              date: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
            },
            {
              type: "lead_generation",
              id: "lg-002",
              description: "Generated 18 new leads in New York finance sector",
              count: 18,
              date: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
            },
            {
              type: "email_campaign",
              id: "ec-001",
              description: "Email campaign sent to 150 prospects",
              count: 150,
              date: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
            },
          ],
          planInfo: {
            plan: user.subscriptionPlan || "starter",
            status: user.subscriptionStatus || "inactive",
            periodEnd: user.subscriptionPeriodEnd,
            features: {
              maxLeadsPerMonth:
                user.subscriptionPlan === "ultra"
                  ? 1000
                  : user.subscriptionPlan === "professional"
                  ? 500
                  : 100,
              researchReports: user.subscriptionPlan !== "starter",
              emailAutomation: user.subscriptionPlan === "ultra",
              agents:
                user.subscriptionPlan === "ultra"
                  ? [
                      "LeadGen Agent",
                      "LinkedIn Research Agent",
                      "Auto-Reply Agent",
                    ]
                  : user.subscriptionPlan === "professional"
                  ? ["LeadGen Agent", "LinkedIn Research Agent"]
                  : ["LeadGen Agent"],
            },
          },
        };

        res.json(mockData);
      } catch (error) {
        console.error("Dashboard overview error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard data" });
      }
    }
  );

  // Get user products with pagination and filtering
  app.get(
    "/api/dashboard/products",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { page = 1, limit = 10, category, status, search } = req.query;

        const products = await storage.getUserProducts(userId, {
          page: parseInt(page),
          limit: parseInt(limit),
          category,
          status,
          search,
        });

        res.json(products);
      } catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({ message: "Failed to fetch products" });
      }
    }
  );

  // Create new product
  app.post(
    "/api/dashboard/products",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const productData = {
          id: crypto.randomUUID(),
          userId,
          ...req.body,
        };

        const product = await storage.createProduct(productData);
        res.status(201).json(product);
      } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  );

  // Update product
  app.put(
    "/api/dashboard/products/:id",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const productId = req.params.id;

        // Verify product belongs to user
        const existingProduct = await storage.getProduct(productId);
        if (!existingProduct || existingProduct.userId !== userId) {
          return res.status(404).json({ message: "Product not found" });
        }

        const updatedProduct = await storage.updateProduct(productId, req.body);
        res.json(updatedProduct);
      } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({ message: "Failed to update product" });
      }
    }
  );

  // Delete product
  app.delete(
    "/api/dashboard/products/:id",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const productId = req.params.id;

        // Verify product belongs to user
        const existingProduct = await storage.getProduct(productId);
        if (!existingProduct || existingProduct.userId !== userId) {
          return res.status(404).json({ message: "Product not found" });
        }

        await storage.deleteProduct(productId);
        res.json({ message: "Product deleted successfully" });
      } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ message: "Failed to delete product" });
      }
    }
  );

  // Get user services with pagination and filtering
  app.get(
    "/api/dashboard/services",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { page = 1, limit = 10, category, status, search } = req.query;

        const services = await storage.getUserServices(userId, {
          page: parseInt(page),
          limit: parseInt(limit),
          category,
          status,
          search,
        });

        res.json(services);
      } catch (error) {
        console.error("Get services error:", error);
        res.status(500).json({ message: "Failed to fetch services" });
      }
    }
  );

  // Create new service
  app.post(
    "/api/dashboard/services",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const serviceData = {
          id: crypto.randomUUID(),
          userId,
          ...req.body,
        };

        const service = await storage.createService(serviceData);
        res.status(201).json(service);
      } catch (error) {
        console.error("Create service error:", error);
        res.status(500).json({ message: "Failed to create service" });
      }
    }
  );

  // Update service
  app.put(
    "/api/dashboard/services/:id",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const serviceId = req.params.id;

        // Verify service belongs to user
        const existingService = await storage.getService(serviceId);
        if (!existingService || existingService.userId !== userId) {
          return res.status(404).json({ message: "Service not found" });
        }

        const updatedService = await storage.updateService(serviceId, req.body);
        res.json(updatedService);
      } catch (error) {
        console.error("Update service error:", error);
        res.status(500).json({ message: "Failed to update service" });
      }
    }
  );

  // Delete service
  app.delete(
    "/api/dashboard/services/:id",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const serviceId = req.params.id;

        // Verify service belongs to user
        const existingService = await storage.getService(serviceId);
        if (!existingService || existingService.userId !== userId) {
          return res.status(404).json({ message: "Service not found" });
        }

        await storage.deleteService(serviceId);
        res.json({ message: "Service deleted successfully" });
      } catch (error) {
        console.error("Delete service error:", error);
        res.status(500).json({ message: "Failed to delete service" });
      }
    }
  );

  // Get analytics data for charts
  app.get(
    "/api/dashboard/analytics",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { days = 30, metricType, category } = req.query;

        const analytics = await storage.getUserAnalytics(
          userId,
          parseInt(days),
          {
            metricType,
            category,
          }
        );

        // Group analytics by date for chart display
        const chartData = analytics.reduce((acc, item) => {
          const date = item.metricDate.toISOString().split("T")[0];
          if (!acc[date]) {
            acc[date] = {};
          }
          acc[date][item.metricType] = parseFloat(item.metricValue.toString());
          return acc;
        }, {} as Record<string, Record<string, number>>);

        res.json({
          raw: analytics,
          chartData: Object.entries(chartData).map(([date, metrics]) => ({
            date,
            ...metrics,
          })),
        });
      } catch (error) {
        console.error("Get analytics error:", error);
        res.status(500).json({ message: "Failed to fetch analytics" });
      }
    }
  );

  // Get orders with pagination
  app.get(
    "/api/dashboard/orders",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { page = 1, limit = 10, status, search } = req.query;

        const orders = await storage.getUserOrders(userId, {
          page: parseInt(page),
          limit: parseInt(limit),
          status,
          search,
        });

        res.json(orders);
      } catch (error) {
        console.error("Get orders error:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
      }
    }
  );

  // Get bookings with pagination
  app.get(
    "/api/dashboard/bookings",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { page = 1, limit = 10, status, search } = req.query;

        const bookings = await storage.getUserBookings(userId, {
          page: parseInt(page),
          limit: parseInt(limit),
          status,
          search,
        });

        res.json(bookings);
      } catch (error) {
        console.error("Get bookings error:", error);
        res.status(500).json({ message: "Failed to fetch bookings" });
      }
    }
  );

  // Update order status
  app.put(
    "/api/dashboard/orders/:id/status",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const orderId = req.params.id;
        const { status } = req.body;

        // Verify order belongs to user
        const existingOrder = await storage.getOrder(orderId);
        if (!existingOrder || existingOrder.userId !== userId) {
          return res.status(404).json({ message: "Order not found" });
        }

        const updatedOrder = await storage.updateOrderStatus(orderId, status);
        res.json(updatedOrder);
      } catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({ message: "Failed to update order status" });
      }
    }
  );

  // Update booking status
  app.put(
    "/api/dashboard/bookings/:id/status",
    requireActiveSubscription,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const bookingId = req.params.id;
        const { status } = req.body;

        // Verify booking belongs to user
        const existingBooking = await storage.getBooking(bookingId);
        if (!existingBooking || existingBooking.userId !== userId) {
          return res.status(404).json({ message: "Booking not found" });
        }

        const updatedBooking = await storage.updateBookingStatus(
          bookingId,
          status
        );
        res.json(updatedBooking);
      } catch (error) {
        console.error("Update booking status error:", error);
        res.status(500).json({ message: "Failed to update booking status" });
      }
    }
  );
}
