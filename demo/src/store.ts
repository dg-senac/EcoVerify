import { useRef, useSyncExternalStore } from "react";
import { DEFAULT_LANG, t, tf, tx, type Lang } from "@/lib/i18n";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { newlyEarned, type ApprovedAction } from "@/lib/achievements";
import type { Role } from "@/lib/nav";
import { dt, botReplies } from "./i18n";
import { createSeed, STATE_VERSION } from "./seed";
import { hasSeedTexts, seedText } from "./seed-text";
import { centsToFone, foneToCents, isValidFoneAddress, normalizeHex, pickChallengeCents } from "@/lib/fone";
import { TERMS_VERSION } from "@/lib/legal";
import type { Theme } from "@/lib/theme";
import { distanceMeters, fakeTxHash, MAX_DISTANCE_METERS, MAX_GPS_ACCURACY_METERS, uid } from "./media";
import {
  composeRejectionMessage,
  decideProof,
  DEFAULT_AI_SETTINGS,
  isInternetCopyFlag,
  ownWords,
  rejectionReasonText,
  validateRejection,
  type AiAnalysis, type AiChecks, type AiVerdict, type RejectionCode } from "@/lib/ai/decision";
import { simulateAnalysis, simulateWebSearch, type SampleKind } from "./demoAi";
import { webVerdict } from "@/lib/ai/web-detection-core";
import {
  CARD_APPEAL_MIN,
  CARD_NOTE_MIN,
  CARD_REASON_LABELS,
  cardExpiresAt,
  cardNoticeText,
  cardReasonForRejection,
  countingYellows,
  isCardActive,
  isSuspended,
  yellowOutcome,
  type CardReason,
  type CardType,
} from "@/lib/cards";
import { canReview } from "@/lib/nav";
import { formatDate } from "@/lib/utils";
import type { Region, RegionRadius } from "@/lib/region";
import { OSM_TEMPLATES, type OsmKind } from "@/lib/regional/templates";
import {
  decideHold,
  DEFAULT_PAYOUT_SETTINGS,
  monthStart,
  releaseDate,
  splitOpenRewards,
  type HoldReason,
  type PayoutSettings,
} from "@/lib/payout-rules";
import { addPeriod, isPlanId, PAID_PLANS, planPrice, type BillingCycle, type PlanId, type SubscriptionStatus } from "@/lib/plans";
import { canActivateMission, canAddMember, initialSubscription, isOrgType, newInviteCode, normalizeInviteCode, slugify, type OrgRole, type OrgType } from "@/lib/saas/org-rules";
import { newInvoiceReference } from "@/lib/saas/pix";
import { EVENT_PACKAGES, eventMemberAllowance, eventPhase, eventSubmissionError, isEvent, isEventPackage, parseEventWindow, type EventPackage } from "@/lib/saas/events";
import {
  firstName,
  codeUsedNotification,
  formatRedemptionCode,
  localizeOffer,
  newPartnerToken,
  newRedemptionCode,
  normalizeRedemptionCode,
  parseOfferInput,
  redeemError,
  validateError,
  type OfferInput,
  type OfferKind,
  type RedeemError,
  type ValidateError,
} from "@/lib/benefits";
import { checkRecyclingInput, parseWeightKg, type ImpactRow, type Material } from "@/lib/impact";

/* ------------------------------------------------------------------ */
/* Types (mirror src/db/schema.ts)                                     */
/* ------------------------------------------------------------------ */

export type FontSize = "small" | "medium" | "large";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  totalPoints: number;
  /** Verified FONE wallet (only this one receives payouts), like users.wallet_address. */
  walletAddress: string | null;
  /** In-progress link request: send exactly `amount` FONE from `address` to prove ownership. */
  pendingWallet: { address: string; amount: string; createdAt: string } | null;
  /** Self-declared 18+ (required to receive FONE). */
  adultDeclaredAt: string | null;
  isBanned: boolean;
  banReason: string | null;
  /** Like users.banned_at / ban_appeal_message / ban_appealed_at (one appeal per block). */
  bannedAt?: string | null;
  banAppealMessage?: string | null;
  banAppealedAt?: string | null;
  /** 3rd yellow card: suspended until this date (kept after it ends, like users.suspended_until). */
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  createdAt: string;
  /** LGPD: when the Terms of Use / Privacy Policy were accepted (like users.terms_accepted_at). */
  termsAcceptedAt?: string | null;
  /** Account deleted by its owner: personal data anonymised (like users.deleted_at). */
  deletedAt?: string | null;
  /** Fictional community member (fills ranking and chat). */
  isBot?: boolean;
  /** Ready-made demo profile shown on the login screen. */
  isDemoProfile?: boolean;
  language: Lang;
  fontSize: FontSize;
  /** Colour theme (missing in older saved demos = "system"). */
  theme?: Theme;
  highContrast: boolean;
  reducedMotion: boolean;
  notificationsEnabled: boolean;
};

export type Category = "planting" | "donation" | "recycling" | "cleanup" | "other";

export type Mission = {
  id: string;
  title: string;
  titleEn?: string | null;
  titleEs?: string | null;
  description: string;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  context?: string | null;
  contextEn?: string | null;
  contextEs?: string | null;
  impact?: string | null;
  impactEn?: string | null;
  impactEs?: string | null;
  latitude: number;
  longitude: number;
  category: Category;
  pointsReward: number;
  foneReward: string;
  isActive: boolean;
  createdAt: string;
  /** "anywhere" = can be done from home: no distance check. */
  scope?: "local" | "anywhere";
  city?: string | null;
  stateCode?: string | null;
  /** auto = example place generated for a city without missions (OpenStreetMap in the real app). */
  origin?: "admin" | "auto";
  /** Pays points only until an admin reviews it. */
  needsReview?: boolean;
  sponsorName?: string | null;
  /** Sponsor whose FONE budget pays this mission (null = EcoVerify treasury). */
  sponsorId?: string | null;
  /** Private mission of an organization (points only, members only). */
  organizationId?: string | null;
  /** Events (mutirões): proofs only inside this window; one-off payment (src/lib/saas/events.ts). */
  startsAt?: string | null;
  endsAt?: string | null;
  eventPackage?: EventPackage | null;
  eventPaidAt?: string | null;
};

export type MissionRequest = { userId: string; ibge: number; city: string; uf: string; createdAt: string };

export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  userId: string;
  missionId: string;
  photo: string;
  photoHash: string;
  report: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  simulatedLocation: boolean;
  /** Recycling missions: material and weight in kg (src/lib/impact.ts). */
  material?: Material | null;
  weightKg?: number | null;
  declaredWeightKg?: number | null;
  status: SubmissionStatus;
  reviewedBy: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  /* Automatic verification (optional: older saved demos don't have it). */
  aiStatus?: "done" | "failed" | null;
  /** Model that analysed the photo: "simulated" (sample photos) or the Gemini model of the tester's own key. */
  aiModel?: string | null;
  aiVerdict?: AiVerdict | null;
  aiConfidence?: number | null;
  aiReasonCode?: RejectionCode | null;
  aiSummary?: string | null;
  aiChecks?: AiChecks | null;
  decidedBy?: "ai" | "human" | null;
  rejectionCode?: RejectionCode | null;
  appealedAt?: string | null;
  appealMessage?: string | null;
};

export type Reward = {
  id: string;
  userId: string;
  submissionId: string;
  foneAmount: string;
  status: "pending" | "paid";
  txHash: string | null;
  /** Destination wallet at payment time. */
  walletAddress?: string | null;
  createdAt: string;
  paidAt: string | null;
  /** Kept by a budget/cap (see src/lib/payout-rules.ts); an admin releases it. */
  holdReason?: HoldReason | null;
  sponsorId?: string | null;
};

/** Company / city hall / NGO funding missions with its own FONE budget. */
export type Sponsor = {
  id: string;
  name: string;
  budgetFone: string;
  isActive: boolean;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  /** The same alert in the three languages: shown in the language the person uses now. */
  i18n?: Record<Lang, { title: string; message: string }>;
  isRead: boolean;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  message: string;
  replyToId: string | null;
  deleted: boolean;
  createdAt: string;
};

export type State = {
  version: number;
  currentUserId: string | null;
  /** Language used before signing in. */
  guestLanguage: Lang;
  users: User[];
  missions: Mission[];
  submissions: Submission[];
  rewards: Reward[];
  notifications: Notification[];
  chat: ChatMessage[];
  /** Region chosen on the missions screen (device only, like the cookie of the real app). */
  region?: Region | null;
  /** "I want more missions here". */
  missionRequests?: MissionRequest[];
  /** Cities (IBGE code) that already got example missions. */
  seededCities?: number[];
  /** Payout rules (minimum, hold period, budgets) — Admin → Recompensas. */
  payoutSettings?: PayoutSettings;
  sponsors?: Sponsor[];
  /* SaaS: organizations, plans and sales (see src/lib/plans.ts). */
  orgs?: DemoOrg[];
  orgMembers?: DemoOrgMember[];
  invoices?: DemoInvoice[];
  /** Yellow/red cards (src/lib/cards.ts). */
  cards?: DemoCard[];
  /**
   * Moderators may review proofs. The real app starts with this OFF (MODERATORS_ENABLED); the demo
   * starts ON so Carlos can be tried, and Ana can turn it off in Admin → Users.
   */
  moderatorsEnabled?: boolean;
  /** Local business benefits (src/lib/benefits.ts) and the codes people redeemed. */
  offers?: DemoOffer[];
  redemptions?: DemoRedemption[];
};

export type DemoOffer = {
  id: string;
  partnerName: string;
  title: string;
  titleEn?: string | null;
  titleEs?: string | null;
  description: string;
  descriptionEn?: string | null;
  descriptionEs?: string | null;
  kind: OfferKind;
  city: string | null;
  address: string | null;
  minPoints: number;
  adultsOnly: boolean;
  maxRedemptions: number | null;
  expiresAt: string | null;
  featured: boolean;
  monthlyFeeCents: number;
  partnerToken: string;
  isActive: boolean;
  createdAt: string;
};
export type DemoRedemption = { id: string; offerId: string; userId: string; code: string; createdAt: string; usedAt: string | null };

export type DemoCard = {
  id: string;
  userId: string;
  type: CardType;
  reasonCode: CardReason;
  note: string;
  submissionId: string | null;
  issuedBy: string | null;
  createdAt: string;
  expiresAt: string | null;
  consumedAt: string | null;
  causedSuspension: boolean;
  revokedAt: string | null;
  appealMessage: string | null;
  appealedAt: string | null;
  appealRejectedAt: string | null;
};

export type DemoOrg = {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  city: string | null;
  plan: PlanId;
  billingCycle: BillingCycle;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: string | null;
  trialUsed: boolean;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
};
export type DemoOrgMember = { id: string; orgId: string; userId: string; role: OrgRole; joinedAt: string };
export type DemoInvoice = {
  id: string;
  orgId: string;
  /** "event" = one-off event (plan/billingCycle are placeholders). */
  kind?: "plan" | "event";
  missionId?: string | null;
  eventPackage?: EventPackage | null;
  plan: PlanId;
  billingCycle: BillingCycle;
  amountCents: number;
  status: "pending" | "paid" | "canceled";
  reference: string;
  reportedAt: string | null;
  createdAt: string;
  paidAt: string | null;
};


const STORAGE_KEY = "ecoverify-demo";

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed?.version === STATE_VERSION && Array.isArray(parsed.users)) return parsed;
    }
  } catch {
    // Corrupted storage: start again from the seed.
  }
  return createSeed();
}

let state: State = load();
const listeners = new Set<() => void>();
let storageErrorHandler: (() => void) | null = null;

export function onStorageError(handler: () => void) {
  storageErrorHandler = handler;
}

function persist(next: State): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    storageErrorHandler?.();
    return false;
  }
}

/** Applies a change; returns false (and keeps the old state) if it couldn't be saved. */
function commit(updater: (draft: State) => State): boolean {
  const next = updater(state);
  if (!persist(next)) return false;
  state = next;
  listeners.forEach((listener) => listener());
  return true;
}

// Another tab changed the demo (e.g. the partner page validated a code): pick it up here too.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    state = load();
    listeners.forEach((listener) => listener());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

/**
 * Subscribes to a slice of the state. The result is cached per state snapshot, so selectors
 * may safely return derived arrays/objects (useSyncExternalStore requires stable snapshots).
 */
/**
 * The state as the current viewer reads it: alerts and the texts of the initial data (chat, reports,
 * photos, notes) in the viewer's language. Actions always work on the stored state.
 */
let viewCache: { snapshot: State; lang: Lang; view: State } | null = null;
function viewOf(s: State): State {
  const lang = s.users.find((u) => u.id === s.currentUserId)?.language ?? s.guestLanguage;
  if (viewCache?.snapshot === s && viewCache.lang === lang) return viewCache.view;
  if (!hasSeedTexts()) createSeed(DEFAULT_LANG);
  const view: State = {
    ...s,
    notifications: s.notifications.map((n) => {
      const text = n.i18n?.[lang] ?? { title: seedText(n.title, lang), message: seedText(n.message, lang) };
      return text.title === n.title && text.message === n.message ? n : { ...n, ...text };
    }),
    chat: s.chat.map((m) => {
      const message = seedText(m.message, lang);
      return message === m.message ? m : { ...m, message };
    }),
    submissions: s.submissions.map((x) => {
      const report = seedText(x.report, lang);
      const photo = seedText(x.photo, lang);
      const rejectionReason = seedText(x.rejectionReason, lang);
      return report === x.report && photo === x.photo && rejectionReason === x.rejectionReason ? x : { ...x, report, photo, rejectionReason };
    }),
    cards: s.cards?.map((c) => {
      const note = seedText(c.note, lang);
      return note === c.note ? c : { ...c, note };
    }),
  };
  viewCache = { snapshot: s, lang, view };
  return view;
}

export function useStore<T>(selector: (s: State) => T): T {
  const cache = useRef<{ snapshot: State; value: T } | null>(null);
  const getSnapshot = () => {
    if (cache.current?.snapshot === state) return cache.current.value;
    const value = selector(viewOf(state));
    cache.current = { snapshot: state, value };
    return value;
  };
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useCurrentUser(): User | null {
  return useStore((s) => s.users.find((u) => u.id === s.currentUserId) ?? null);
}

export function useLang(): Lang {
  return useStore((s) => s.users.find((u) => u.id === s.currentUserId)?.language ?? s.guestLanguage);
}

export function resetDemo() {
  // Restored in the language the person is using now (texts written by people follow it).
  const fresh = createSeed(state.users.find((u) => u.id === state.currentUserId)?.language ?? state.guestLanguage);
  commit(() => fresh);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type Result = { error?: string };

const now = () => new Date().toISOString();

function me(s: State = state): User | null {
  return s.users.find((u) => u.id === s.currentUserId) ?? null;
}

function userById(id: string, s: State = state) {
  return s.users.find((u) => u.id === id);
}

export function localizedTitle(mission: Mission, lang: Lang) {
  if (lang === "en" && mission.titleEn) return mission.titleEn;
  if (lang === "es" && mission.titleEs) return mission.titleEs;
  return mission.title;
}

export function localizedDescription(mission: Mission, lang: Lang) {
  if (lang === "en" && mission.descriptionEn) return mission.descriptionEn;
  if (lang === "es" && mission.descriptionEs) return mission.descriptionEs;
  return mission.description;
}

function notify(s: State, userId: string, build: (lang: Lang) => { title: string; message: string }): Notification[] {
  const user = userById(userId, s);
  if (!user || user.isBot || !user.notificationsEnabled) return s.notifications;
  return [newNotification(userId, user.language, build), ...s.notifications];
}

function newNotification(userId: string, lang: Lang, build: (lang: Lang) => { title: string; message: string }): Notification {
  const i18n = { pt: build("pt"), en: build("en"), es: build("es") };
  return { id: uid(), userId, ...i18n[lang], i18n, isRead: false, createdAt: now() };
}

/** In-app alert to the platform staff (like src/lib/staff-alerts.ts). */
function notifyStaff(s: State, roles: Role[], build: (lang: Lang) => { title: string; message: string }): Notification[] {
  let notifications = s.notifications;
  for (const member of s.users) {
    if (!roles.includes(member.role) || member.isBot || member.isBanned || member.deletedAt) continue;
    notifications = [newNotification(member.id, member.language, build), ...notifications];
  }
  return notifications;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export function loginAs(userId: string): Result {
  const user = userById(userId);
  if (!user) return { error: "generic" };
  if (user.isBanned) return { error: "banned" };
  if (isSuspended(user.suspendedUntil)) return { error: "suspended" };
  commit((s) => ({ ...s, currentUserId: userId }));
  return {};
}

export function logout() {
  const lang = me()?.language ?? state.guestLanguage;
  commit((s) => ({ ...s, currentUserId: null, guestLanguage: lang }));
}

export function setGuestLanguage(lang: Lang) {
  commit((s) => ({ ...s, guestLanguage: lang }));
}

export function register(
  name: string,
  email: string,
  password: string,
  consent: { terms: boolean; age: boolean } = { terms: false, age: false },
): Result {
  if (!consent.terms) return { error: "terms_required" };
  if (!consent.age) return { error: "age_required" };
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (cleanName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { error: "invalid" };
  if (password.length < 8) return { error: "password" };
  if (state.users.some((u) => u.email.toLowerCase() === cleanEmail)) return { error: "email_exists" };
  const id = uid();
  const user: User = {
    id,
    name: cleanName,
    email: cleanEmail,
    role: "citizen",
    totalPoints: 0,
    walletAddress: null,
    pendingWallet: null,
    adultDeclaredAt: null,
    isBanned: false,
    banReason: null,
    createdAt: now(),
    termsAcceptedAt: now(),
    language: state.guestLanguage,
    fontSize: "medium",
    highContrast: false,
    reducedMotion: false,
    notificationsEnabled: true,
  };
  const ok = commit((s) => {
    const next = { ...s, users: [...s.users, user], currentUserId: id };
    return { ...next, notifications: notify(next, id, (l) => ({ title: dt(l, "notif_welcome_title"), message: dt(l, "notif_welcome_msg") })) };
  });
  return ok ? {} : { error: "storage" };
}

/* ------------------------------------------------------------------ */
/* Wallet & settings                                                   */
/* ------------------------------------------------------------------ */

/* Same rules as src/lib/actions/wallet.ts; the admin confirmation is simulated by a button. */

export function requestWalletLink(address: string, adult: boolean): Result {
  const user = me();
  if (!user) return { error: "generic" };
  const clean = normalizeHex(address);
  if (!user.adultDeclaredAt && !adult) return { error: "wallet_error_adult" };
  if (!isValidFoneAddress(clean)) return { error: "wallet_error_invalid" };
  if (user.walletAddress === clean) return { error: "wallet_error_already" };
  if (state.users.some((u) => u.id !== user.id && u.walletAddress === clean)) return { error: "wallet_error_in_use" };
  const taken = new Set(
    state.users.filter((u) => u.id !== user.id && u.pendingWallet).map((u) => foneToCents(u.pendingWallet!.amount)),
  );
  const cents = pickChallengeCents(taken);
  if (cents === null) return { error: "wallet_error_later" };
  commit((s) => ({
    ...s,
    users: s.users.map((u) =>
      u.id === user.id
        ? {
            ...u,
            pendingWallet: { address: clean, amount: centsToFone(cents), createdAt: now() },
            adultDeclaredAt: u.adultDeclaredAt ?? now(),
          }
        : u,
    ),
  }));
  return {};
}

export function cancelWalletRequest() {
  const user = me();
  if (!user) return;
  commit((s) => ({ ...s, users: s.users.map((u) => (u.id === user.id ? { ...u, pendingWallet: null } : u)) }));
}

/** In the real app an admin checks the transfer on the explorer; here a button does it. */
export function simulateWalletVerification(): Result {
  const user = me();
  if (!user?.pendingWallet) return { error: "generic" };
  const address = user.pendingWallet.address;
  if (state.users.some((u) => u.id !== user.id && u.walletAddress === address)) return { error: "wallet_error_in_use" };
  commit((s) => {
    const next: State = {
      ...s,
      users: s.users.map((u) => (u.id === user.id ? { ...u, walletAddress: address, pendingWallet: null } : u)),
    };
    return {
      ...next,
      notifications: notify(next, user.id, (l) => ({ title: dt(l, "notif_wallet_title"), message: dt(l, "notif_wallet_msg") })),
    };
  });
  return {};
}

export function updateSettings(patch: Partial<Pick<User, "language" | "fontSize" | "theme" | "highContrast" | "reducedMotion" | "notificationsEnabled">>) {
  const user = me();
  if (!user) return;
  commit((s) => ({ ...s, users: s.users.map((u) => (u.id === user.id ? { ...u, ...patch } : u)) }));
}

/* ------------------------------------------------------------------ */
/* Submissions (same rules as src/lib/actions/submissions.ts)          */
/* ------------------------------------------------------------------ */

export const DAILY_SUBMISSION_LIMIT = 5;

export type NewSubmission = {
  missionId: string;
  photo: string;
  photoHash: string;
  report: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  simulatedLocation: boolean;
  /** Recycling missions: raw values typed on the form. */
  material?: string | null;
  weight?: string | null;
  /** Sample photo picked in the demo (drives the simulated AI). null = camera/gallery photo. */
  sample?: SampleKind | null;
  /** Real analysis of a camera/gallery photo with the tester's own Gemini key (see byok.ts). */
  realAi?: { analysis: AiAnalysis; model: string } | { failed: true } | null;
};

/**
 * Runs every rule of submitProof without saving anything. The submit screen calls it before
 * spending a Gemini request on a proof that would be refused anyway.
 */
export function checkProof(input: NewSubmission): Result {
  const user = me();
  if (!user) return { error: "error_generic" };
  if (user.isBanned) return { error: "error_banned" };
  const mission = state.missions.find((m) => m.id === input.missionId && m.isActive);
  if (!mission) return { error: "error_generic" };
  if (mission.organizationId && !orgRole(state, mission.organizationId, user.id)) return { error: "error_generic" };
  const eventError = eventSubmissionError(mission);
  if (eventError) return { error: `error_${eventError}` };
  if (!input.photo) return { error: "error_photo_required" };
  const report = input.report.trim();
  if (report.length < 50 || report.length > 1000) return { error: "error_report_length" };
  const recycling = checkRecyclingInput(mission.category, input.material, input.weight);
  if (recycling.error) return { error: `error_${recycling.error}` };

  if (!(input.accuracy <= MAX_GPS_ACCURACY_METERS)) return { error: "error_location_inaccurate" };
  if (
    mission.scope !== "anywhere" &&
    distanceMeters(input.latitude, input.longitude, mission.latitude, mission.longitude) > MAX_DISTANCE_METERS
  ) {
    return { error: "error_outside_mission_area" };
  }

  const mine = state.submissions.filter((s) => s.userId === user.id);
  if (mine.some((s) => s.missionId === mission.id && s.status !== "rejected")) return { error: "error_already_submitted" };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (mine.filter((s) => new Date(s.submittedAt) >= startOfToday).length >= DAILY_SUBMISSION_LIMIT) {
    return { error: "error_daily_limit" };
  }
  if (state.submissions.some((s) => s.photoHash === input.photoHash)) return { error: "error_duplicate_photo" };
  return {};
}

/** Returns an i18n DictKey suffix (error_*) on failure. */
export function submitProof(input: NewSubmission): Result {
  const checked = checkProof(input);
  if (checked.error) return checked;
  const user = me();
  const mission = state.missions.find((m) => m.id === input.missionId && m.isActive);
  if (!user || !mission) return { error: "error_generic" };
  const report = input.report.trim();

  const lang = user.language;
  const real = input.sample ? null : (input.realAi ?? null);
  const realAnalysis = real && "analysis" in real ? real : null;
  const analysis = input.sample ? simulateAnalysis(input.sample, mission.category, lang) : (realAnalysis?.analysis ?? null);
  const aiFailed = !!real && "failed" in real;
  const web = simulateWebSearch(input.sample ?? null);
  const recycling = checkRecyclingInput(mission.category, input.material, input.weight);
  const decision = decideProof({
    settings: DEFAULT_AI_SETTINGS,
    analysis,
    similar: null,
    foneReward: Number(mission.foneReward),
    web: webVerdict(web),
    weightKg: recycling.weightKg,
  });
  const webChecks = web ? { webChecked: true, webFullMatches: web.fullMatches, webPages: web.pages, webPartialCount: web.partialCount, webBestGuess: web.bestGuess } : {};
  const submission: Submission = {
    id: uid(),
    userId: user.id,
    missionId: mission.id,
    photo: input.photo,
    photoHash: input.photoHash,
    report,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
    simulatedLocation: input.simulatedLocation,
    material: recycling.material,
    weightKg: recycling.weightKg,
    declaredWeightKg: recycling.weightKg,
    status: "pending",
    reviewedBy: null,
    rejectionReason: null,
    submittedAt: now(),
    reviewedAt: null,
    aiStatus: analysis ? "done" : aiFailed ? "failed" : null,
    aiModel: input.sample ? "simulated" : (realAnalysis?.model ?? null),
    aiVerdict: analysis ? decision.verdict : null,
    aiConfidence: analysis ? decision.confidence : null,
    aiReasonCode: decision.reasonCode,
    aiSummary: analysis ? analysis.explanation : null,
    aiChecks: analysis ? { ...analysis, ...webChecks } : null,
  };
  const ok = commit((s) => {
    const next: State = { ...s, submissions: [submission, ...s.submissions] };
    if (decision.action === "approve") return applyApproval(next, submission.id, null);
    if (decision.action === "reject" && decision.reasonCode) return applyRejection(next, submission.id, null, decision.reasonCode, "");
    // Possible copy from the internet: never decided by the AI, the staff is alerted.
    if (decision.reasonCode === "internet_copy") {
      return {
        ...next,
        notifications: notifyStaff(next, moderatorsOn(next) ? ["admin", "moderator"] : ["admin"], (l) => ({
          title: t(l, "staff_internet_title"),
          message: tf(l, "staff_internet_message", { name: user.name, mission: localizedTitle(mission, l) }),
        })),
      };
    }
    return next;
  });
  return ok ? {} : { error: "storage" };
}

/* ------------------------------------------------------------------ */
/* Approve / reject (shared by the moderators and the simulated AI)    */
/* ------------------------------------------------------------------ */

/** reviewerId null = automatic verification. */
function applyApproval(s: State, submissionId: string, reviewerId: string | null): State {
  const sub = s.submissions.find((x) => x.id === submissionId);
  const mission = sub && s.missions.find((m) => m.id === sub.missionId);
  if (!sub || !mission || sub.status !== "pending") return s;
  const reviewedAt = now();
  const next: State = {
    ...s,
    submissions: s.submissions.map((x) =>
      x.id === sub.id ? { ...x, status: "approved", reviewedBy: reviewerId, reviewedAt, decidedBy: reviewerId ? "human" : "ai", rejectionCode: null } : x,
    ),
    users: s.users.map((u) => (u.id === sub.userId ? { ...u, totalPoints: u.totalPoints + mission.pointsReward } : u)),
  };
  // Same rules as the server (src/lib/review.ts): 0-FONE missions create no payment, budgets/caps hold the FONE.
  const paysFone = PAYMENTS_ENABLED && Number(mission.foneReward) > 0;
  const holdReason = paysFone ? holdReasonFor(s, sub.userId, mission) : null;
  if (paysFone) {
    next.rewards = [
      {
        id: uid(),
        userId: sub.userId,
        submissionId: sub.id,
        foneAmount: mission.foneReward,
        status: "pending",
        txHash: null,
        createdAt: reviewedAt,
        paidAt: null,
        holdReason,
        sponsorId: mission.sponsorId ?? null,
      },
      ...s.rewards,
    ];
  }
  const vars = (l: Lang) => ({ mission: localizedTitle(mission, l), points: mission.pointsReward, fone: mission.foneReward });
  const withFone = paysFone && !holdReason;
  let notifications = notify(next, sub.userId, (l) => ({
    title: dt(l, "notif_approved_title"),
    message: dt(l, withFone ? (reviewerId ? "notif_approved_msg" : "notif_ai_approved_msg") : "notif_approved_points_msg", vars(l)),
  }));
  if (holdReason) {
    notifications = notify({ ...next, notifications }, sub.userId, (l) => ({
      title: dt(l, "notif_hold_title"),
      message: dt(l, holdReason === "user_cap" ? "notif_hold_user_cap" : holdReason === "sponsor_budget" ? "notif_hold_sponsor" : "notif_hold_budget", { fone: mission.foneReward }),
    }));
  }
  // New badges unlocked by this approval (src/lib/achievements.ts).
  const asAction = (x: Submission): ApprovedAction => {
    const m = s.missions.find((mm) => mm.id === x.missionId);
    return { category: m?.category ?? "other", at: x.submittedAt, weightKg: x.weightKg ?? null, isEvent: !!m?.startsAt };
  };
  const before = s.submissions.filter((x) => x.userId === sub.userId && x.status === "approved").map(asAction);
  const lang = userById(sub.userId, s)?.language ?? DEFAULT_LANG;
  for (const badge of newlyEarned(before, asAction(sub), lang)) {
    notifications = notify({ ...next, notifications }, sub.userId, (l) => ({
      title: tx(l, "Nova conquista!", "New badge!", "¡Nuevo logro!"),
      message: `${badge.emoji} ${tx(l, "Você conquistou", "You earned", "Lograste")}: ${newlyEarned(before, asAction(sub), l).find((b) => b.id === badge.id)?.name ?? badge.name}`,
    }));
  }
  return { ...next, notifications };
}

function applyRejection(s: State, submissionId: string, reviewerId: string | null, code: RejectionCode | null, reason: string): State {
  const sub = s.submissions.find((x) => x.id === submissionId);
  if (!sub || sub.status !== "pending") return s;
  const mission = s.missions.find((m) => m.id === sub.missionId);
  const author = userById(sub.userId, s);
  const storedReason = reason || rejectionReasonText(code, author?.language ?? "pt") || "";
  const next: State = {
    ...s,
    submissions: s.submissions.map((x) =>
      x.id === sub.id
        ? { ...x, status: "rejected", reviewedBy: reviewerId, rejectionReason: storedReason, rejectionCode: code, reviewedAt: now(), decidedBy: reviewerId ? "human" : "ai" }
        : x,
    ),
  };
  return {
    ...next,
    notifications: notify(next, sub.userId, (l) => {
      const title = mission ? localizedTitle(mission, l) : "";
      // The message template adds the final period.
      const text = composeRejectionMessage(code, reason, l).replace(/[.!\s]+$/, "");
      return reviewerId
        ? { title: dt(l, "notif_rejected_title"), message: dt(l, "notif_rejected_msg", { mission: title, reason: text }) }
        : { title: dt(l, "notif_ai_rejected_title"), message: dt(l, "notif_ai_rejected_msg", { mission: title, reason: text }) };
    }),
  };
}

/** LGPD art. 20: a proof rejected by the automatic verification goes back to a human moderator. */
export function appealSubmission(submissionId: string, message: string): Result {
  const user = me();
  if (!user) return { error: "appeal_error_generic" };
  const text = message.trim();
  if (text.length < 10 || text.length > 500) return { error: "appeal_error_appeal_length" };
  const sub = state.submissions.find((x) => x.id === submissionId && x.userId === user.id);
  if (!sub || sub.status !== "rejected" || sub.decidedBy !== "ai") return { error: "appeal_error_generic" };
  if (sub.appealedAt) return { error: "appeal_error_appeal_already_sent" };
  if (state.submissions.some((x) => x.userId === user.id && x.missionId === sub.missionId && x.status !== "rejected")) {
    return { error: "appeal_error_appeal_other_active" };
  }
  const ok = commit((s) => ({
    ...s,
    submissions: s.submissions.map((x) =>
      x.id === sub.id
        ? { ...x, status: "pending", appealedAt: now(), appealMessage: text, decidedBy: null, reviewedAt: null }
        : x,
    ),
  }));
  return ok ? {} : { error: "storage" };
}

/* ------------------------------------------------------------------ */
/* Moderation (atomic, reviewer can't review own submission)           */
/* ------------------------------------------------------------------ */

function canModerate(user: User | null): user is User {
  return !!user && canReview(user.role, moderatorsOn()) && !user.isBanned;
}

/** `weight`: the reviewer may correct the declared weight of a recycling delivery (same rule as the server). */
export function approveSubmission(submissionId: string, weight?: string): Result {
  const reviewer = me();
  if (!canModerate(reviewer)) return { error: "error_generic" };
  const sub = state.submissions.find((s) => s.id === submissionId);
  if (!sub || sub.status !== "pending") return { error: "error_generic" };
  if (sub.userId === reviewer.id) return { error: "own_submission_warning" };
  if (!state.missions.some((m) => m.id === sub.missionId)) return { error: "error_generic" };
  let weightKg = sub.weightKg ?? null;
  if (sub.material && weight && weight.trim()) {
    weightKg = parseWeightKg(weight);
    if (weightKg === null) return { error: "error_weight_invalid" };
  }
  commit((s) => applyApproval({ ...s, submissions: s.submissions.map((x) => (x.id === sub.id ? { ...x, weightKg } : x)) }, sub.id, reviewer.id));
  return {};
}

export function rejectSubmission(submissionId: string, reason: string, code: RejectionCode | null = null, giveCard = false): Result {
  const reviewer = me();
  if (!canModerate(reviewer)) return { error: "error_generic" };
  const cleanReason = reason.trim().slice(0, 1000);
  const sub = state.submissions.find((s) => s.id === submissionId);
  if (!sub || sub.status !== "pending") return { error: "error_generic" };
  if (sub.userId === reviewer.id) return { error: "own_submission_warning" };
  // Same rule as the server: a flagged internet copy needs the moderator's own explanation.
  const invalid = validateRejection({ flagged: isInternetCopyFlag(sub.aiReasonCode), text: cleanReason });
  if (invalid) return { error: invalid === "explanation_required" ? "internet_explain_required" : "reason_too_short" };
  if (giveCard && cleanReason.length < CARD_NOTE_MIN) return { error: "card_note_short" };
  commit((s) => {
    const next = applyRejection(s, sub.id, reviewer.id, code, cleanReason);
    if (!giveCard) return next;
    // Same as the server: the yellow card is explained by the moderator's own words.
    return applyCard(next, { userId: sub.userId, type: "yellow", reason: cardReasonForRejection(code), note: ownWords(cleanReason) || cleanReason, issuerId: reviewer.id, submissionId: sub.id });
  });
  return {};
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

function isAdmin(user: User | null): user is User {
  return !!user && user.role === "admin";
}

export type NewMission = Omit<Mission, "id" | "createdAt" | "isActive">;

export function createMission(input: NewMission): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  const fone = Number(input.foneReward);
  const valid =
    input.title.trim().length >= 3 &&
    input.description.trim().length >= 10 &&
    Number.isInteger(input.pointsReward) &&
    input.pointsReward > 0 &&
    input.pointsReward <= 10000 &&
    Number.isFinite(fone) &&
    fone >= 0 &&
    fone <= 100000 &&
    Math.abs(input.latitude) <= 90 &&
    Math.abs(input.longitude) <= 180;
  if (!valid) return { error: "invalid_form" };
  const sponsor = input.sponsorId ? (state.sponsors ?? []).find((x) => x.id === input.sponsorId) : null;
  if (input.sponsorId && !sponsor) return { error: "invalid_form" };
  const mission: Mission = {
    ...input,
    sponsorId: sponsor?.id ?? null,
    sponsorName: sponsor ? sponsor.name : input.sponsorName,
    title: input.title.trim(),
    description: input.description.trim(),
    foneReward: fone.toFixed(2),
    id: uid(),
    isActive: true,
    createdAt: now(),
  };
  commit((s) => ({ ...s, missions: [mission, ...s.missions] }));
  return {};
}

/* ------------------------------------------------------------------ */
/* Regional missions                                                   */
/* ------------------------------------------------------------------ */

export function setRegion(region: Region | null) {
  commit((s) => ({ ...s, region }));
}

export function setRegionRadius(radiusKm: RegionRadius) {
  commit((s) => (s.region ? { ...s, region: { ...s.region, radiusKm } } : s));
}

export function requestMissionsHere(): Result {
  const user = me();
  const region = state.region;
  if (!user || !region) return { error: "error_generic" };
  const list = state.missionRequests ?? [];
  if (list.some((r) => r.userId === user.id && r.ibge === region.ibge)) return {};
  commit((s) => ({
    ...s,
    missionRequests: [...(s.missionRequests ?? []), { userId: user.id, ibge: region.ibge, city: region.city, uf: region.uf, createdAt: now() }],
  }));
  return {};
}

/**
 * Offline stand-in for the OpenStreetMap search of the real app: creates example places
 * around the city centre (points only, waiting for review). Runs once per city.
 */
export function seedExampleMissions(region: Region): number {
  if ((state.seededCities ?? []).includes(region.ibge)) return 0;
  const picks: { kind: OsmKind; dLat: number; dLng: number }[] = [
    { kind: "park", dLat: 0.008, dLng: -0.006 },
    { kind: "recycling", dLat: -0.005, dLng: 0.009 },
    { kind: "cooking_oil", dLat: 0.012, dLng: 0.011 },
  ];
  const created: Mission[] = picks.map(({ kind, dLat, dLng }, index) => {
    const template = OSM_TEMPLATES[kind];
    const name = (lang: "pt" | "en" | "es") => template.fallbackName[lang];
    return {
      id: `auto-${region.ibge}-${index}`,
      title: template.title(name("pt")).pt,
      titleEn: template.title(name("en")).en,
      titleEs: template.title(name("es")).es,
      description: template.description.pt,
      descriptionEn: template.description.en,
      descriptionEs: template.description.es,
      context: template.context.pt,
      contextEn: template.context.en,
      contextEs: template.context.es,
      impact: template.impact.pt,
      impactEn: template.impact.en,
      impactEs: template.impact.es,
      latitude: region.lat + dLat,
      longitude: region.lng + dLng,
      category: template.category,
      pointsReward: template.points,
      foneReward: "0.00",
      isActive: true,
      createdAt: now(),
      scope: "local",
      city: region.city,
      stateCode: region.uf,
      origin: "auto",
      needsReview: true,
    };
  });
  commit((s) => ({ ...s, missions: [...created, ...s.missions], seededCities: [...(s.seededCities ?? []), region.ibge] }));
  return created.length;
}

/** Admin review of an auto mission: set FONE, keep points only, or switch it off. */
export function reviewMission(missionId: string, decision: "fone" | "points" | "deactivate", fone?: number): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  if (decision === "fone" && !(typeof fone === "number" && Number.isFinite(fone) && fone > 0 && fone <= 100000)) return { error: "invalid_form" };
  commit((s) => ({
    ...s,
    missions: s.missions.map((m) =>
      m.id !== missionId
        ? m
        : decision === "deactivate"
          ? { ...m, isActive: false, needsReview: false }
          : decision === "fone"
            ? { ...m, needsReview: false, foneReward: (fone as number).toFixed(2) }
            : { ...m, needsReview: false },
    ),
  }));
  return {};
}

export function toggleMission(missionId: string) {
  if (!isAdmin(me())) return;
  commit((s) => ({ ...s, missions: s.missions.map((m) => (m.id === missionId ? { ...m, isActive: !m.isActive } : m)) }));
}

export function setUserRole(userId: string, role: Role): Result {
  const admin = me();
  if (!isAdmin(admin) || admin.id === userId) return { error: "error_generic" };
  commit((s) => ({ ...s, users: s.users.map((u) => (u.id === userId ? { ...u, role } : u)) }));
  return {};
}

export function setUserBan(userId: string, banned: boolean, reason?: string): Result {
  const admin = me();
  if (!isAdmin(admin) || admin.id === userId) return { error: "error_generic" };
  commit((s) => ({
    ...s,
    users: s.users.map((u) =>
      u.id === userId
        ? {
            ...u,
            isBanned: banned,
            banReason: banned ? reason?.trim() || null : null,
            bannedAt: banned ? now() : null,
            banAppealMessage: null,
            banAppealedAt: null,
          }
        : u,
    ),
  }));
  return {};
}

/** Minimum length of a block appeal (like lib/actions/ban-appeal.ts). */
export const BAN_APPEAL_MIN = 20;

/**
 * Appeal of a blocked account, sent from the "account blocked" screen (no session, like the
 * server). One appeal per block; the admins are alerted.
 */
export function appealBan(userId: string, message: string): Result {
  const text = message.trim().slice(0, 1500);
  const user = userById(userId);
  if (!user || (!user.isBanned && !isSuspended(user.suspendedUntil)) || user.deletedAt) return { error: "error_generic" };
  if (user.banAppealedAt) return { error: "error_generic" };
  if (text.length < BAN_APPEAL_MIN) return { error: "banned_appeal_too_short" };
  commit((s) => {
    const next: State = { ...s, users: s.users.map((u) => (u.id === userId ? { ...u, banAppealMessage: text, banAppealedAt: now() } : u)) };
    return {
      ...next,
      notifications: notifyStaff(next, ["admin"], (l) => ({
        title: t(l, "staff_ban_appeal_title"),
        message: tf(l, "staff_ban_appeal_message", { name: user.name }),
      })),
    };
  });
  return {};
}

/* ------------------------------------------------------------------ */
/* Cards and suspension (same rules as src/lib/cards-server.ts)        */
/* ------------------------------------------------------------------ */

export function moderatorsOn(s: State = state): boolean {
  return s.moderatorsEnabled ?? true;
}

export function setModeratorsEnabled(enabled: boolean): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  commit((s) => ({ ...s, moderatorsEnabled: enabled }));
  return {};
}

export function cardsOf(s: State, userId: string): DemoCard[] {
  return (s.cards ?? []).filter((c) => c.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

type CardInput = { userId: string; type: CardType; reason: CardReason; note: string; issuerId: string; submissionId?: string | null };

function applyCard(s: State, input: CardInput): State {
  const target = userById(input.userId, s);
  if (!target || target.deletedAt) return s;
  const at = new Date();
  const existing = cardsOf(s, input.userId);
  const outcome = input.type === "yellow" ? yellowOutcome(existing, target.suspendedUntil ?? null, at) : null;
  const note = input.note.trim().slice(0, 1000);
  const card: DemoCard = {
    id: uid(),
    userId: input.userId,
    type: input.type,
    reasonCode: input.reason,
    note,
    submissionId: input.submissionId ?? null,
    issuedBy: input.issuerId,
    createdAt: at.toISOString(),
    expiresAt: cardExpiresAt(input.type, at)?.toISOString() ?? null,
    consumedAt: outcome?.suspend ? at.toISOString() : null,
    causedSuspension: !!outcome?.suspend,
    revokedAt: null,
    appealMessage: null,
    appealedAt: null,
    appealRejectedAt: null,
  };
  const consumed = new Set(outcome?.suspend ? countingYellows(existing, at).map((c) => c.id) : []);
  // In the language of the person who receives the card (they read the reason on the blocked screen).
  const label = CARD_REASON_LABELS[input.reason][userById(input.userId, s)?.language ?? DEFAULT_LANG];
  const next: State = {
    ...s,
    cards: [card, ...(s.cards ?? []).map((c) => (consumed.has(c.id) ? { ...c, consumedAt: at.toISOString() } : c))],
    users: s.users.map((u) => {
      if (u.id !== input.userId) return u;
      if (input.type === "red") return { ...u, isBanned: true, banReason: `${label}. ${note}`, bannedAt: at.toISOString(), banAppealMessage: null, banAppealedAt: null };
      if (outcome?.suspend) return { ...u, suspendedUntil: outcome.suspendedUntil?.toISOString() ?? null, suspensionReason: `${label}. ${note}`, banAppealMessage: null, banAppealedAt: null };
      return u;
    }),
    // The person is logged out when suspended or blocked.
    currentUserId: (input.type === "red" || outcome?.suspend) && s.currentUserId === input.userId ? null : s.currentUserId,
  };
  const notice = cardNoticeText(target.language, {
    type: input.type,
    reason: input.reason,
    note,
    outcome,
    until: outcome?.suspendedUntil ? formatDate(outcome.suspendedUntil.toISOString(), target.language) : undefined,
  });
  // Always delivered (even with notifications off): the person must know why.
  let notifications: Notification[] = target.isBot
    ? next.notifications
    : [{ id: uid(), userId: target.id, title: notice.title, message: notice.message, isRead: false, createdAt: now() }, ...next.notifications];
  if (outcome?.repeatOffence) {
    notifications = notifyStaff({ ...next, notifications }, ["admin"], (l) => ({
      title: t(l, "staff_repeat_title"),
      message: tf(l, "staff_repeat_message", { name: target.name }),
    }));
  }
  return { ...next, notifications };
}

/** Yellow card: moderators (when enabled) and admins. Red card: admins only. */
export function giveCard(userId: string, type: CardType, reason: CardReason, note: string): Result {
  const staff = me();
  if (!canModerate(staff)) return { error: "error_generic" };
  if (userId === staff.id) return { error: "error_generic" };
  if (type === "red" && staff.role !== "admin") return { error: "error_generic" };
  if (note.trim().length < CARD_NOTE_MIN) return { error: "card_note_short" };
  commit((s) => applyCard(s, { userId, type, reason, note, issuerId: staff.id }));
  return {};
}

export function appealCard(cardId: string, message: string): Result {
  const user = me();
  const text = message.trim();
  if (!user) return { error: "error_generic" };
  if (text.length < CARD_APPEAL_MIN) return { error: "banned_appeal_too_short" };
  const card = (state.cards ?? []).find((c) => c.id === cardId && c.userId === user.id);
  if (!card || !isCardActive(card) || card.appealedAt) return { error: "error_generic" };
  commit((s) => {
    const next: State = { ...s, cards: (s.cards ?? []).map((c) => (c.id === cardId ? { ...c, appealMessage: text.slice(0, 1500), appealedAt: now() } : c)) };
    return {
      ...next,
      notifications: notifyStaff(next, ["admin"], (l) => ({ title: t(l, "staff_card_appeal_title"), message: tf(l, "staff_card_appeal_message", { name: user.name }) })),
    };
  });
  return {};
}

function notifyUser(s: State, userId: string, build: (lang: Lang) => { title: string; message: string }): Notification[] {
  const user = userById(userId, s);
  if (!user || user.isBot) return s.notifications;
  return [newNotification(userId, user.language, build), ...s.notifications];
}

/** Cancels a card; a suspension card lifts the suspension and gives back the series; a red card unblocks. */
export function revokeCard(cardId: string): Result {
  const admin = me();
  if (!isAdmin(admin)) return { error: "error_generic" };
  const card = (state.cards ?? []).find((c) => c.id === cardId);
  if (!card || card.revokedAt) return { error: "error_generic" };
  commit((s) => {
    const at = now();
    const series = card.causedSuspension && card.consumedAt ? card.consumedAt : null;
    const next: State = {
      ...s,
      cards: (s.cards ?? []).map((c) =>
        c.id === cardId ? { ...c, revokedAt: at, consumedAt: null } : series && c.userId === card.userId && c.consumedAt === series && !c.revokedAt ? { ...c, consumedAt: null } : c,
      ),
      users: s.users.map((u) => {
        if (u.id !== card.userId) return u;
        let updated = u;
        if (series && isSuspended(u.suspendedUntil)) updated = { ...updated, suspendedUntil: null, suspensionReason: null, banAppealMessage: null, banAppealedAt: null };
        if (card.type === "red") updated = { ...updated, isBanned: false, banReason: null, bannedAt: null, banAppealMessage: null, banAppealedAt: null };
        return updated;
      }),
    };
    return {
      ...next,
      notifications: notifyUser(next, card.userId, (l) => ({ title: t(l, "card_revoked_title"), message: tf(l, "card_revoked_message", { reason: CARD_REASON_LABELS[card.reasonCode][l] }) })),
    };
  });
  return {};
}

export function keepCard(cardId: string): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  const card = (state.cards ?? []).find((c) => c.id === cardId);
  if (!card || card.revokedAt || card.appealRejectedAt) return { error: "error_generic" };
  commit((s) => {
    const next: State = { ...s, cards: (s.cards ?? []).map((c) => (c.id === cardId ? { ...c, appealRejectedAt: now() } : c)) };
    return {
      ...next,
      notifications: notifyUser(next, card.userId, (l) => ({ title: t(l, "card_kept_title"), message: tf(l, "card_kept_message", { reason: CARD_REASON_LABELS[card.reasonCode][l] }) })),
    };
  });
  return {};
}

export function liftSuspension(userId: string): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  commit((s) => {
    const next: State = { ...s, users: s.users.map((u) => (u.id === userId ? { ...u, suspendedUntil: now(), banAppealMessage: null, banAppealedAt: null } : u)) };
    return { ...next, notifications: notifyUser(next, userId, (l) => ({ title: t(l, "suspension_lifted_title"), message: t(l, "suspension_lifted_message") })) };
  });
  return {};
}

/* ------------------------------------------------------------------ */
/* FONE payouts: minimum, hold period, budgets, sponsors               */
/* ------------------------------------------------------------------ */

export function payoutSettingsOf(s: State = state): PayoutSettings {
  return s.payoutSettings ?? DEFAULT_PAYOUT_SETTINGS;
}

const cents = (value: string) => foneToCents(value);

/** FONE committed by a sponsor's rewards (held ones don't count) and what's left. */
export function sponsorBalance(s: State, sponsorId: string) {
  const sponsor = (s.sponsors ?? []).find((x) => x.id === sponsorId);
  const committed = s.rewards.filter((r) => r.sponsorId === sponsorId && !r.holdReason);
  const spentCents = committed.reduce((sum, r) => sum + cents(r.foneAmount), 0);
  const paidCents = committed.filter((r) => r.status === "paid").reduce((sum, r) => sum + cents(r.foneAmount), 0);
  const budgetCents = sponsor ? cents(sponsor.budgetFone) : 0;
  return { budgetCents, spentCents, paidCents, remainingCents: Math.max(0, budgetCents - spentCents) };
}

/** Treasury FONE committed this month (not sponsored, not held). */
export function treasuryMonthCents(s: State = state) {
  const since = monthStart().toISOString();
  return s.rewards.filter((r) => !r.sponsorId && !r.holdReason && r.createdAt >= since).reduce((sum, r) => sum + cents(r.foneAmount), 0);
}

function holdReasonFor(s: State, userId: string, mission: Mission): HoldReason | null {
  const since = monthStart().toISOString();
  const userMonthCents = s.rewards.filter((r) => r.userId === userId && !r.holdReason && r.createdAt >= since).reduce((sum, r) => sum + cents(r.foneAmount), 0);
  return decideHold({
    amountCents: cents(mission.foneReward),
    sponsored: !!mission.sponsorId,
    sponsorRemainingCents: mission.sponsorId ? sponsorBalance(s, mission.sponsorId).remainingCents : undefined,
    treasuryMonthCents: treasuryMonthCents(s),
    userMonthCents,
    settings: payoutSettingsOf(s),
  });
}

/** One person's open rewards split into payable now / in hold period / held. */
export function userPayout(s: State, userId: string) {
  return splitOpenRewards(
    s.rewards.filter((r) => r.userId === userId && r.status === "pending"),
    payoutSettingsOf(s),
  );
}

/** Pays (simulated) everything that is past the hold period, not held, and at least the minimum. */
export function simulateUserPayout(userId: string): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  const owner = userById(userId);
  // FONE of a suspended or blocked account stays frozen (kept, not lost).
  if (owner && (owner.isBanned || isSuspended(owner.suspendedUntil))) return { error: "payout_account_restricted" };
  if (!owner?.walletAddress) return { error: "no_wallet_warning" };
  const split = userPayout(state, userId);
  if (!split.payable.length) return { error: "payout_nothing_ready" };
  if (split.belowMinimum) return { error: "payout_min_error" };
  const ids = new Set(split.payable.map((r) => r.id));
  const txHash = fakeTxHash();
  commit((s) => {
    const next: State = {
      ...s,
      rewards: s.rewards.map((r) => (ids.has(r.id) ? { ...r, status: "paid", txHash, walletAddress: owner.walletAddress, paidAt: now() } : r)),
    };
    return {
      ...next,
      notifications: notify(next, userId, (l) => ({
        title: dt(l, "notif_paid_title"),
        message: dt(l, "notif_paid_msg", { fone: centsToFone(split.payableCents) }),
      })),
    };
  });
  return {};
}

/** Demo only: moves the clock forward so rewards in the hold period become payable. */
export function skipHoldPeriod(): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  const days = payoutSettingsOf().holdDays;
  commit((s) => ({
    ...s,
    rewards: s.rewards.map((r) =>
      r.status === "pending" && releaseDate(r.createdAt, days).getTime() > Date.now()
        ? { ...r, createdAt: new Date(Date.now() - days * 24 * 60 * 60 * 1000 - 60_000).toISOString() }
        : r,
    ),
  }));
  return {};
}

export function updatePayoutSettings(input: { minPayoutFone: string; holdDays: string; monthlyBudgetFone: string; maxFonePerUserMonth: string }): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  const amount = (raw: string, optional: boolean) => {
    const v = raw.trim().replace(",", ".");
    if (v === "") return optional ? null : NaN;
    return Number(v);
  };
  const min = amount(input.minPayoutFone, false) as number;
  const budget = amount(input.monthlyBudgetFone, true);
  const cap = amount(input.maxFonePerUserMonth, true);
  const hold = Number(input.holdDays);
  const ok = (v: number | null) => v === null || (Number.isFinite(v) && v >= 0 && v <= 1_000_000);
  if (!ok(min) || Number.isNaN(min) || !ok(budget) || !ok(cap) || !Number.isInteger(hold) || hold < 0 || hold > 90) return { error: "invalid_form" };
  commit((s) => ({ ...s, payoutSettings: { minPayoutFone: min, holdDays: hold, monthlyBudgetFone: budget, maxFonePerUserMonth: cap } }));
  return {};
}

export function releaseHeldRewards(reason: HoldReason): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  commit((s) => {
    const released = s.rewards.filter((r) => r.status === "pending" && r.holdReason === reason);
    let next: State = { ...s, rewards: s.rewards.map((r) => (r.status === "pending" && r.holdReason === reason ? { ...r, holdReason: null } : r)) };
    const byUser = new Map<string, number>();
    for (const r of released) byUser.set(r.userId, (byUser.get(r.userId) ?? 0) + cents(r.foneAmount));
    for (const [userId, total] of byUser) {
      next = { ...next, notifications: notify(next, userId, (l) => ({ title: dt(l, "notif_released_title"), message: dt(l, "notif_released_msg", { fone: centsToFone(total) }) })) };
    }
    return next;
  });
  return {};
}

export function createSponsor(name: string, budget: string): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  const value = Number(budget.trim().replace(",", "."));
  if (!name.trim() || !Number.isFinite(value) || value < 0 || value > 1_000_000) return { error: "invalid_form" };
  const sponsor: Sponsor = { id: uid(), name: name.trim().slice(0, 80), budgetFone: value.toFixed(2), isActive: true, createdAt: now() };
  commit((s) => ({ ...s, sponsors: [...(s.sponsors ?? []), sponsor] }));
  return {};
}

export function topUpSponsor(sponsorId: string, amount: string): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  const value = Number(amount.trim().replace(",", "."));
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) return { error: "invalid_form" };
  commit((s) => ({
    ...s,
    sponsors: (s.sponsors ?? []).map((x) => (x.id === sponsorId ? { ...x, budgetFone: centsToFone(cents(x.budgetFone) + Math.round(value * 100)) } : x)),
  }));
  return {};
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export function markNotificationRead(id: string) {
  commit((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)) }));
}

export function markAllNotificationsRead() {
  const user = me();
  if (!user) return;
  commit((s) => ({ ...s, notifications: s.notifications.map((n) => (n.userId === user.id ? { ...n, isRead: true } : n)) }));
}

/* ------------------------------------------------------------------ */
/* Community chat (citizens only, like the real app)                   */
/* ------------------------------------------------------------------ */

export function sendChatMessage(text: string, replyToId: string | null): Result {
  const user = me();
  if (!user || user.role !== "citizen" || user.isBanned) return { error: "error_generic" };
  const message = text.trim();
  if (!message) return { error: "chat_error_empty" };
  if (message.length > 1000) return { error: "chat_error_long" };
  const entry: ChatMessage = { id: uid(), userId: user.id, message, replyToId, deleted: false, createdAt: now() };
  const ok = commit((s) => ({ ...s, chat: [...s.chat, entry] }));
  if (!ok) return { error: "storage" };

  // A fictional member sometimes answers, so the community feels alive in the demo.
  if (Math.random() < 0.7) {
    const bots = state.users.filter((u) => u.isBot && !u.isBanned && u.role === "citizen");
    const bot = bots[Math.floor(Math.random() * bots.length)];
    const replies = botReplies[user.language];
    if (bot) {
      setTimeout(() => {
        // Skip if the demo was reset (or the message deleted) in the meantime.
        if (!state.chat.some((m) => m.id === entry.id && !m.deleted)) return;
        const reply = replies[Math.floor(Math.random() * replies.length)];
        commit((s) => ({ ...s, chat: [...s.chat, { id: uid(), userId: bot.id, message: reply, replyToId: entry.id, deleted: false, createdAt: now() }] }));
      }, 1500 + Math.random() * 2000);
    }
  }
  return {};
}

export function deleteChatMessage(id: string) {
  const user = me();
  if (!user) return;
  commit((s) => ({ ...s, chat: s.chat.map((m) => (m.id === id && m.userId === user.id ? { ...m, deleted: true, message: "" } : m)) }));
}

/* ------------------------------------------------------------------ */
/* Account & LGPD (mirrors src/lib/actions/account.ts)                  */
/* ------------------------------------------------------------------ */

/** LGPD art. 18: everything the demo keeps about the current user, as a JSON string. */
export function exportMyData(): string | null {
  const user = me();
  if (!user) return null;
  const mySubmissions = state.submissions.filter((x) => x.userId === user.id);
  const payload = {
    format: "ecoverify-data-export",
    version: 1,
    exportedAt: now(),
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      totalPoints: user.totalPoints,
      language: user.language,
      preferences: {
        fontSize: user.fontSize,
        theme: user.theme ?? "system",
        highContrast: user.highContrast,
        reducedMotion: user.reducedMotion,
        notificationsEnabled: user.notificationsEnabled,
      },
      adultDeclaredAt: user.adultDeclaredAt,
      wallet: { verifiedAddress: user.walletAddress, pending: user.pendingWallet },
      terms: { acceptedAt: user.termsAcceptedAt ?? null, version: TERMS_VERSION },
      createdAt: user.createdAt,
    },
    submissions: mySubmissions.map((x) => ({
      id: x.id,
      mission: state.missions.find((m) => m.id === x.missionId)?.title ?? x.missionId,
      status: x.status,
      report: x.report,
      photoHash: x.photoHash,
      latitude: x.latitude,
      longitude: x.longitude,
      rejectionReason: x.rejectionReason,
      rejectionCode: x.rejectionCode ?? null,
      decidedBy: x.decidedBy ?? null,
      automaticVerification: x.aiStatus
        ? { simulated: true, verdict: x.aiVerdict, confidence: x.aiConfidence, reasonCode: x.aiReasonCode, summary: x.aiSummary }
        : null,
      appealedAt: x.appealedAt ?? null,
      appealMessage: x.appealMessage ?? null,
      submittedAt: x.submittedAt,
      reviewedAt: x.reviewedAt,
    })),
    foneRewards: state.rewards.filter((r) => r.userId === user.id),
    notifications: state.notifications.filter((n) => n.userId === user.id),
    communityMessages: state.chat.filter((c) => c.userId === user.id && !c.deleted),
    missionRequests: (state.missionRequests ?? []).filter((r) => r.userId === user.id).map(({ city, uf, createdAt }) => ({ city, uf, createdAt })),
    benefitCodes: (state.redemptions ?? [])
      .filter((r) => r.userId === user.id)
      .map((r) => {
        const offer = (state.offers ?? []).find((o) => o.id === r.offerId);
        return { partner: offer?.partnerName ?? null, benefit: offer?.title ?? null, code: r.code, createdAt: r.createdAt, usedAt: r.usedAt };
      }),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Same rules as the server: blocks the last admin, removes personal data, pending proofs,
 * unpaid FONE and chat messages, and keeps an anonymous record of reviewed proofs and paid rewards.
 */
export function deleteMyAccount(confirmed: boolean): Result {
  const user = me();
  if (!user) return { error: "generic" };
  if (!confirmed) return { error: "confirm_required" };
  if (user.role === "admin" && !state.users.some((u) => u.id !== user.id && u.role === "admin" && !u.isBanned && !u.deletedAt)) {
    return { error: "last_admin" };
  }
  const lang = user.language;
  const ok = commit((s) => {
    const pendingIds = new Set(s.submissions.filter((x) => x.userId === user.id && x.status === "pending").map((x) => x.id));
    return {
      ...s,
      currentUserId: null,
      guestLanguage: lang,
      submissions: s.submissions
        .filter((x) => !pendingIds.has(x.id))
        .map((x) => (x.userId === user.id ? { ...x, photo: "", report: "", latitude: 0, longitude: 0, aiSummary: null, aiChecks: null, appealMessage: null } : x)),
      rewards: s.rewards.filter((r) => !(r.userId === user.id && r.status !== "paid")),
      notifications: s.notifications.filter((n) => n.userId !== user.id),
      missionRequests: (s.missionRequests ?? []).filter((r) => r.userId !== user.id),
      region: null,
      chat: s.chat.map((c) => (c.userId === user.id ? { ...c, message: "", deleted: true } : c)),
      users: s.users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              name: dt(lang, "deleted_account_name"),
              email: `deleted-${u.id}@deleted.invalid`,
              walletAddress: null,
              pendingWallet: null,
              adultDeclaredAt: null,
              totalPoints: 0,
              isBanned: true,
              banReason: null,
              isDemoProfile: false,
              deletedAt: now(),
            }
          : u,
      ),
    };
  });
  return ok ? {} : { error: "storage" };
}

/* ------------------------------------------------------------------ */
/* Organizations, plans and Pix (SaaS) — mirrors src/lib/actions/orgs.ts and billing.ts */
/* ------------------------------------------------------------------ */

/** Fake receiver: the demo never charges anyone. */
/** Receiving Pix key of the standalone app (not a real account: payments are confirmed in-app). */
export const DEMO_PIX = { key: "pagamentos@ecoverify.example", name: "EcoVerify", city: "Recife" };

type OrgResult = { error?: string; success?: boolean; slug?: string };

export function orgRole(s: State, orgId: string, userId: string): OrgRole | null {
  return (s.orgMembers ?? []).find((m) => m.orgId === orgId && m.userId === userId)?.role ?? null;
}

export function myOrgs(s: State, userId: string) {
  return (s.orgMembers ?? [])
    .filter((m) => m.userId === userId)
    .map((m) => ({ org: (s.orgs ?? []).find((o) => o.id === m.orgId)!, role: m.role, members: (s.orgMembers ?? []).filter((x) => x.orgId === m.orgId).length }))
    .filter((x) => x.org);
}

/** Ranking and impact of an organization, computed from approved submissions of its missions. */
export function orgStats(s: State, orgId: string) {
  const missionIds = new Set(s.missions.filter((m) => m.organizationId === orgId).map((m) => m.id));
  const approved = s.submissions.filter((x) => x.status === "approved" && missionIds.has(x.missionId));
  const pointsOf = (missionId: string) => s.missions.find((m) => m.id === missionId)?.pointsReward ?? 0;
  const ranking = (s.orgMembers ?? [])
    .filter((m) => m.orgId === orgId)
    .map((m) => {
      const mine = approved.filter((x) => x.userId === m.userId);
      return {
        userId: m.userId,
        memberId: m.id,
        name: userById(m.userId, s)?.name ?? "—",
        role: m.role,
        joinedAt: m.joinedAt,
        actions: mine.length,
        points: mine.reduce((sum, x) => sum + pointsOf(x.missionId), 0),
      };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const byCategory = new Map<string, number>();
  const byMonth = new Map<string, number>();
  for (const sub of approved) {
    const mission = s.missions.find((m) => m.id === sub.missionId);
    if (mission) byCategory.set(mission.category, (byCategory.get(mission.category) ?? 0) + 1);
    const month = (sub.reviewedAt ?? sub.submittedAt).slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
  }
  const dates = approved.map((x) => x.reviewedAt ?? x.submittedAt).sort();
  return {
    ranking,
    impact: {
      actions: approved.length,
      people: new Set(approved.map((x) => x.userId)).size,
      points: approved.reduce((sum, x) => sum + pointsOf(x.missionId), 0),
      byCategory: [...byCategory].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      byMonth: [...byMonth].map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month)),
      since: dates[0] ?? null,
    },
  };
}

function orgOf(s: State, orgId: string) {
  return (s.orgs ?? []).find((o) => o.id === orgId) ?? null;
}

function isOwner(orgId: string) {
  const user = me();
  return !!user && orgRole(state, orgId, user.id) === "owner";
}

export function createOrg(input: { name: string; type: string; city: string; plan: string; cycle: string }): OrgResult {
  const user = me();
  if (!user) return { error: "invalid" };
  const name = input.name.trim();
  if (name.length < 3 || name.length > 80 || !isOrgType(input.type)) return { error: "invalid" };
  const plan = isPlanId(input.plan) ? input.plan : "free";
  const cycle: BillingCycle = input.cycle === "yearly" ? "yearly" : "monthly";
  const trialUsed = (state.orgs ?? []).some((o) => o.ownerId === user.id && o.trialUsed);
  const sub = initialSubscription(trialUsed ? "free" : plan, cycle);
  let slug = slugify(name);
  const taken = new Set((state.orgs ?? []).map((o) => o.slug));
  for (let i = 2; taken.has(slug); i++) slug = `${slugify(name).slice(0, 44)}-${i}`;
  const org: DemoOrg = {
    id: uid(),
    name,
    slug,
    type: input.type,
    city: input.city.trim().slice(0, 80) || null,
    plan: sub.plan,
    billingCycle: sub.billingCycle,
    subscriptionStatus: sub.subscriptionStatus,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    trialUsed: sub.trialUsed,
    inviteCode: newInviteCode(),
    ownerId: user.id,
    createdAt: now(),
  };
  const ok = commit((s) => ({
    ...s,
    orgs: [org, ...(s.orgs ?? [])],
    orgMembers: [{ id: uid(), orgId: org.id, userId: user.id, role: "owner", joinedAt: now() }, ...(s.orgMembers ?? [])],
  }));
  return ok ? { success: true, slug } : { error: "invalid" };
}

export function joinOrg(rawCode: string): OrgResult {
  const user = me();
  if (!user) return { error: "invalid" };
  const code = normalizeInviteCode(rawCode);
  const org = (state.orgs ?? []).find((o) => o.inviteCode === code);
  if (!org) return { error: "invalid_code" };
  if (orgRole(state, org.id, user.id)) return { success: true, slug: org.slug };
  const members = (state.orgMembers ?? []).filter((m) => m.orgId === org.id).length;
  const limit = canAddMember(org, members, new Date(), orgEventAllowance(org.id));
  if (limit) return { error: limit };
  commit((s) => ({ ...s, orgMembers: [...(s.orgMembers ?? []), { id: uid(), orgId: org.id, userId: user.id, role: "member", joinedAt: now() }] }));
  return { success: true, slug: org.slug };
}

export function leaveOrg(orgId: string): OrgResult {
  const user = me();
  if (!user || orgRole(state, orgId, user.id) === "owner") return { error: "owner_cannot_leave" };
  commit((s) => ({ ...s, orgMembers: (s.orgMembers ?? []).filter((m) => !(m.orgId === orgId && m.userId === user.id)) }));
  return { success: true };
}

export function regenerateOrgInvite(orgId: string): OrgResult {
  if (!isOwner(orgId)) return { error: "forbidden" };
  commit((s) => ({ ...s, orgs: (s.orgs ?? []).map((o) => (o.id === orgId ? { ...o, inviteCode: newInviteCode() } : o)) }));
  return { success: true };
}

/** Extra member allowance from paid one-off events around now. */
export function orgEventAllowance(orgId: string, s: State = state): number {
  return eventMemberAllowance(s.missions.filter((m) => m.organizationId === orgId));
}

export function createOrgMission(
  orgId: string,
  input: { title: string; description: string; category: Category; points: number; scope: "local" | "anywhere"; startsAt?: string | null; endsAt?: string | null },
): OrgResult {
  const user = me();
  const org = orgOf(state, orgId);
  const role = user && orgRole(state, orgId, user.id);
  if (!org || !(role === "owner" || role === "manager")) return { error: "forbidden" };
  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 4 || description.length < 10 || !Number.isInteger(input.points) || input.points < 5 || input.points > 200) return { error: "invalid" };
  let window: { startsAt: Date; endsAt: Date } | null = null;
  if (input.startsAt !== undefined || input.endsAt !== undefined) {
    const parsed = parseEventWindow(input.startsAt, input.endsAt);
    if ("error" in parsed) return { error: parsed.error };
    window = parsed;
  }
  const active = state.missions.filter((m) => m.organizationId === orgId && m.isActive && eventPhase(m) !== "closed").length;
  const limit = canActivateMission(org, active);
  if (limit) return { error: limit };
  const mission: Mission = {
    id: uid(),
    title,
    description,
    category: input.category,
    pointsReward: input.points,
    foneReward: "0.00",
    latitude: -8.0476,
    longitude: -34.877,
    scope: "anywhere",
    city: org.city,
    isActive: true,
    createdAt: now(),
    organizationId: orgId,
    startsAt: window?.startsAt.toISOString() ?? null,
    endsAt: window?.endsAt.toISOString() ?? null,
  };
  commit((s) => ({ ...s, missions: [mission, ...s.missions] }));
  return { success: true };
}

export function toggleOrgMission(missionId: string): OrgResult {
  const mission = state.missions.find((m) => m.id === missionId);
  const user = me();
  const org = mission?.organizationId ? orgOf(state, mission.organizationId) : null;
  const role = org && user ? orgRole(state, org.id, user.id) : null;
  if (!mission || !org || !(role === "owner" || role === "manager")) return { error: "forbidden" };
  if (!mission.isActive) {
    const active = state.missions.filter((m) => m.organizationId === org.id && m.isActive && eventPhase(m) !== "closed").length;
    const limit = canActivateMission(org, active);
    if (limit) return { error: limit };
  }
  commit((s) => ({ ...s, missions: s.missions.map((m) => (m.id === missionId ? { ...m, isActive: !m.isActive } : m)) }));
  return { success: true };
}

/* Billing (Pix) */

export function createDemoInvoice(orgId: string, plan: PlanId, cycle: BillingCycle): OrgResult {
  if (!isOwner(orgId)) return { error: "forbidden" };
  const amountCents = PAID_PLANS.includes(plan) ? planPrice(plan, cycle) : null;
  if (!amountCents) return { error: "invalid" };
  const invoice: DemoInvoice = {
    id: uid(),
    orgId,
    plan,
    billingCycle: cycle,
    amountCents,
    status: "pending",
    reference: newInvoiceReference(),
    reportedAt: null,
    createdAt: now(),
    paidAt: null,
  };
  commit((s) => ({
    ...s,
    invoices: [invoice, ...(s.invoices ?? []).map((i) => (i.orgId === orgId && i.status === "pending" && i.kind !== "event" ? { ...i, status: "canceled" as const } : i))],
  }));
  return { success: true };
}

/** One-off event ("evento avulso"): Pix charge that unlocks one event (see createEventInvoiceAction). */
export function createDemoEventInvoice(missionId: string, pkg: EventPackage): OrgResult {
  const mission = state.missions.find((m) => m.id === missionId);
  if (!mission?.organizationId || !isEvent(mission) || mission.eventPaidAt || !isEventPackage(pkg)) return { error: "invalid" };
  if (!isOwner(mission.organizationId)) return { error: "forbidden" };
  const invoice: DemoInvoice = {
    id: uid(),
    orgId: mission.organizationId,
    kind: "event",
    missionId,
    eventPackage: pkg,
    plan: "free",
    billingCycle: "monthly",
    amountCents: EVENT_PACKAGES[pkg].cents,
    status: "pending",
    reference: newInvoiceReference(),
    reportedAt: null,
    createdAt: now(),
    paidAt: null,
  };
  commit((s) => ({
    ...s,
    invoices: [invoice, ...(s.invoices ?? []).map((i) => (i.missionId === missionId && i.status === "pending" ? { ...i, status: "canceled" as const } : i))],
  }));
  return { success: true };
}

export function reportDemoInvoice(invoiceId: string): OrgResult {
  const invoice = (state.invoices ?? []).find((i) => i.id === invoiceId && i.status === "pending");
  if (!invoice || !isOwner(invoice.orgId)) return { error: "invalid" };
  const org = orgOf(state, invoice.orgId)!;
  commit((s) => {
    const next: State = { ...s, invoices: (s.invoices ?? []).map((i) => (i.id === invoiceId ? { ...i, reportedAt: now() } : i)) };
    let notifications = next.notifications;
    for (const admin of s.users.filter((u) => u.role === "admin")) {
      notifications = notify({ ...next, notifications }, admin.id, (l) => ({
        title: l === "en" ? "💰 Pix payment reported" : l === "es" ? "💰 Pago por Pix informado" : "💰 Pagamento por Pix informado",
        message: `${org.name} · ref. ${invoice.reference}`,
      }));
    }
    return { ...next, notifications };
  });
  return { success: true };
}

export function cancelDemoInvoice(invoiceId: string): OrgResult {
  const invoice = (state.invoices ?? []).find((i) => i.id === invoiceId && i.status === "pending");
  if (!invoice || !isOwner(invoice.orgId)) return { error: "invalid" };
  commit((s) => ({ ...s, invoices: (s.invoices ?? []).map((i) => (i.id === invoiceId ? { ...i, status: "canceled" as const } : i)) }));
  return { success: true };
}

export function confirmDemoInvoice(invoiceId: string): OrgResult {
  if (!isAdmin(me())) return { error: "forbidden" };
  const invoice = (state.invoices ?? []).find((i) => i.id === invoiceId && i.status === "pending");
  const org = invoice && orgOf(state, invoice.orgId);
  if (!invoice || !org) return { error: "invalid" };
  if (invoice.kind === "event") {
    const event = state.missions.find((m) => m.id === invoice.missionId);
    if (!event) return { error: "invalid" };
    commit((s) => {
      const next: State = {
        ...s,
        invoices: (s.invoices ?? []).map((i) => (i.id === invoiceId ? { ...i, status: "paid" as const, paidAt: now() } : i)),
        missions: s.missions.map((m) => (m.id === event.id ? { ...m, eventPaidAt: now(), eventPackage: invoice.eventPackage ?? null } : m)),
      };
      const notifications = notify(next, org.ownerId, (l) => ({
        title: l === "en" ? "✅ Event payment confirmed" : l === "es" ? "✅ Pago del evento confirmado" : "✅ Pagamento do evento confirmado",
        message: event.title,
      }));
      return { ...next, notifications };
    });
    return { success: true };
  }
  const nowDate = new Date();
  const keeps = org.plan === invoice.plan && org.subscriptionStatus === "active" && org.currentPeriodEnd && new Date(org.currentPeriodEnd) > nowDate;
  const end = addPeriod(keeps ? new Date(org.currentPeriodEnd!) : nowDate, invoice.billingCycle);
  commit((s) => {
    const next: State = {
      ...s,
      invoices: (s.invoices ?? []).map((i) => (i.id === invoiceId ? { ...i, status: "paid" as const, paidAt: now() } : i)),
      orgs: (s.orgs ?? []).map((o) =>
        o.id === org.id ? { ...o, plan: invoice.plan, billingCycle: invoice.billingCycle, subscriptionStatus: "active" as const, currentPeriodEnd: end.toISOString(), trialUsed: true } : o,
      ),
    };
    const notifications = notify(next, org.ownerId, (l) => ({
      title: l === "en" ? "✅ Payment confirmed" : l === "es" ? "✅ Pago confirmado" : "✅ Pagamento confirmado",
      message: `${org.name} · ${end.toLocaleDateString(l === "pt" ? "pt-BR" : l)}`,
    }));
    return { ...next, notifications };
  });
  return { success: true };
}

export function grantDemoPlan(orgId: string, plan: string, months: number): OrgResult {
  if (!isAdmin(me()) || !isPlanId(plan)) return { error: "invalid" };
  const end = plan === "free" ? null : new Date(Date.now() + months * 30 * 86_400_000).toISOString();
  commit((s) => ({ ...s, orgs: (s.orgs ?? []).map((o) => (o.id === orgId ? { ...o, plan, subscriptionStatus: "active" as const, currentPeriodEnd: end } : o)) }));
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Recycling report and anonymous data (Admin → Reciclagem / Dados)    */
/* ------------------------------------------------------------------ */

/** Same rows as src/lib/impact-server.ts: approved proofs with the mission point (never the person's GPS). */
export function impactRows(s: State = state): ImpactRow[] {
  const byId = new Map(s.missions.map((m) => [m.id, m]));
  const rows: ImpactRow[] = [];
  for (const sub of s.submissions) {
    if (sub.status !== "approved") continue;
    const mission = byId.get(sub.missionId);
    if (!mission) continue;
    rows.push({
      submissionId: sub.id,
      userId: sub.userId,
      approvedAt: sub.reviewedAt ?? sub.submittedAt,
      category: mission.category,
      missionTitle: mission.title,
      scope: mission.scope ?? "local",
      city: mission.city ?? null,
      stateCode: mission.stateCode ?? null,
      latitude: mission.scope === "anywhere" ? null : mission.latitude,
      longitude: mission.scope === "anywhere" ? null : mission.longitude,
      material: sub.material ?? null,
      weightKg: sub.weightKg ?? null,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Benefits (local businesses) — same rules as src/lib/actions/benefits.ts */
/* ------------------------------------------------------------------ */

export function redeemOffer(offerId: string): { error?: RedeemError | "invalid"; code?: string } {
  const user = me();
  if (!user || user.isBanned) return { error: "invalid" };
  const offer = (state.offers ?? []).find((o) => o.id === offerId);
  if (!offer) return { error: "offer_unavailable" };
  const redemptions = state.redemptions ?? [];
  const existing = redemptions.find((r) => r.offerId === offerId && r.userId === user.id);
  const count = redemptions.filter((r) => r.offerId === offerId).length;
  const error = redeemError({ offer, user, alreadyRedeemed: !!existing, redeemedCount: count });
  if (error) return error === "already_redeemed" && existing ? { code: existing.code } : { error };
  let code = newRedemptionCode();
  while (redemptions.some((r) => r.code === code)) code = newRedemptionCode();
  const redemption: DemoRedemption = { id: uid(), offerId, userId: user.id, code, createdAt: now(), usedAt: null };
  if (!commit((s) => ({ ...s, redemptions: [redemption, ...(s.redemptions ?? [])] }))) return { error: "invalid" };
  return { code };
}

export function declareAdult(): Result {
  const user = me();
  if (!user) return { error: "error_generic" };
  if (!user.adultDeclaredAt) commit((s) => ({ ...s, users: s.users.map((u) => (u.id === user.id ? { ...u, adultDeclaredAt: now() } : u)) }));
  return {};
}

/** The shop's page (#/parceiro/<token>): no login, the link is the credential. */
export function validateOfferCode(token: string, rawCode: string): { error?: ValidateError | "invalid"; firstName?: string } {
  const offer = (state.offers ?? []).find((o) => o.partnerToken === token);
  if (!offer || !offer.isActive) return { error: "invalid" };
  const code = normalizeRedemptionCode(rawCode);
  const row = (state.redemptions ?? []).find((r) => r.code === code && r.offerId === offer.id) ?? null;
  const error = validateError(row, offer);
  if (error) return { error };
  const owner = userById(row!.userId);
  commit((s) => ({
    ...s,
    redemptions: (s.redemptions ?? []).map((r) => (r.id === row!.id ? { ...r, usedAt: now() } : r)),
    notifications: notify(s, row!.userId, (lang) => codeUsedNotification(lang, code, offer.partnerName, localizeOffer(offer, lang).title)),
  }));
  return { firstName: firstName(owner?.name ?? "") };
}

export function createOffer(input: OfferInput): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  const parsed = parseOfferInput(input);
  if ("error" in parsed) return { error: parsed.error };
  const { expiresAt, ...rest } = parsed.value;
  const offer: DemoOffer = { ...rest, id: uid(), expiresAt: expiresAt?.toISOString() ?? null, partnerToken: newPartnerToken(), isActive: true, createdAt: now() };
  commit((s) => ({ ...s, offers: [offer, ...(s.offers ?? [])] }));
  return {};
}

export function toggleOffer(offerId: string): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  commit((s) => ({ ...s, offers: (s.offers ?? []).map((o) => (o.id === offerId ? { ...o, isActive: !o.isActive } : o)) }));
  return {};
}

export function regenerateOfferToken(offerId: string): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  commit((s) => ({ ...s, offers: (s.offers ?? []).map((o) => (o.id === offerId ? { ...o, partnerToken: newPartnerToken() } : o)) }));
  return {};
}
