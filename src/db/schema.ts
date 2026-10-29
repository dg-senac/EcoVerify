import {
  pgTable,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
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
/** Automatic photo verification (src/lib/ai). */
export const aiStatusEnum = pgEnum("ai_status", ["queued", "done", "failed"]);
export const aiVerdictEnum = pgEnum("ai_verdict", ["approve", "reject", "review"]);
export const aiModeEnum = pgEnum("ai_mode", ["off", "suggest", "auto"]);
/** Who made the final decision on a proof. */
export const decisionSourceEnum = pgEnum("decision_source", ["human", "ai"]);
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
/** "anywhere" missions can be done from any place (e.g. at home): no distance check. */
export const missionScopeEnum = pgEnum("mission_scope", ["local", "anywhere"]);
/** admin = created in the panel; auto = generated from OpenStreetMap; suggestion = proposed by a user. */
export const missionOriginEnum = pgEnum("mission_origin", ["admin", "auto", "suggestion"]);
export const suggestionStatusEnum = pgEnum("suggestion_status", ["pending", "approved", "rejected"]);
export const fontSizeEnum = pgEnum("font_size", ["small", "medium", "large"]);
export const languageEnum = pgEnum("language", ["pt", "en", "es"]);
export const themeEnum = pgEnum("theme", ["system", "light", "dark"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("citizen"),
  totalPoints: integer("total_points").notNull().default(0),
  /** Verified FONE wallet: the only address that receives payouts. */
  walletAddress: text("wallet_address"),
  walletVerifiedAt: timestamp("wallet_verified_at", { withTimezone: true }),
  walletVerifiedBy: uuid("wallet_verified_by").references((): AnyPgColumn => users.id),
  /** Transaction that proved ownership (sent from the wallet to the EcoVerify verification address). */
  walletVerificationTx: text("wallet_verification_tx"),
  /** In-progress link request: the user must send exactly `walletChallengeAmount` FONE from this address. */
  pendingWalletAddress: text("pending_wallet_address"),
  walletChallengeAmount: numeric("wallet_challenge_amount", { precision: 12, scale: 2 }),
  walletChallengeCreatedAt: timestamp("wallet_challenge_created_at", { withTimezone: true }),
  /** Transaction hash reported by the user (optional, speeds up the review). */
  walletChallengeTx: text("wallet_challenge_tx"),
  /** Self-declared 18+ (required to link a wallet and receive FONE). */
  adultDeclaredAt: timestamp("adult_declared_at", { withTimezone: true }),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
  bannedAt: timestamp("banned_at", { withTimezone: true }),
  /** One appeal per ban: the blocked person's explanation, read by the admins. */
  banAppealMessage: text("ban_appeal_message"),
  banAppealedAt: timestamp("ban_appealed_at", { withTimezone: true }),
  /**
   * Temporary suspension (3rd yellow card, src/lib/cards.ts). Kept after it ends: the date tells
   * whether a new card is a repeat offence. The ban_appeal_* columns hold the appeal.
   */
  suspendedUntil: timestamp("suspended_until", { withTimezone: true }),
  suspensionReason: text("suspension_reason"),
  /** E-mail ownership confirmed through the link sent by e-mail. */
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  /** LGPD: when and which version of the Terms of Use / Privacy Policy was accepted. */
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  termsVersion: varchar("terms_version", { length: 20 }),
  /** Account deleted by its owner: personal data was anonymised (see actions/account.ts). */
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  language: languageEnum("language").notNull().default("pt"),
  fontSize: fontSizeEnum("font_size").notNull().default("medium"),
  highContrast: boolean("high_contrast").notNull().default(false),
  /** Colour theme: "system" follows the device setting. */
  theme: themeEnum("theme").notNull().default("system"),
  reducedMotion: boolean("reduced_motion").notNull().default(false),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // One wallet per account: prevents several accounts funnelling rewards to the same wallet.
  uniqueIndex("users_wallet_address_unique").on(table.walletAddress),
  // A transfer can prove ownership of only one account.
  uniqueIndex("users_wallet_verification_tx_unique").on(table.walletVerificationTx),
  index("users_pending_wallet_idx").on(table.pendingWalletAddress),
]);

export const authTokenPurposeEnum = pgEnum("auth_token_purpose", ["verify_email", "reset_password", "ban_appeal"]);

/**
 * One-time tokens sent by e-mail (or, for "ban_appeal", handed to a blocked user who typed the
 * right password, so they can read the reason and appeal without getting a session).
 * Only the SHA-256 of the token is stored.
 */
export const authTokens = pgTable("auth_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  purpose: authTokenPurposeEnum("purpose").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("auth_tokens_hash_unique").on(table.tokenHash),
  index("auth_tokens_user_idx").on(table.userId, table.purpose),
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
  scope: missionScopeEnum("scope").notNull().default("local"),
  /** Municipality of the mission point (filled automatically), for labels and regional metrics. */
  city: varchar("city", { length: 80 }),
  stateCode: varchar("state_code", { length: 2 }),
  ibgeCode: integer("ibge_code"),
  origin: missionOriginEnum("origin").notNull().default("admin"),
  /**
   * Auto-generated and suggested missions pay points only until an admin reviews them
   * (sets the FONE reward or keeps it at zero).
   */
  needsReview: boolean("needs_review").notNull().default(false),
  /** OpenStreetMap element ("node/123") an auto mission came from: avoids duplicates. */
  osmRef: varchar("osm_ref", { length: 40 }),
  /** Local partner that supports the mission (shown on the card). */
  sponsorName: varchar("sponsor_name", { length: 80 }),
  /** Sponsor whose FONE budget pays this mission's rewards (null = EcoVerify treasury). */
  sponsorId: uuid("sponsor_id").references((): AnyPgColumn => sponsors.id, { onDelete: "set null" }),
  /** Private mission of an organization (only its members see it). null = public mission. */
  organizationId: uuid("organization_id").references((): AnyPgColumn => organizations.id),
  category: categoryEnum("category").notNull(),
  /** Optional: what the proof photo must show, used by the automatic verification. */
  aiChecklist: text("ai_checklist"),
  pointsReward: integer("points_reward").notNull(),
  foneReward: numeric("fone_reward", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("missions_osm_ref_unique").on(table.osmRef),
  index("missions_ibge_idx").on(table.ibgeCode),
  index("missions_org_idx").on(table.organizationId),
]);

/**
 * Companies, city halls or NGOs that fund missions with their own FONE budget
 * (they deposit it in the EcoVerify treasury; the app tracks what was spent).
 */
export const sponsors = pgTable("sponsors", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  website: text("website"),
  /** Total FONE committed by the sponsor (top-ups add to it). */
  budgetFone: numeric("budget_fone", { precision: 12, scale: 2 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Payout rules (single row, id = 1). See src/lib/payout-rules.ts. */
export const foneSettings = pgTable("fone_settings", {
  id: integer("id").primaryKey().default(1),
  /** A person's open rewards are only paid when they add up to at least this (network fee is 0.15 FONE). */
  minPayoutFone: numeric("min_payout_fone", { precision: 12, scale: 2 }).notNull().default("5"),
  /** Days a reward waits before it can be paid (time for appeals and fraud checks). */
  holdDays: integer("hold_days").notNull().default(7),
  /** FONE the treasury may commit per calendar month (sponsored missions not included). null = no limit. */
  monthlyBudgetFone: numeric("monthly_budget_fone", { precision: 12, scale: 2 }),
  /** FONE one person may earn per calendar month. null = no limit. */
  maxFonePerUserMonth: numeric("max_fone_per_user_month", { precision: 12, scale: 2 }),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One automatic OpenStreetMap search per municipality (and per retry window). */
export const regionSeeds = pgTable("region_seeds", {
  ibgeCode: integer("ibge_code").primaryKey(),
  city: varchar("city", { length: 80 }).notNull(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  status: varchar("status", { length: 16 }).notNull(), // running | done | failed
  missionsCreated: integer("missions_created").notNull().default(0),
  error: text("error"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});

/** "I want more missions here": demand signal per municipality (no coordinates stored). */
export const missionRequests = pgTable("mission_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  ibgeCode: integer("ibge_code").notNull(),
  city: varchar("city", { length: 80 }).notNull(),
  stateCode: varchar("state_code", { length: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("mission_requests_user_city_unique").on(table.userId, table.ibgeCode),
  index("mission_requests_city_idx").on(table.ibgeCode),
]);

/** Community-proposed actions (e.g. a clean-up), reviewed by moderators before becoming missions. */
export const missionSuggestions = pgTable("mission_suggestions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description").notNull(),
  category: categoryEnum("category").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }).notNull(),
  longitude: numeric("longitude", { precision: 10, scale: 6 }).notNull(),
  city: varchar("city", { length: 80 }),
  stateCode: varchar("state_code", { length: 2 }),
  ibgeCode: integer("ibge_code"),
  status: suggestionStatusEnum("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  reviewNote: text("review_note"),
  missionId: uuid("mission_id").references(() => missions.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => [index("mission_suggestions_status_idx").on(table.status)]);

export const submissions = pgTable("submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  missionId: uuid("mission_id")
    .notNull()
    .references(() => missions.id),
  photoUrl: text("photo_url").notNull(),
  /** SHA-256 of the uploaded bytes: blocks exact re-uploads. */
  photoHash: varchar("photo_hash", { length: 64 }).notNull(),
  /** 64-bit perceptual hash (hex) of the photo: finds the same picture re-saved, cropped or resized. */
  photoPhash: varchar("photo_phash", { length: 16 }),
  report: text("report").notNull(),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  status: submissionStatusEnum("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  /** "ai" when the automatic verification approved/rejected on its own (LGPD art. 20: the user can appeal). */
  decidedBy: decisionSourceEnum("decided_by"),
  /** Catalogued reason (src/lib/ai/reasons.ts) for rejections, shown translated to the user. */
  rejectionCode: varchar("rejection_code", { length: 40 }),
  // ---- Automatic verification -------------------------------------------------
  aiStatus: aiStatusEnum("ai_status"),
  aiVerdict: aiVerdictEnum("ai_verdict"),
  /** 0-100 */
  aiConfidence: integer("ai_confidence"),
  aiReasonCode: varchar("ai_reason_code", { length: 40 }),
  /** Short explanation written by the model (Portuguese). */
  aiSummary: text("ai_summary"),
  /** Structured checks returned by the model and the local rules (see AiChecks). */
  aiChecks: jsonb("ai_checks"),
  aiModel: varchar("ai_model", { length: 80 }),
  aiAnalyzedAt: timestamp("ai_analyzed_at", { withTimezone: true }),
  aiError: text("ai_error"),
  // ---- Appeal of an automatic decision ---------------------------------------
  appealedAt: timestamp("appealed_at", { withTimezone: true }),
  appealMessage: text("appeal_message"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("submissions_photo_hash_unique").on(table.photoHash),
  index("submissions_user_submitted_idx").on(table.userId, table.submittedAt),
  index("submissions_status_idx").on(table.status),
  index("submissions_mission_idx").on(table.missionId),
]);

/**
 * Settings of the automatic verification, edited in Admin → IA. A single row (id = 1).
 * The API key is not here: it stays in the GEMINI_API_KEY environment variable.
 */
export const aiSettings = pgTable("ai_settings", {
  id: integer("id").primaryKey().default(1),
  mode: aiModeEnum("mode").notNull().default("auto"),
  /** Minimum confidence (0-100) to approve without a moderator. */
  approveMinConfidence: integer("approve_min_confidence").notNull().default(85),
  /** Minimum confidence (0-100) to reject without a moderator. */
  rejectMinConfidence: integer("reject_min_confidence").notNull().default(90),
  /** Missions paying more FONE than this always go to a moderator. */
  maxAutoApproveFone: numeric("max_auto_approve_fone", { precision: 12, scale: 2 }).notNull().default("50"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  /** Destination wallet at payment time (kept even if the user changes wallet later). */
  walletAddress: text("wallet_address"),
  /**
   * Why the reward can't be paid yet: "budget" (treasury monthly budget), "user_cap"
   * (personal monthly cap) or "sponsor_budget" (sponsor ran out). null = normal.
   * An admin releases held rewards in Admin → Recompensas.
   */
  holdReason: varchar("hold_reason", { length: 20 }),
  /** Sponsor that pays this reward (copied from the mission at approval time). */
  sponsorId: uuid("sponsor_id").references(() => sponsors.id, { onDelete: "set null" }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paidBy: uuid("paid_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // A submission can only ever generate one FONE payout.
  uniqueIndex("reward_queue_submission_unique").on(table.submissionId),
  index("reward_queue_status_idx").on(table.status),
  index("reward_queue_tx_hash_idx").on(table.txHash),
]);

export const cardTypeEnum = pgEnum("card_type", ["yellow", "red"]);

/** Cards given by a person (never the AI) for fraud attempts. Rules: src/lib/cards.ts. */
export const userCards = pgTable("user_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: cardTypeEnum("type").notNull(),
  reasonCode: varchar("reason_code", { length: 40 }).notNull(),
  /** Explanation written by the reviewer, shown to the person. */
  note: text("note").notNull(),
  submissionId: uuid("submission_id").references(() => submissions.id, { onDelete: "set null" }),
  issuedBy: uuid("issued_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  /** Yellow cards expire (180 days); red cards don't. */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  /** Used up by a suspension (stops counting towards the next one). */
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  /** This card triggered a suspension. */
  causedSuspension: boolean("caused_suspension").notNull().default(false),
  /** Cancelled by an admin (accepted appeal or mistake). */
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedBy: uuid("revoked_by").references(() => users.id, { onDelete: "set null" }),
  appealMessage: text("appeal_message"),
  appealedAt: timestamp("appealed_at", { withTimezone: true }),
  /** Admin answer to the appeal: card kept (cancelled cards have revokedAt). */
  appealRejectedAt: timestamp("appeal_rejected_at", { withTimezone: true }),
}, (table) => [
  index("user_cards_user_idx").on(table.userId, table.createdAt),
  index("user_cards_appeal_idx").on(table.appealedAt),
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

/* ------------------------------------------------------------------ */
/* EcoVerify for organizations (SaaS). Plans and limits: src/lib/plans.ts */
/* ------------------------------------------------------------------ */

export const orgTypeEnum = pgEnum("org_type", ["school", "business", "government", "ngo", "other"]);
export const planEnum = pgEnum("plan", ["free", "school", "business", "government"]);
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trialing", "active", "past_due", "canceled"]);
export const orgRoleEnum = pgEnum("org_role", ["owner", "manager", "member"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["pending", "paid", "canceled"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  slug: varchar("slug", { length: 60 }).notNull(),
  type: orgTypeEnum("type").notNull().default("other"),
  city: varchar("city", { length: 80 }),
  stateCode: varchar("state_code", { length: 2 }),
  /** Hex colour used on the organization's pages (branding feature). */
  brandColor: varchar("brand_color", { length: 7 }),
  /** Code people use to join (shareable link /org/entrar/CODE). */
  inviteCode: varchar("invite_code", { length: 12 }).notNull(),
  plan: planEnum("plan").notNull().default("free"),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("active"),
  /** End of the paid/trial period (null for the free plan). */
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  trialUsed: boolean("trial_used").notNull().default(false),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("organizations_slug_unique").on(table.slug),
  uniqueIndex("organizations_invite_unique").on(table.inviteCode),
]);

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: orgRoleEnum("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("organization_members_unique").on(table.organizationId, table.userId),
  index("organization_members_user_idx").on(table.userId),
]);

/** Plan charges paid by Pix and confirmed by an admin (automatic confirmation: future PSP adapter). */
export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull(),
  billingCycle: billingCycleEnum("billing_cycle").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: invoiceStatusEnum("status").notNull().default("pending"),
  /** Pix transaction id (txid) embedded in the QR code, so the payment is easy to match. */
  reference: varchar("reference", { length: 25 }).notNull(),
  /** When the customer clicked "I've paid". */
  reportedAt: timestamp("reported_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  confirmedBy: uuid("confirmed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("invoices_reference_unique").on(table.reference),
  index("invoices_org_idx").on(table.organizationId),
]);

/** Each sponsor top-up and the service fee EcoVerify charged on it (brand campaigns). */
export const sponsorTopups = pgTable("sponsor_topups", {
  id: uuid("id").defaultRandom().primaryKey(),
  sponsorId: uuid("sponsor_id").notNull().references(() => sponsors.id, { onDelete: "cascade" }),
  budgetFone: numeric("budget_fone", { precision: 12, scale: 2 }).notNull(),
  /** Service fee received in BRL (cents) — e.g. paid by Pix or bank invoice. */
  feeCents: integer("fee_cents").notNull().default(0),
  note: varchar("note", { length: 160 }),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
