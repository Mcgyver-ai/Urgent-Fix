import { sql, relations } from "drizzle-orm";
import {
  pgTable, text, varchar, integer, boolean, decimal,
  timestamp, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["customer", "provider", "admin"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "draft", "requested", "accepted", "provider_en_route", "arrived",
  "diagnosing", "quote_pending", "quote_approved", "in_progress",
  "completed", "cancelled", "disputed"
]);
export const urgencyEnum = pgEnum("urgency", ["asap", "today", "scheduled"]);
export const verificationStatusEnum = pgEnum("verification_status", ["pending", "approved", "rejected"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "authorized", "paid", "refunded", "failed"]);
export const disputeStatusEnum = pgEnum("dispute_status", ["open", "investigating", "resolved"]);

// Service categories
export const serviceCategories = pgTable("service_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
});

// Profiles extending auth users
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  fullName: text("full_name"),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("customer"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Providers
export const providers = pgTable("providers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  serviceRadiusKm: integer("service_radius_km").notNull().default(10),
  isVerified: boolean("is_verified").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  ratingAverage: decimal("rating_average", { precision: 3, scale: 2 }).default("0"),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Provider documents
export const providerDocuments = pgTable("provider_documents", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  providerId: integer("provider_id").notNull(),
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url"),
  verificationStatus: verificationStatusEnum("verification_status").notNull().default("pending"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Provider services (which categories they serve)
export const providerServices = pgTable("provider_services", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  providerId: integer("provider_id").notNull(),
  categoryId: integer("category_id").notNull(),
});

// Addresses
export const addresses = pgTable("addresses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  postcode: text("postcode").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings
export const bookings = pgTable("bookings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: varchar("customer_id").notNull(),
  providerId: integer("provider_id"),
  categoryId: integer("category_id").notNull(),
  issueType: text("issue_type").notNull(),
  description: text("description").notNull(),
  urgency: urgencyEnum("urgency").notNull().default("asap"),
  addressId: integer("address_id").notNull(),
  status: bookingStatusEnum("status").notNull().default("requested"),
  scheduledAt: timestamp("scheduled_at"),
  acceptedAt: timestamp("accepted_at"),
  arrivedAt: timestamp("arrived_at"),
  completedAt: timestamp("completed_at"),
  calloutFee: decimal("callout_fee", { precision: 10, scale: 2 }),
  quotedTotal: decimal("quoted_total", { precision: 10, scale: 2 }),
  finalTotal: decimal("final_total", { precision: 10, scale: 2 }),
  paymentStatus: paymentStatusEnum("payment_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Booking photos
export const bookingPhotos = pgTable("booking_photos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer("booking_id").notNull(),
  photoUrl: text("photo_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Quotes
export const quotes = pgTable("quotes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer("booking_id").notNull(),
  providerId: integer("provider_id").notNull(),
  labourAmount: decimal("labour_amount", { precision: 10, scale: 2 }).notNull(),
  partsAmount: decimal("parts_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  approvedByCustomer: boolean("approved_by_customer").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer("booking_id").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("gbp"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer("booking_id").notNull().unique(),
  customerId: varchar("customer_id").notNull(),
  providerId: integer("provider_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Disputes
export const disputes = pgTable("disputes", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  bookingId: integer("booking_id").notNull(),
  openedByUserId: varchar("opened_by_user_id").notNull(),
  reason: text("reason").notNull(),
  status: disputeStatusEnum("status").notNull().default("open"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  customer: one(userProfiles, { fields: [bookings.customerId], references: [userProfiles.userId] }),
  provider: one(providers, { fields: [bookings.providerId], references: [providers.id] }),
  category: one(serviceCategories, { fields: [bookings.categoryId], references: [serviceCategories.id] }),
  address: one(addresses, { fields: [bookings.addressId], references: [addresses.id] }),
  photos: many(bookingPhotos),
  quotes: many(quotes),
  review: one(reviews, { fields: [bookings.id], references: [reviews.bookingId] }),
  dispute: one(disputes, { fields: [bookings.id], references: [disputes.bookingId] }),
  payments: many(payments),
}));

export const providersRelations = relations(providers, ({ many }) => ({
  services: many(providerServices),
  documents: many(providerDocuments),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const providerServicesRelations = relations(providerServices, ({ one }) => ({
  provider: one(providers, { fields: [providerServices.providerId], references: [providers.id] }),
  category: one(serviceCategories, { fields: [providerServices.categoryId], references: [serviceCategories.id] }),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  providerServices: many(providerServices),
  bookings: many(bookings),
}));

// Insert schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProviderSchema = createInsertSchema(providers).omit({ id: true, createdAt: true, updatedAt: true, ratingAverage: true, jobsCompleted: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true, updatedAt: true, acceptedAt: true, arrivedAt: true, completedAt: true });
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true, createdAt: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertDisputeSchema = createInsertSchema(disputes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// Types
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type ProviderDocument = typeof providerDocuments.$inferSelect;
export type ProviderService = typeof providerServices.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BookingPhoto = typeof bookingPhotos.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Payment = typeof payments.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Notification = typeof notifications.$inferSelect;

// Legacy
export type InsertUser = z.infer<typeof insertUserProfileSchema>;
export type User = typeof userProfiles.$inferSelect;
