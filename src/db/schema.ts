import {
  pgTable,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  uuid,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["citizen", "moderator", "admin"]);
export const categoryEnum = pgEnum("mission_category", [
  "planting",
  "donation",
  "recycling",
  "cleanup",
  "other",
]);
export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "approved",
  "rejected",
]);
export const rewardStatusEnum = pgEnum("reward_status", [
  "pending",
  "processing",
  "paid",
  "failed",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "system",
  "admin",
  "alert",
]);
export const fontSizeEnum = pgEnum("font_size", ["small", "medium", "large"]);
export const languageEnum = pgEnum("language", ["pt", "en", "es"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("citizen"),
  totalPoints: integer("total_points").notNull().default(0),
  walletAddress: text("wallet_address"),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
  language: languageEnum("language").notNull().default("pt"),
  fontSize: fontSizeEnum("font_size").notNull().default("medium"),
  highContrast: boolean("high_contrast").notNull().default(false),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // One wallet per account: prevents several accounts funnelling rewards to the same wallet.
  uniqueIndex("users_wallet_address_unique").on(table.walletAddress),
]);

export const sessions = pgTable("sessions", {
  token: uuid("token").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const missions = pgTable("missions", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  titleEn: varchar("title_en", { length: 200 }),
  titleEs: varchar("title_es", { length: 200 }),
  description: text("description").notNull(),
  descriptionEn: text("description_en"),
  descriptionEs: text("description_es"),
  context: text("context"),
  impact: text("impact"),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  category: categoryEnum("category").notNull(),
  pointsReward: integer("points_reward").notNull(),
  foneReward: numeric("fone_reward", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  missionId: uuid("mission_id")
    .notNull()
    .references(() => missions.id),
  photoUrl: text("photo_url").notNull(),
  photoHash: varchar("photo_hash", { length: 64 }).notNull(),
  report: text("report").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  status: submissionStatusEnum("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("submissions_photo_hash_unique").on(table.photoHash),
  index("submissions_user_submitted_idx").on(table.userId, table.submittedAt),
  index("submissions_status_idx").on(table.status),
]);

export const pointsLedger = pgTable("points_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // A submission can only ever award points once.
  uniqueIndex("points_ledger_submission_unique").on(table.submissionId),
]);

export const rewardQueue = pgTable("reward_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => submissions.id, { onDelete: "cascade" }),
  foneAmount: numeric("fone_amount", { precision: 12, scale: 2 }).notNull(),
  status: rewardStatusEnum("status").notNull().default("pending"),
  network: varchar("network", { length: 50 }).default("FONE"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // A submission can only ever generate one FONE payout.
  uniqueIndex("reward_queue_submission_unique").on(table.submissionId),
  index("reward_queue_status_idx").on(table.status),
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull().default("system"),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("notifications_user_unread_idx").on(table.userId, table.isRead),
]);

export const messageTypeEnum = pgEnum("message_type", ["text", "image", "audio", "video", "gif"]);

export const communityChat = pgTable("community_chat", {
  id: uuid("id").defaultRandom().primaryKey(),
  message: text("message"),
  messageType: messageTypeEnum("message_type").default("text").notNull(),
  mediaUrl: text("media_url"),
  replyToId: uuid("reply_to_id").references((): AnyPgColumn => communityChat.id),
  replyToMessage: text("reply_to_message"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: uuid("deleted_by").references(() => users.id),
  deleteForEveryone: boolean("delete_for_everyone").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("community_chat_created_idx").on(table.createdAt),
]);

export const messageFavorites = pgTable("message_favorites", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => communityChat.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("message_favorites_unique").on(table.messageId, table.userId),
]);

export const messageReports = pgTable("message_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => communityChat.id, { onDelete: "cascade" }),
  reporterId: uuid("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reason: varchar("reason", { length: 200 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("message_reports_unique").on(table.messageId, table.reporterId),
]);
