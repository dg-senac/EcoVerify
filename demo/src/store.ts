import { useRef, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/i18n";
import type { Role } from "@/lib/nav";
import { dt, botReplies } from "./i18n";
import { createSeed, STATE_VERSION } from "./seed";
import { distanceMeters, fakeTxHash, fakeWalletAddress, MAX_DISTANCE_METERS, MAX_GPS_ACCURACY_METERS, uid } from "./media";

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
  walletAddress: string | null;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  /** Fictional community member (fills ranking and chat). */
  isBot?: boolean;
  /** Ready-made demo profile shown on the login screen. */
  isDemoProfile?: boolean;
  language: Lang;
  fontSize: FontSize;
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
  impact?: string | null;
  latitude: number;
  longitude: number;
  category: Category;
  pointsReward: number;
  foneReward: string;
  isActive: boolean;
  createdAt: string;
};

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
  status: SubmissionStatus;
  reviewedBy: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

export type Reward = {
  id: string;
  userId: string;
  submissionId: string;
  foneAmount: string;
  status: "pending" | "paid";
  txHash: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
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
export function useStore<T>(selector: (s: State) => T): T {
  const cache = useRef<{ snapshot: State; value: T } | null>(null);
  const getSnapshot = () => {
    if (cache.current?.snapshot === state) return cache.current.value;
    const value = selector(state);
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
  const fresh = createSeed();
  fresh.guestLanguage = state.users.find((u) => u.id === state.currentUserId)?.language ?? state.guestLanguage;
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
  const { title, message } = build(user.language);
  return [{ id: uid(), userId, title, message, isRead: false, createdAt: now() }, ...s.notifications];
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export function loginAs(userId: string): Result {
  const user = userById(userId);
  if (!user) return { error: "generic" };
  if (user.isBanned) return { error: "banned" };
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

export function register(name: string, email: string, password: string): Result {
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
    isBanned: false,
    banReason: null,
    createdAt: now(),
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

const WALLET_PATTERN = /^[A-Za-z0-9]{20,128}$/;

export function createDemoWallet(): Result {
  const user = me();
  if (!user) return { error: "generic" };
  commit((s) => ({ ...s, users: s.users.map((u) => (u.id === user.id ? { ...u, walletAddress: fakeWalletAddress() } : u)) }));
  return {};
}

export function importWallet(address: string): Result {
  const user = me();
  if (!user) return { error: "generic" };
  const clean = address.trim();
  if (!WALLET_PATTERN.test(clean)) return { error: "wallet_error_invalid" };
  if (state.users.some((u) => u.id !== user.id && u.walletAddress === clean)) return { error: "wallet_error_in_use" };
  commit((s) => ({ ...s, users: s.users.map((u) => (u.id === user.id ? { ...u, walletAddress: clean } : u)) }));
  return {};
}

export function updateSettings(patch: Partial<Pick<User, "language" | "fontSize" | "highContrast" | "reducedMotion" | "notificationsEnabled">>) {
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
};

/** Returns an i18n DictKey suffix (error_*) on failure. */
export function submitProof(input: NewSubmission): Result {
  const user = me();
  if (!user) return { error: "error_generic" };
  if (user.isBanned) return { error: "error_banned" };
  const mission = state.missions.find((m) => m.id === input.missionId && m.isActive);
  if (!mission) return { error: "error_generic" };
  if (!input.photo) return { error: "error_photo_required" };
  const report = input.report.trim();
  if (report.length < 50 || report.length > 1000) return { error: "error_report_length" };

  if (!(input.accuracy <= MAX_GPS_ACCURACY_METERS)) return { error: "error_location_inaccurate" };
  if (distanceMeters(input.latitude, input.longitude, mission.latitude, mission.longitude) > MAX_DISTANCE_METERS) {
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
    status: "pending",
    reviewedBy: null,
    rejectionReason: null,
    submittedAt: now(),
    reviewedAt: null,
  };
  const ok = commit((s) => ({ ...s, submissions: [submission, ...s.submissions] }));
  return ok ? {} : { error: "storage" };
}

/* ------------------------------------------------------------------ */
/* Moderation (atomic, reviewer can't review own submission)           */
/* ------------------------------------------------------------------ */

function canModerate(user: User | null): user is User {
  return !!user && (user.role === "moderator" || user.role === "admin") && !user.isBanned;
}

export function approveSubmission(submissionId: string): Result {
  const reviewer = me();
  if (!canModerate(reviewer)) return { error: "error_generic" };
  const sub = state.submissions.find((s) => s.id === submissionId);
  if (!sub || sub.status !== "pending") return { error: "error_generic" };
  if (sub.userId === reviewer.id) return { error: "own_submission_warning" };
  const mission = state.missions.find((m) => m.id === sub.missionId);
  if (!mission) return { error: "error_generic" };

  commit((s) => {
    const reviewedAt = now();
    const next: State = {
      ...s,
      submissions: s.submissions.map((x) => (x.id === sub.id ? { ...x, status: "approved", reviewedBy: reviewer.id, reviewedAt } : x)),
      users: s.users.map((u) => (u.id === sub.userId ? { ...u, totalPoints: u.totalPoints + mission.pointsReward } : u)),
      rewards: [
        { id: uid(), userId: sub.userId, submissionId: sub.id, foneAmount: mission.foneReward, status: "pending", txHash: null, createdAt: reviewedAt, paidAt: null },
        ...s.rewards,
      ],
    };
    return {
      ...next,
      notifications: notify(next, sub.userId, (l) => ({
        title: dt(l, "notif_approved_title"),
        message: dt(l, "notif_approved_msg", { mission: localizedTitle(mission, l), points: mission.pointsReward, fone: mission.foneReward }),
      })),
    };
  });
  return {};
}

export function rejectSubmission(submissionId: string, reason: string): Result {
  const reviewer = me();
  if (!canModerate(reviewer)) return { error: "error_generic" };
  const cleanReason = reason.trim();
  if (cleanReason.length < 5) return { error: "reason_too_short" };
  const sub = state.submissions.find((s) => s.id === submissionId);
  if (!sub || sub.status !== "pending") return { error: "error_generic" };
  if (sub.userId === reviewer.id) return { error: "own_submission_warning" };
  const mission = state.missions.find((m) => m.id === sub.missionId);

  commit((s) => {
    const next: State = {
      ...s,
      submissions: s.submissions.map((x) =>
        x.id === sub.id ? { ...x, status: "rejected", reviewedBy: reviewer.id, rejectionReason: cleanReason, reviewedAt: now() } : x,
      ),
    };
    return {
      ...next,
      notifications: notify(next, sub.userId, (l) => ({
        title: dt(l, "notif_rejected_title"),
        message: dt(l, "notif_rejected_msg", { mission: mission ? localizedTitle(mission, l) : "", reason: cleanReason }),
      })),
    };
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
  const mission: Mission = {
    ...input,
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
    users: s.users.map((u) => (u.id === userId ? { ...u, isBanned: banned, banReason: banned ? reason?.trim() || null : null } : u)),
  }));
  return {};
}

export function simulatePayout(rewardId: string): Result {
  if (!isAdmin(me())) return { error: "error_generic" };
  const reward = state.rewards.find((r) => r.id === rewardId);
  if (!reward || reward.status !== "pending") return { error: "error_generic" };
  const owner = userById(reward.userId);
  if (!owner?.walletAddress) return { error: "no_wallet_warning" };
  commit((s) => {
    const next: State = {
      ...s,
      rewards: s.rewards.map((r) => (r.id === rewardId ? { ...r, status: "paid", txHash: fakeTxHash(), paidAt: now() } : r)),
    };
    return {
      ...next,
      notifications: notify(next, reward.userId, (l) => ({
        title: dt(l, "notif_paid_title"),
        message: dt(l, "notif_paid_msg", { fone: reward.foneAmount }),
      })),
    };
  });
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
