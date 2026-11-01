-- =====================================================================
-- EcoVerify · 1/5 · Tabelas do app (Supabase / PostgreSQL)
--
-- Como usar: Supabase → SQL Editor → New query → cole este arquivo inteiro → Run.
-- Rode UMA vez, num projeto novo. Tudo roda numa transação: se algo falhar,
-- nada fica pela metade. Se aparecer "already exists", as tabelas já foram criadas.
--
-- Gerado automaticamente de src/db/schema.ts (npm run supabase:schema).
-- Não edite à mão: mude o schema.ts e gere de novo.
-- =====================================================================

begin;

CREATE TYPE "public"."ai_mode" AS ENUM('off', 'suggest', 'auto');
CREATE TYPE "public"."ai_status" AS ENUM('queued', 'done', 'failed');
CREATE TYPE "public"."ai_verdict" AS ENUM('approve', 'reject', 'review');
CREATE TYPE "public"."auth_token_purpose" AS ENUM('verify_email', 'reset_password', 'ban_appeal');
CREATE TYPE "public"."billing_cycle" AS ENUM('monthly', 'yearly');
CREATE TYPE "public"."card_type" AS ENUM('yellow', 'red');
CREATE TYPE "public"."mission_category" AS ENUM('planting', 'donation', 'recycling', 'cleanup', 'other');
CREATE TYPE "public"."decision_source" AS ENUM('human', 'ai');
CREATE TYPE "public"."dump_size" AS ENUM('small', 'medium', 'large');
CREATE TYPE "public"."dump_status" AS ENUM('pending', 'open', 'confirmed', 'resolved', 'rejected', 'expired');
CREATE TYPE "public"."font_size" AS ENUM('small', 'medium', 'large');
CREATE TYPE "public"."invoice_kind" AS ENUM('plan', 'event');
CREATE TYPE "public"."invoice_status" AS ENUM('pending', 'paid', 'canceled');
CREATE TYPE "public"."language" AS ENUM('pt', 'en', 'es');
CREATE TYPE "public"."message_type" AS ENUM('text', 'image', 'audio', 'video', 'gif');
CREATE TYPE "public"."mission_origin" AS ENUM('admin', 'auto', 'suggestion');
CREATE TYPE "public"."mission_scope" AS ENUM('local', 'anywhere');
CREATE TYPE "public"."notification_type" AS ENUM('system', 'admin', 'alert');
CREATE TYPE "public"."org_role" AS ENUM('owner', 'manager', 'member');
CREATE TYPE "public"."org_type" AS ENUM('school', 'business', 'government', 'ngo', 'other');
CREATE TYPE "public"."plan" AS ENUM('free', 'school', 'business', 'government');
CREATE TYPE "public"."proof_type" AS ENUM('photo', 'before_after', 'count', 'partner');
CREATE TYPE "public"."recycling_material" AS ENUM('plastic', 'paper', 'metal', 'glass', 'electronics', 'oil', 'other');
CREATE TYPE "public"."reward_status" AS ENUM('pending', 'processing', 'paid', 'failed');
CREATE TYPE "public"."role" AS ENUM('citizen', 'moderator', 'admin');
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');
CREATE TYPE "public"."suggestion_status" AS ENUM('pending', 'approved', 'rejected');
CREATE TYPE "public"."theme" AS ENUM('system', 'light', 'dark');
CREATE TYPE "public"."weight_source" AS ENUM('estimated', 'partner', 'declared');
CREATE TABLE "ai_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"mode" "ai_mode" DEFAULT 'auto' NOT NULL,
	"approve_min_confidence" integer DEFAULT 85 NOT NULL,
	"reject_min_confidence" integer DEFAULT 90 NOT NULL,
	"max_auto_approve_fone" numeric(12, 2) DEFAULT '50' NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "auth_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "auth_token_purpose" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "chat_blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
CREATE TABLE "collection_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"address" varchar(160),
	"city" varchar(80),
	"organization_id" uuid,
	"token" varchar(40) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "community_chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text,
	"message_type" "message_type" DEFAULT 'text' NOT NULL,
	"media_url" text,
	"reply_to_id" uuid,
	"reply_to_message" text,
	"user_id" uuid NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"delete_for_everyone" boolean DEFAULT false,
	"hidden_at" timestamp with time zone,
	"hidden_reason" varchar(20),
	"ai_status" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "dump_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"photo_hash" varchar(64) NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "dump_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"photo_hash" varchar(64) NOT NULL,
	"photo_phash" varchar(16),
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"accuracy_m" integer,
	"city" varchar(80),
	"state_code" varchar(2),
	"size" "dump_size" DEFAULT 'medium' NOT NULL,
	"note" varchar(280),
	"status" "dump_status" DEFAULT 'pending' NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"ai_reason" text,
	"rejection_code" varchar(30),
	"mission_id" uuid,
	"confirmed_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "event_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "fone_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"min_payout_fone" numeric(12, 2) DEFAULT '5' NOT NULL,
	"hold_days" integer DEFAULT 7 NOT NULL,
	"monthly_budget_fone" numeric(12, 2),
	"max_fone_per_user_month" numeric(12, 2),
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"kind" "invoice_kind" DEFAULT 'plan' NOT NULL,
	"mission_id" uuid,
	"event_package" varchar(1),
	"plan" "plan" NOT NULL,
	"billing_cycle" "billing_cycle" NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "invoice_status" DEFAULT 'pending' NOT NULL,
	"reference" varchar(25) NOT NULL,
	"reported_at" timestamp with time zone,
	"created_by" uuid,
	"confirmed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
CREATE TABLE "message_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "message_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(200) NOT NULL,
	"reason_code" varchar(20) DEFAULT 'other' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "mission_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ibge_code" integer NOT NULL,
	"city" varchar(80) NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "mission_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"category" "mission_category" NOT NULL,
	"latitude" numeric(10, 6) NOT NULL,
	"longitude" numeric(10, 6) NOT NULL,
	"city" varchar(80),
	"state_code" varchar(2),
	"ibge_code" integer,
	"status" "suggestion_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"review_note" text,
	"mission_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"title_en" varchar(200),
	"title_es" varchar(200),
	"description" text NOT NULL,
	"description_en" text,
	"description_es" text,
	"context" text,
	"context_en" text,
	"context_es" text,
	"impact" text,
	"impact_en" text,
	"impact_es" text,
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"scope" "mission_scope" DEFAULT 'local' NOT NULL,
	"city" varchar(80),
	"state_code" varchar(2),
	"ibge_code" integer,
	"origin" "mission_origin" DEFAULT 'admin' NOT NULL,
	"needs_review" boolean DEFAULT false NOT NULL,
	"osm_ref" varchar(40),
	"sponsor_name" varchar(80),
	"sponsor_id" uuid,
	"organization_id" uuid,
	"category" "mission_category" NOT NULL,
	"ai_checklist" text,
	"proof_type" "proof_type" DEFAULT 'photo' NOT NULL,
	"count_item" varchar(30),
	"count_target" integer,
	"collection_point_id" uuid,
	"points_reward" integer NOT NULL,
	"fone_reward" numeric(12, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"event_package" varchar(1),
	"event_paid_at" timestamp with time zone,
	"checkin_secret" varchar(64),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" DEFAULT 'system' NOT NULL,
	"title" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "offer_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"code" varchar(12) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "org_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(60) NOT NULL,
	"type" "org_type" DEFAULT 'other' NOT NULL,
	"city" varchar(80),
	"state_code" varchar(2),
	"brand_color" varchar(7),
	"invite_code" varchar(12) NOT NULL,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"billing_cycle" "billing_cycle" DEFAULT 'monthly' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_end" timestamp with time zone,
	"trial_used" boolean DEFAULT false NOT NULL,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "partner_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"partner_name" varchar(80) NOT NULL,
	"title" varchar(120) NOT NULL,
	"title_en" varchar(120),
	"title_es" varchar(120),
	"description" text NOT NULL,
	"description_en" text,
	"description_es" text,
	"kind" varchar(16) DEFAULT 'other' NOT NULL,
	"city" varchar(80),
	"address" varchar(160),
	"min_points" integer DEFAULT 0 NOT NULL,
	"adults_only" boolean DEFAULT true NOT NULL,
	"max_redemptions" integer,
	"expires_at" timestamp with time zone,
	"featured" boolean DEFAULT false NOT NULL,
	"monthly_fee_cents" integer DEFAULT 0 NOT NULL,
	"partner_token" varchar(40) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"submission_id" uuid,
	"source" varchar(20) DEFAULT 'submission' NOT NULL,
	"ref_key" varchar(120),
	"points" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day" varchar(10) NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correct" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "region_seeds" (
	"ibge_code" integer PRIMARY KEY NOT NULL,
	"city" varchar(80) NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"status" varchar(16) NOT NULL,
	"missions_created" integer DEFAULT 0 NOT NULL,
	"error" text,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "reward_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"fone_amount" numeric(12, 2) NOT NULL,
	"status" "reward_status" DEFAULT 'pending' NOT NULL,
	"network" varchar(50) DEFAULT 'FONE',
	"tx_hash" text,
	"wallet_address" text,
	"hold_reason" varchar(20),
	"sponsor_id" uuid,
	"paid_at" timestamp with time zone,
	"paid_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "sessions" (
	"token" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "sponsor_topups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sponsor_id" uuid NOT NULL,
	"budget_fone" numeric(12, 2) NOT NULL,
	"fee_cents" integer DEFAULT 0 NOT NULL,
	"note" varchar(160),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "sponsors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"website" text,
	"budget_fone" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"photo_url" text NOT NULL,
	"photo_hash" varchar(64) NOT NULL,
	"photo_phash" varchar(16),
	"report" text NOT NULL,
	"latitude" numeric(10, 6),
	"longitude" numeric(10, 6),
	"material" "recycling_material",
	"weight_kg" numeric(7, 1),
	"declared_weight_kg" numeric(7, 1),
	"item_count" integer,
	"weight_source" "weight_source",
	"photo_before_url" text,
	"photo_before_hash" varchar(64),
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"rejection_reason" text,
	"decided_by" "decision_source",
	"rejection_code" varchar(40),
	"ai_status" "ai_status",
	"ai_verdict" "ai_verdict",
	"ai_confidence" integer,
	"ai_reason_code" varchar(40),
	"ai_summary" text,
	"ai_checks" jsonb,
	"ai_model" varchar(80),
	"ai_analyzed_at" timestamp with time zone,
	"ai_error" text,
	"gps_accuracy" integer,
	"trust_score" integer,
	"verify_by" timestamp with time zone,
	"extra_proof_status" varchar(12),
	"extra_proof_code" varchar(8),
	"extra_proof_due_at" timestamp with time zone,
	"extra_photo_url" text,
	"extra_photo_hash" varchar(64),
	"delivery_code" varchar(6),
	"partner_confirmed_at" timestamp with time zone,
	"partner_point_id" uuid,
	"audit_status" varchar(10),
	"audited_by" uuid,
	"audited_at" timestamp with time zone,
	"appealed_at" timestamp with time zone,
	"appeal_message" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
CREATE TABLE "user_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "card_type" NOT NULL,
	"reason_code" varchar(40) NOT NULL,
	"note" text NOT NULL,
	"submission_id" uuid,
	"issued_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"caused_suspension" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"appeal_message" text,
	"appealed_at" timestamp with time zone,
	"appeal_rejected_at" timestamp with time zone
);
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'citizen' NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"wallet_address" text,
	"wallet_verified_at" timestamp with time zone,
	"wallet_verified_by" uuid,
	"wallet_verification_tx" text,
	"pending_wallet_address" text,
	"wallet_challenge_amount" numeric(12, 2),
	"wallet_challenge_created_at" timestamp with time zone,
	"wallet_challenge_tx" text,
	"declared_wallet_address" text,
	"adult_declared_at" timestamp with time zone,
	"is_banned" boolean DEFAULT false NOT NULL,
	"ban_reason" text,
	"banned_at" timestamp with time zone,
	"ban_appeal_message" text,
	"ban_appealed_at" timestamp with time zone,
	"suspended_until" timestamp with time zone,
	"chat_muted_until" timestamp with time zone,
	"suspension_reason" text,
	"email_verified_at" timestamp with time zone,
	"terms_accepted_at" timestamp with time zone,
	"terms_version" varchar(20),
	"deleted_at" timestamp with time zone,
	"language" "language" DEFAULT 'en' NOT NULL,
	"font_size" "font_size" DEFAULT 'medium' NOT NULL,
	"high_contrast" boolean DEFAULT false NOT NULL,
	"theme" "theme" DEFAULT 'light' NOT NULL,
	"reduced_motion" boolean DEFAULT false NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_blocks" ADD CONSTRAINT "chat_blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_blocks" ADD CONSTRAINT "chat_blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "collection_points" ADD CONSTRAINT "collection_points_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "collection_points" ADD CONSTRAINT "collection_points_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "community_chat" ADD CONSTRAINT "community_chat_reply_to_id_community_chat_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."community_chat"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "community_chat" ADD CONSTRAINT "community_chat_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "community_chat" ADD CONSTRAINT "community_chat_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "dump_confirmations" ADD CONSTRAINT "dump_confirmations_report_id_dump_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."dump_reports"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dump_confirmations" ADD CONSTRAINT "dump_confirmations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dump_reports" ADD CONSTRAINT "dump_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dump_reports" ADD CONSTRAINT "dump_reports_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "event_checkins" ADD CONSTRAINT "event_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "fone_settings" ADD CONSTRAINT "fone_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "message_favorites" ADD CONSTRAINT "message_favorites_message_id_community_chat_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."community_chat"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "message_favorites" ADD CONSTRAINT "message_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_message_id_community_chat_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."community_chat"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mission_requests" ADD CONSTRAINT "mission_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mission_suggestions" ADD CONSTRAINT "mission_suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "mission_suggestions" ADD CONSTRAINT "mission_suggestions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "mission_suggestions" ADD CONSTRAINT "mission_suggestions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "missions" ADD CONSTRAINT "missions_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "missions" ADD CONSTRAINT "missions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "missions" ADD CONSTRAINT "missions_collection_point_id_collection_points_id_fk" FOREIGN KEY ("collection_point_id") REFERENCES "public"."collection_points"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "missions" ADD CONSTRAINT "missions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "offer_redemptions" ADD CONSTRAINT "offer_redemptions_offer_id_partner_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."partner_offers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "offer_redemptions" ADD CONSTRAINT "offer_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "partner_offers" ADD CONSTRAINT "partner_offers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reward_queue" ADD CONSTRAINT "reward_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reward_queue" ADD CONSTRAINT "reward_queue_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reward_queue" ADD CONSTRAINT "reward_queue_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "reward_queue" ADD CONSTRAINT "reward_queue_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sponsor_topups" ADD CONSTRAINT "sponsor_topups_sponsor_id_sponsors_id_fk" FOREIGN KEY ("sponsor_id") REFERENCES "public"."sponsors"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sponsor_topups" ADD CONSTRAINT "sponsor_topups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_partner_point_id_collection_points_id_fk" FOREIGN KEY ("partner_point_id") REFERENCES "public"."collection_points"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_audited_by_users_id_fk" FOREIGN KEY ("audited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_issued_by_users_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "users" ADD CONSTRAINT "users_wallet_verified_by_users_id_fk" FOREIGN KEY ("wallet_verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
CREATE UNIQUE INDEX "auth_tokens_hash_unique" ON "auth_tokens" USING btree ("token_hash");
CREATE INDEX "auth_tokens_user_idx" ON "auth_tokens" USING btree ("user_id","purpose");
CREATE UNIQUE INDEX "collection_points_token_unique" ON "collection_points" USING btree ("token");
CREATE INDEX "community_chat_created_idx" ON "community_chat" USING btree ("created_at");
CREATE UNIQUE INDEX "dump_confirmations_once" ON "dump_confirmations" USING btree ("report_id","user_id");
CREATE INDEX "dump_reports_status_idx" ON "dump_reports" USING btree ("status");
CREATE INDEX "dump_reports_user_idx" ON "dump_reports" USING btree ("user_id");
CREATE UNIQUE INDEX "dump_reports_mission_unique" ON "dump_reports" USING btree ("mission_id");
CREATE UNIQUE INDEX "event_checkins_once" ON "event_checkins" USING btree ("mission_id","user_id");
CREATE UNIQUE INDEX "invoices_reference_unique" ON "invoices" USING btree ("reference");
CREATE INDEX "invoices_org_idx" ON "invoices" USING btree ("organization_id");
CREATE UNIQUE INDEX "message_favorites_unique" ON "message_favorites" USING btree ("message_id","user_id");
CREATE UNIQUE INDEX "message_reports_unique" ON "message_reports" USING btree ("message_id","reporter_id");
CREATE UNIQUE INDEX "mission_requests_user_city_unique" ON "mission_requests" USING btree ("user_id","ibge_code");
CREATE INDEX "mission_requests_city_idx" ON "mission_requests" USING btree ("ibge_code");
CREATE INDEX "mission_suggestions_status_idx" ON "mission_suggestions" USING btree ("status");
CREATE UNIQUE INDEX "missions_osm_ref_unique" ON "missions" USING btree ("osm_ref");
CREATE INDEX "missions_ibge_idx" ON "missions" USING btree ("ibge_code");
CREATE INDEX "missions_org_idx" ON "missions" USING btree ("organization_id");
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","is_read");
CREATE UNIQUE INDEX "offer_redemptions_code_unique" ON "offer_redemptions" USING btree ("code");
CREATE UNIQUE INDEX "offer_redemptions_once" ON "offer_redemptions" USING btree ("offer_id","user_id");
CREATE INDEX "offer_redemptions_user_idx" ON "offer_redemptions" USING btree ("user_id");
CREATE UNIQUE INDEX "organization_members_unique" ON "organization_members" USING btree ("organization_id","user_id");
CREATE INDEX "organization_members_user_idx" ON "organization_members" USING btree ("user_id");
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");
CREATE UNIQUE INDEX "organizations_invite_unique" ON "organizations" USING btree ("invite_code");
CREATE UNIQUE INDEX "partner_offers_token_unique" ON "partner_offers" USING btree ("partner_token");
CREATE UNIQUE INDEX "points_ledger_submission_unique" ON "points_ledger" USING btree ("submission_id");
CREATE UNIQUE INDEX "points_ledger_ref_unique" ON "points_ledger" USING btree ("ref_key");
CREATE UNIQUE INDEX "quiz_attempts_once" ON "quiz_attempts" USING btree ("user_id","day");
CREATE UNIQUE INDEX "reward_queue_submission_unique" ON "reward_queue" USING btree ("submission_id");
CREATE INDEX "reward_queue_status_idx" ON "reward_queue" USING btree ("status");
CREATE INDEX "reward_queue_tx_hash_idx" ON "reward_queue" USING btree ("tx_hash");
CREATE UNIQUE INDEX "submissions_photo_hash_unique" ON "submissions" USING btree ("photo_hash");
CREATE INDEX "submissions_user_submitted_idx" ON "submissions" USING btree ("user_id","submitted_at");
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");
CREATE INDEX "submissions_mission_idx" ON "submissions" USING btree ("mission_id");
CREATE INDEX "submissions_audit_idx" ON "submissions" USING btree ("audit_status");
CREATE UNIQUE INDEX "submissions_delivery_code_unique" ON "submissions" USING btree ("delivery_code");
CREATE INDEX "user_cards_user_idx" ON "user_cards" USING btree ("user_id","created_at");
CREATE INDEX "user_cards_appeal_idx" ON "user_cards" USING btree ("appealed_at");
CREATE UNIQUE INDEX "users_wallet_address_unique" ON "users" USING btree ("wallet_address");
CREATE UNIQUE INDEX "users_wallet_verification_tx_unique" ON "users" USING btree ("wallet_verification_tx");
CREATE INDEX "users_pending_wallet_idx" ON "users" USING btree ("pending_wallet_address");

commit;
