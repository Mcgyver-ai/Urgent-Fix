import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replit_integrations/auth";
import { insertBookingSchema, insertAddressSchema, insertQuoteSchema, insertReviewSchema, insertDisputeSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ==================== UTILITY ====================
  // Get authenticated user's profile (creates if missing)
  app.get("/api/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        profile = await storage.upsertUserProfile({
          userId,
          role: "customer",
          fullName: `${req.user.claims.first_name || ""} ${req.user.claims.last_name || ""}`.trim() || null,
          phone: null,
        });
      }
      res.json(profile);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch("/api/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fullName, phone, role } = req.body;
      const profile = await storage.updateUserProfile(userId, { fullName, phone, role });
      res.json(profile);
    } catch (err) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ==================== SERVICE CATEGORIES ====================
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getServiceCategories();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // ==================== PROVIDERS ====================
  app.get("/api/provider/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getProvider(userId);
      if (!provider) return res.status(404).json({ message: "Provider not found" });
      const services = await storage.getProviderServices(provider.id);
      const documents = await storage.getProviderDocuments(provider.id);
      res.json({ ...provider, services, documents });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch provider" });
    }
  });

  app.post("/api/provider/onboard", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { businessName, serviceRadiusKm, categoryIds, bio } = req.body;

      // Ensure user profile exists with provider role
      await storage.upsertUserProfile({ userId, role: "provider", fullName: req.body.fullName || null, phone: req.body.phone || null });

      const existingProvider = await storage.getProvider(userId);
      let provider;
      if (existingProvider) {
        provider = await storage.updateProvider(existingProvider.id, { businessName, serviceRadiusKm, bio });
      } else {
        provider = await storage.createProvider({ userId, businessName, serviceRadiusKm: serviceRadiusKm || 10, bio });
      }

      // Update services
      if (categoryIds && Array.isArray(categoryIds)) {
        for (const catId of categoryIds) {
          await storage.addProviderService(provider.id, catId);
        }
      }

      res.json(provider);
    } catch (err) {
      console.error("Onboard error:", err);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  app.patch("/api/provider/availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getProvider(userId);
      if (!provider) return res.status(404).json({ message: "Provider not found" });
      const updated = await storage.updateProvider(provider.id, { isAvailable: req.body.isAvailable });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  app.post("/api/provider/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getProvider(userId);
      if (!provider) return res.status(404).json({ message: "Provider not found" });
      const doc = await storage.addProviderDocument({
        providerId: provider.id,
        documentType: req.body.documentType,
        documentUrl: req.body.documentUrl,
      });
      res.json(doc);
    } catch (err) {
      res.status(500).json({ message: "Failed to add document" });
    }
  });

  // Available providers for a category
  app.get("/api/providers/available/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const providers = await storage.getAvailableProviders(categoryId);
      res.json(providers);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  // ==================== ADDRESSES ====================
  app.post("/api/addresses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = insertAddressSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) return res.status(400).json({ message: "Invalid address data" });
      const address = await storage.createAddress(parsed.data);
      res.json(address);
    } catch (err) {
      res.status(500).json({ message: "Failed to create address" });
    }
  });

  app.get("/api/addresses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userAddresses = await storage.getUserAddresses(userId);
      res.json(userAddresses);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch addresses" });
    }
  });

  // ==================== BOOKINGS ====================
  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { categoryId, issueType, description, urgency, address, scheduledAt } = req.body;

      // Create address first
      const newAddress = await storage.createAddress({
        userId,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        postcode: address.postcode,
        lat: address.lat,
        lng: address.lng,
      });

      const booking = await storage.createBooking({
        customerId: userId,
        categoryId: parseInt(categoryId),
        issueType,
        description,
        urgency: urgency || "asap",
        addressId: newAddress.id,
        status: "requested",
        calloutFee: "49.00",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      });

      res.json(booking);
    } catch (err) {
      console.error("Create booking error:", err);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/bookings/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userBookings = await storage.getCustomerBookings(userId);
      // Enrich with categories and addresses
      const enriched = await Promise.all(userBookings.map(async (b) => {
        const category = await storage.getServiceCategory(b.categoryId);
        const address = await storage.getAddress(b.addressId);
        return { ...b, category, address };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const booking = await storage.getBookingWithDetails(id);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      // Access control
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      const provider = await storage.getProvider(userId);

      if (profile?.role !== "admin") {
        const isCustomer = booking.customerId === userId;
        const isProvider = provider && booking.providerId === provider.id;
        if (!isCustomer && !isProvider) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(booking);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  // Provider: get available jobs
  app.get("/api/provider/available-jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getProvider(userId);
      if (!provider) return res.status(404).json({ message: "Provider not found" });
      const services = await storage.getProviderServices(provider.id);
      const categoryIds = services.map(s => s.categoryId);
      const availableBookings = await storage.getAvailableBookings(categoryIds);
      const enriched = await Promise.all(availableBookings.map(async (b) => {
        const category = await storage.getServiceCategory(b.categoryId);
        const address = await storage.getAddress(b.addressId);
        return { ...b, category, address };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch available jobs" });
    }
  });

  // Provider: get assigned/my jobs
  app.get("/api/provider/my-jobs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getProvider(userId);
      if (!provider) return res.status(404).json({ message: "Provider not found" });
      const myBookings = await storage.getProviderBookings(provider.id);
      const enriched = await Promise.all(myBookings.map(async (b) => {
        const category = await storage.getServiceCategory(b.categoryId);
        const address = await storage.getAddress(b.addressId);
        return { ...b, category, address };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  // Provider: accept job
  app.post("/api/bookings/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getProvider(userId);
      if (!provider) return res.status(403).json({ message: "Not a provider" });
      if (!provider.isVerified) return res.status(403).json({ message: "Provider not verified" });

      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.status !== "requested") {
        return res.status(400).json({ message: "Booking is not available" });
      }

      const updated = await storage.assignProvider(bookingId, provider.id);

      await storage.createNotification({
        userId: booking.customerId,
        type: "booking_accepted",
        title: "Provider Accepted Your Job",
        message: `${provider.businessName} has accepted your booking and is on their way.`,
      });

      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to accept job" });
    }
  });

  // Provider: update booking status
  app.patch("/api/bookings/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getProvider(userId);
      const profile = await storage.getUserProfile(userId);
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);

      if (!booking) return res.status(404).json({ message: "Booking not found" });

      // Customers can approve quote and mark complete
      if (profile?.role === "customer") {
        if (booking.customerId !== userId) return res.status(403).json({ message: "Access denied" });
      } else if (provider) {
        if (booking.providerId !== provider.id) return res.status(403).json({ message: "Not your job" });
      } else {
        return res.status(403).json({ message: "Access denied" });
      }

      const { status } = req.body;
      const extra: Record<string, any> = {};
      if (status === "arrived") extra.arrivedAt = new Date();
      if (status === "completed") {
        extra.completedAt = new Date();
        if (provider) {
          await storage.updateProvider(provider.id, { jobsCompleted: (provider.jobsCompleted || 0) + 1 });
        }
      }

      const updated = await storage.updateBookingStatus(bookingId, status, extra);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // ==================== QUOTES ====================
  app.post("/api/bookings/:id/quotes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const provider = await storage.getProvider(userId);
      if (!provider) return res.status(403).json({ message: "Not a provider" });

      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.providerId !== provider.id) {
        return res.status(403).json({ message: "Not your booking" });
      }

      const { labourAmount, partsAmount, notes } = req.body;
      const totalAmount = (parseFloat(labourAmount) + parseFloat(partsAmount || "0")).toFixed(2);
      const quote = await storage.createQuote({
        bookingId,
        providerId: provider.id,
        labourAmount,
        partsAmount: partsAmount || "0",
        totalAmount,
        notes,
      });

      await storage.updateBookingStatus(bookingId, "quote_pending");
      await storage.createNotification({
        userId: booking.customerId,
        type: "quote_submitted",
        title: "Quote Ready for Review",
        message: `Your provider has submitted a quote of £${totalAmount} for your job.`,
      });

      res.json(quote);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit quote" });
    }
  });

  app.post("/api/quotes/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const quoteId = parseInt(req.params.id);
      const { bookingId } = req.body;
      const booking = await storage.getBooking(parseInt(bookingId));
      if (!booking || booking.customerId !== userId) return res.status(403).json({ message: "Access denied" });
      await storage.approveQuote(quoteId, parseInt(bookingId));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to approve quote" });
    }
  });

  // ==================== REVIEWS ====================
  app.post("/api/bookings/:id/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.customerId !== userId) return res.status(403).json({ message: "Access denied" });
      if (booking.status !== "completed") return res.status(400).json({ message: "Booking not completed" });

      const { rating, comment } = req.body;
      const review = await storage.createReview({
        bookingId,
        customerId: userId,
        providerId: booking.providerId!,
        rating: parseInt(rating),
        comment,
      });
      res.json(review);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit review" });
    }
  });

  // ==================== DISPUTES ====================
  app.post("/api/bookings/:id/disputes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBooking(bookingId);
      if (!booking || booking.customerId !== userId) return res.status(403).json({ message: "Access denied" });

      const dispute = await storage.createDispute({
        bookingId,
        openedByUserId: userId,
        reason: req.body.reason,
        status: "open",
      });
      res.json(dispute);
    } catch (err) {
      res.status(500).json({ message: "Failed to open dispute" });
    }
  });

  // ==================== NOTIFICATIONS ====================
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifs = await storage.getUserNotifications(userId);
      res.json(notifs);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to mark as read" });
    }
  });

  // ==================== ADMIN ====================
  const requireAdmin = async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
  };

  app.get("/api/admin/stats", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/providers", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const allProviders = await storage.getAllProviders();
      const enriched = await Promise.all(allProviders.map(async (p) => {
        const profile = await storage.getUserProfile(p.userId);
        const services = await storage.getProviderServices(p.id);
        const docs = await storage.getProviderDocuments(p.id);
        return { ...p, profile, services, documents: docs };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch providers" });
    }
  });

  app.patch("/api/admin/providers/:id/verify", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isVerified } = req.body;
      const provider = await storage.updateProvider(id, { isVerified });
      res.json(provider);
    } catch (err) {
      res.status(500).json({ message: "Failed to update provider" });
    }
  });

  app.patch("/api/admin/documents/:id/status", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const doc = await storage.updateDocumentStatus(id, status);
      res.json(doc);
    } catch (err) {
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.get("/api/admin/bookings", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const allBookings = await storage.getAllBookings();
      const enriched = await Promise.all(allBookings.map(async (b) => {
        const category = await storage.getServiceCategory(b.categoryId);
        const address = await storage.getAddress(b.addressId);
        return { ...b, category, address };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/admin/disputes", isAuthenticated, requireAdmin, async (_req, res) => {
    try {
      const allDisputes = await storage.getAllDisputes();
      const enriched = await Promise.all(allDisputes.map(async (d) => {
        const booking = await storage.getBooking(d.bookingId);
        return { ...d, booking };
      }));
      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  app.patch("/api/admin/disputes/:id", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, resolutionNotes } = req.body;
      const dispute = await storage.updateDispute(id, { status, resolutionNotes });
      res.json(dispute);
    } catch (err) {
      res.status(500).json({ message: "Failed to update dispute" });
    }
  });

  return httpServer;
}
