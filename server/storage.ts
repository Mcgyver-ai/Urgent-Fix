import { db } from "./db";
import { eq, and, desc, inArray, sql, or } from "drizzle-orm";
import {
  userProfiles, providers, providerDocuments, providerServices,
  addresses, bookings, bookingPhotos, quotes, payments, reviews,
  disputes, notifications, serviceCategories,
  type UserProfile, type InsertUserProfile,
  type Provider, type InsertProvider,
  type Address, type InsertAddress,
  type Booking, type InsertBooking,
  type Quote, type InsertQuote,
  type Review, type InsertReview,
  type Dispute, type InsertDispute,
  type Notification, type ServiceCategory,
  type ProviderDocument, type ProviderService,
} from "@shared/schema";

export interface IStorage {
  // User profiles
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile>;

  // Providers
  getProvider(userId: string): Promise<Provider | undefined>;
  getProviderById(id: number): Promise<Provider | undefined>;
  createProvider(data: InsertProvider): Promise<Provider>;
  updateProvider(id: number, data: Partial<InsertProvider>): Promise<Provider>;
  getAllProviders(): Promise<Provider[]>;
  getVerifiedProviders(): Promise<Provider[]>;
  getAvailableProviders(categoryId: number): Promise<(Provider & { services: ProviderService[] })[]>;

  // Provider documents
  addProviderDocument(doc: { providerId: number; documentType: string; documentUrl?: string }): Promise<ProviderDocument>;
  getProviderDocuments(providerId: number): Promise<ProviderDocument[]>;
  updateDocumentStatus(docId: number, status: "pending" | "approved" | "rejected"): Promise<ProviderDocument>;

  // Provider services
  addProviderService(providerId: number, categoryId: number): Promise<ProviderService>;
  removeProviderService(providerId: number, categoryId: number): Promise<void>;
  getProviderServices(providerId: number): Promise<ProviderService[]>;

  // Service categories
  getServiceCategories(): Promise<ServiceCategory[]>;
  getServiceCategory(id: number): Promise<ServiceCategory | undefined>;

  // Addresses
  createAddress(data: InsertAddress): Promise<Address>;
  getAddress(id: number): Promise<Address | undefined>;
  getUserAddresses(userId: string): Promise<Address[]>;

  // Bookings
  createBooking(data: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingWithDetails(id: number): Promise<any>;
  getCustomerBookings(customerId: string): Promise<Booking[]>;
  getProviderBookings(providerId: number): Promise<Booking[]>;
  getAvailableBookings(categoryIds: number[]): Promise<Booking[]>;
  getAllBookings(): Promise<Booking[]>;
  updateBookingStatus(id: number, status: string, extra?: Record<string, any>): Promise<Booking>;
  assignProvider(bookingId: number, providerId: number): Promise<Booking>;

  // Photos
  addBookingPhoto(bookingId: number, photoUrl: string): Promise<any>;
  getBookingPhotos(bookingId: number): Promise<any[]>;

  // Quotes
  createQuote(data: InsertQuote): Promise<Quote>;
  getBookingQuotes(bookingId: number): Promise<Quote[]>;
  approveQuote(quoteId: number, bookingId: number): Promise<void>;

  // Payments
  createPayment(data: { bookingId: number; amount: string; currency?: string }): Promise<any>;
  getBookingPayments(bookingId: number): Promise<any[]>;

  // Reviews
  createReview(data: InsertReview): Promise<Review>;
  getProviderReviews(providerId: number): Promise<Review[]>;
  getBookingReview(bookingId: number): Promise<Review | undefined>;

  // Disputes
  createDispute(data: InsertDispute): Promise<Dispute>;
  getAllDisputes(): Promise<Dispute[]>;
  getDispute(id: number): Promise<Dispute | undefined>;
  updateDispute(id: number, data: Partial<{ status: "open" | "investigating" | "resolved"; resolutionNotes: string }>): Promise<Dispute>;
  getBookingDispute(bookingId: number): Promise<Dispute | undefined>;

  // Notifications
  createNotification(data: { userId: string; type: string; title: string; message: string }): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;

  // Stats
  getAdminStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User profiles
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async upsertUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [result] = await db
      .insert(userProfiles)
      .values(profile)
      .onConflictDoUpdate({ target: userProfiles.userId, set: { ...profile, updatedAt: new Date() } })
      .returning();
    return result;
  }

  async updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [result] = await db
      .update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return result;
  }

  // Providers
  async getProvider(userId: string): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.userId, userId));
    return provider;
  }

  async getProviderById(id: number): Promise<Provider | undefined> {
    const [provider] = await db.select().from(providers).where(eq(providers.id, id));
    return provider;
  }

  async createProvider(data: InsertProvider): Promise<Provider> {
    const [provider] = await db.insert(providers).values(data).returning();
    return provider;
  }

  async updateProvider(id: number, data: Partial<InsertProvider>): Promise<Provider> {
    const [provider] = await db
      .update(providers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(providers.id, id))
      .returning();
    return provider;
  }

  async getAllProviders(): Promise<Provider[]> {
    return db.select().from(providers).orderBy(desc(providers.createdAt));
  }

  async getVerifiedProviders(): Promise<Provider[]> {
    return db.select().from(providers).where(eq(providers.isVerified, true));
  }

  async getAvailableProviders(categoryId: number): Promise<(Provider & { services: ProviderService[] })[]> {
    const providerServicesList = await db
      .select()
      .from(providerServices)
      .where(eq(providerServices.categoryId, categoryId));

    if (providerServicesList.length === 0) return [];

    const providerIds = providerServicesList.map(ps => ps.providerId);
    const providerList = await db
      .select()
      .from(providers)
      .where(and(
        inArray(providers.id, providerIds),
        eq(providers.isVerified, true),
        eq(providers.isAvailable, true)
      ));

    return providerList.map(p => ({
      ...p,
      services: providerServicesList.filter(ps => ps.providerId === p.id),
    }));
  }

  // Provider documents
  async addProviderDocument(doc: { providerId: number; documentType: string; documentUrl?: string }): Promise<ProviderDocument> {
    const [result] = await db.insert(providerDocuments).values(doc).returning();
    return result;
  }

  async getProviderDocuments(providerId: number): Promise<ProviderDocument[]> {
    return db.select().from(providerDocuments).where(eq(providerDocuments.providerId, providerId));
  }

  async updateDocumentStatus(docId: number, status: "pending" | "approved" | "rejected"): Promise<ProviderDocument> {
    const [doc] = await db
      .update(providerDocuments)
      .set({ verificationStatus: status })
      .where(eq(providerDocuments.id, docId))
      .returning();
    return doc;
  }

  // Provider services
  async addProviderService(providerId: number, categoryId: number): Promise<ProviderService> {
    const [result] = await db
      .insert(providerServices)
      .values({ providerId, categoryId })
      .onConflictDoNothing()
      .returning();
    return result;
  }

  async removeProviderService(providerId: number, categoryId: number): Promise<void> {
    await db
      .delete(providerServices)
      .where(and(eq(providerServices.providerId, providerId), eq(providerServices.categoryId, categoryId)));
  }

  async getProviderServices(providerId: number): Promise<ProviderService[]> {
    return db.select().from(providerServices).where(eq(providerServices.providerId, providerId));
  }

  // Service categories
  async getServiceCategories(): Promise<ServiceCategory[]> {
    return db.select().from(serviceCategories);
  }

  async getServiceCategory(id: number): Promise<ServiceCategory | undefined> {
    const [cat] = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id));
    return cat;
  }

  // Addresses
  async createAddress(data: InsertAddress): Promise<Address> {
    const [address] = await db.insert(addresses).values(data).returning();
    return address;
  }

  async getAddress(id: number): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address;
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    return db.select().from(addresses).where(eq(addresses.userId, userId));
  }

  // Bookings
  async createBooking(data: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingWithDetails(id: number): Promise<any> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    if (!booking) return undefined;

    const [address] = await db.select().from(addresses).where(eq(addresses.id, booking.addressId));
    const [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.id, booking.categoryId));
    const photos = await db.select().from(bookingPhotos).where(eq(bookingPhotos.bookingId, id));
    const bookingQuotes = await db.select().from(quotes).where(eq(quotes.bookingId, id));
    const [review] = await db.select().from(reviews).where(eq(reviews.bookingId, id));
    const [dispute] = await db.select().from(disputes).where(eq(disputes.bookingId, id));

    let provider = null;
    let providerProfile = null;
    if (booking.providerId) {
      [provider] = await db.select().from(providers).where(eq(providers.id, booking.providerId));
      if (provider) {
        [providerProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, provider.userId));
      }
    }

    let customerProfile = null;
    [customerProfile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, booking.customerId));

    return {
      ...booking,
      address,
      category,
      photos,
      quotes: bookingQuotes,
      review: review || null,
      dispute: dispute || null,
      provider: provider ? { ...provider, profile: providerProfile } : null,
      customerProfile,
    };
  }

  async getCustomerBookings(customerId: string): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.customerId, customerId)).orderBy(desc(bookings.createdAt));
  }

  async getProviderBookings(providerId: number): Promise<Booking[]> {
    return db.select().from(bookings).where(eq(bookings.providerId, providerId)).orderBy(desc(bookings.createdAt));
  }

  async getAvailableBookings(categoryIds: number[]): Promise<Booking[]> {
    if (categoryIds.length === 0) return [];
    return db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.status, "requested"),
        inArray(bookings.categoryId, categoryIds)
      ))
      .orderBy(desc(bookings.createdAt));
  }

  async getAllBookings(): Promise<Booking[]> {
    return db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async updateBookingStatus(id: number, status: string, extra?: Record<string, any>): Promise<Booking> {
    const updateData: any = { status, updatedAt: new Date(), ...extra };
    const [booking] = await db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  async assignProvider(bookingId: number, providerId: number): Promise<Booking> {
    const [booking] = await db
      .update(bookings)
      .set({
        providerId,
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId))
      .returning();
    return booking;
  }

  // Photos
  async addBookingPhoto(bookingId: number, photoUrl: string): Promise<any> {
    const [photo] = await db.insert(bookingPhotos).values({ bookingId, photoUrl }).returning();
    return photo;
  }

  async getBookingPhotos(bookingId: number): Promise<any[]> {
    return db.select().from(bookingPhotos).where(eq(bookingPhotos.bookingId, bookingId));
  }

  // Quotes
  async createQuote(data: InsertQuote): Promise<Quote> {
    const [quote] = await db.insert(quotes).values(data).returning();
    return quote;
  }

  async getBookingQuotes(bookingId: number): Promise<Quote[]> {
    return db.select().from(quotes).where(eq(quotes.bookingId, bookingId)).orderBy(desc(quotes.createdAt));
  }

  async approveQuote(quoteId: number, bookingId: number): Promise<void> {
    await db.update(quotes).set({ approvedByCustomer: true }).where(eq(quotes.id, quoteId));
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
    await db
      .update(bookings)
      .set({ status: "quote_approved", quotedTotal: quote.totalAmount, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
  }

  // Payments
  async createPayment(data: { bookingId: number; amount: string; currency?: string }): Promise<any> {
    const [payment] = await db
      .insert(payments)
      .values({ bookingId: data.bookingId, amount: data.amount, currency: data.currency || "gbp" })
      .returning();
    return payment;
  }

  async getBookingPayments(bookingId: number): Promise<any[]> {
    return db.select().from(payments).where(eq(payments.bookingId, bookingId));
  }

  // Reviews
  async createReview(data: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(data).returning();
    // Update provider rating
    const providerReviews = await db.select().from(reviews).where(eq(reviews.providerId, data.providerId));
    const avg = providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length;
    await db.update(providers).set({ ratingAverage: avg.toFixed(2) }).where(eq(providers.id, data.providerId));
    return review;
  }

  async getProviderReviews(providerId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.providerId, providerId)).orderBy(desc(reviews.createdAt));
  }

  async getBookingReview(bookingId: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId));
    return review;
  }

  // Disputes
  async createDispute(data: InsertDispute): Promise<Dispute> {
    const [dispute] = await db.insert(disputes).values(data).returning();
    await db.update(bookings).set({ status: "disputed", updatedAt: new Date() }).where(eq(bookings.id, data.bookingId));
    return dispute;
  }

  async getAllDisputes(): Promise<Dispute[]> {
    return db.select().from(disputes).orderBy(desc(disputes.createdAt));
  }

  async getDispute(id: number): Promise<Dispute | undefined> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id));
    return dispute;
  }

  async updateDispute(id: number, data: Partial<{ status: "open" | "investigating" | "resolved"; resolutionNotes: string }>): Promise<Dispute> {
    const [dispute] = await db
      .update(disputes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(disputes.id, id))
      .returning();
    return dispute;
  }

  async getBookingDispute(bookingId: number): Promise<Dispute | undefined> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.bookingId, bookingId));
    return dispute;
  }

  // Notifications
  async createNotification(data: { userId: string; type: string; title: string; message: string }): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(data).returning();
    return notif as any;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(20) as any;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  // Stats
  async getAdminStats(): Promise<any> {
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(userProfiles);
    const [totalProviders] = await db.select({ count: sql<number>`count(*)` }).from(providers);
    const [pendingVerifications] = await db.select({ count: sql<number>`count(*)` }).from(providers).where(eq(providers.isVerified, false));
    const [activeBookings] = await db.select({ count: sql<number>`count(*)` }).from(bookings).where(inArray(bookings.status, ["requested", "accepted", "provider_en_route", "arrived", "diagnosing", "in_progress", "quote_pending", "quote_approved"]));
    const [totalDisputes] = await db.select({ count: sql<number>`count(*)` }).from(disputes).where(inArray(disputes.status, ["open", "investigating"]));

    return {
      totalUsers: totalUsers.count,
      totalProviders: totalProviders.count,
      pendingVerifications: pendingVerifications.count,
      activeBookings: activeBookings.count,
      openDisputes: totalDisputes.count,
    };
  }
}

export const storage = new DatabaseStorage();
