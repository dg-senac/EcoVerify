import { useState } from "react";
import { Copy, Star, Wallet, CheckCircle2, Clock, Users, ShieldCheck } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import { centsToFone } from "@/lib/fone";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { formatDate, formatFone, levelForPoints } from "@/lib/utils";
import { dt, errorText } from "../i18n";
import { appealCard, cardsOf, moderatorsOn, payoutSettingsOf, useLang, useStore, userPayout, type User } from "../store";
import { isStaffExperience } from "@/lib/nav";
import { StaffWork } from "@/components/profile/staff-work";
import { CardsPanel } from "@/components/cards/cards-panel";
import { Avatar, PageHeader, card, toast } from "../components/ui";
import { roleTone, ProfileSwitcher } from "../components/ProfileSwitcher";
import { WalletForm } from "./Wallet";
import { ResetDemoButton } from "../components/ResetDemo";
import { FoneMark } from "@/components/brand/fone";

const FoneStatIcon = ({ className }: { className?: string }) => <FoneMark size={20} className={className} />;

export function ProfileScreen({ user }: { user: User }) {
  const myCards = useStore((s) => cardsOf(s, user.id));
  const lang = useLang();
  const [editingWallet, setEditingWallet] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const rewards = useStore((s) => s.rewards.filter((r) => r.userId === user.id));
  const approved = useStore((s) => s.submissions.filter((x) => x.userId === user.id && x.status === "approved").length);
  const level = levelForPoints(user.totalPoints, lang);
  const received = rewards.filter((r) => r.status === "paid").reduce((sum, r) => sum + Number(r.foneAmount), 0);
  const pending = rewards.filter((r) => r.status === "pending").reduce((sum, r) => sum + Number(r.foneAmount), 0);
  const split = useStore((s) => userPayout(s, user.id));
  const settings = useStore((s) => payoutSettingsOf(s));
  const roleKey = user.role === "admin" ? "demo_role_admin" : user.role === "moderator" ? "demo_role_moderator" : "demo_role_citizen";
  // Staff get their own profile: review work and permissions, no points, level or cards.
  const staff = useStore((s) => isStaffExperience(user.role, moderatorsOn(s)));
  const staffStats = useStore((s) => {
    const mine = s.submissions.filter((x) => x.reviewedBy === user.id);
    const weekAgo = Date.now() - 7 * 86_400_000;
    return {
      approved: mine.filter((x) => x.status === "approved").length,
      rejected: mine.filter((x) => x.status === "rejected").length,
      lastWeek: mine.filter((x) => x.reviewedAt && new Date(x.reviewedAt).getTime() >= weekAgo).length,
      cardsGiven: (s.cards ?? []).filter((c) => c.issuedBy === user.id).length,
    };
  });

  const stats = [
    { icon: Star, label: t(lang, "points"), value: String(user.totalPoints), tone: "bg-amber-50 text-amber-700" },
    { icon: CheckCircle2, label: dt(lang, "approved_actions"), value: String(approved), tone: "bg-emerald-50 text-emerald-700" },
    ...(PAYMENTS_ENABLED
      ? [
          { icon: FoneStatIcon, label: dt(lang, "fone_received"), value: formatFone(received), tone: "bg-teal-50 text-teal-700" },
          { icon: Clock, label: dt(lang, "fone_pending"), value: formatFone(pending), tone: "bg-sky-50 text-sky-700" },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title={t(lang, "profile_title")} />
      <div className={`${card} flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:text-left animate-slide-up`}>
        <Avatar name={user.name} size={72} tone={roleTone[user.role]} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-extrabold text-slate-900">{user.name}</h2>
          <p className="text-sm text-slate-500">{user.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{dt(lang, roleKey)}</span>
            {!staff && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {dt(lang, "level")}: {level.emoji} {level.name}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">{dt(lang, "member_since")} {formatDate(user.createdAt, lang)}</p>
        </div>
      </div>

      {staff && (user.role === "admin" || user.role === "moderator") && (
        <div className={`${card} mt-4 p-5 animate-slide-up`}>
          <StaffWork lang={lang} role={user.role} stats={staffStats} />
        </div>
      )}

      {!staff && (
      <div className={`mt-4 grid grid-cols-2 gap-3 ${stats.length > 2 ? "lg:grid-cols-4" : ""}`}>
        {stats.map((s) => (
          <div key={s.label} className={`${card} p-4 animate-slide-up`}>
            <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${s.tone}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{s.value}</p>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
      )}

      {PAYMENTS_ENABLED && !staff && pending > 0 && (
        <div className={`${card} mt-4 grid gap-2 p-4 text-sm animate-slide-up`} data-testid="profile-payouts">
          {split.payableCents > 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2" data-testid="profile-fone-ready">
              <div className="flex items-center justify-between gap-2">
                <b className="text-amber-800">{centsToFone(split.payableCents)} FONE</b>
                <span className="text-xs font-semibold text-amber-700">{t(lang, "wallet_payout_queued")}</span>
              </div>
              {split.belowMinimum && <p className="mt-1 text-[11px] text-amber-800">{tf(lang, "payout_below_min", { min: settings.minPayoutFone.toFixed(2) })}</p>}
            </div>
          )}
          {split.waitingCents > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-sky-50 px-3 py-2" data-testid="profile-fone-waiting">
              <b className="text-sky-800">{centsToFone(split.waitingCents)} FONE</b>
              <span className="text-xs font-semibold text-sky-700">
                {tf(lang, "payout_waiting", { date: split.nextReleaseAt ? formatDate(split.nextReleaseAt.toISOString(), lang) : "—" })}
              </span>
            </div>
          )}
          {split.heldCents > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2" data-testid="profile-fone-held">
              <b className="text-slate-700">{centsToFone(split.heldCents)} FONE</b>
              <span className="text-xs font-semibold text-slate-600">{t(lang, "payout_held")}</span>
            </div>
          )}
          <p className="px-1 text-[11px] text-slate-400">{tf(lang, "payout_rules_note", { days: settings.holdDays, min: settings.minPayoutFone.toFixed(2) })}</p>
        </div>
      )}

      {PAYMENTS_ENABLED && !staff && (
      <div className={`${card} mt-4 p-5 animate-slide-up`}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-bold text-slate-900"><Wallet className="h-5 w-5 text-emerald-600" /> {dt(lang, "wallet_label")}</h3>
          {user.walletAddress && !editingWallet && !user.pendingWallet && (
            <button type="button" onClick={() => setEditingWallet(true)} className="text-sm font-semibold text-emerald-700 hover:underline">{t(lang, "wallet_change")}</button>
          )}
        </div>
        {user.walletAddress && (
          <div className="mb-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><ShieldCheck className="h-4 w-4" /> {t(lang, "wallet_verified")}</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(user.walletAddress ?? "").catch(() => undefined);
                toast("✓");
              }}
              className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-left font-mono text-xs text-slate-700"
            >
              <span className="min-w-0 flex-1 break-all">{user.walletAddress}</span>
              <Copy className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
            <p className="mt-1.5 text-xs text-slate-500">{t(lang, "wallet_verified_hint")}</p>
          </div>
        )}
        {(!user.walletAddress || editingWallet || user.pendingWallet) && (
          <>
            {!user.walletAddress && !user.pendingWallet && <p className="mb-3 text-sm text-slate-500">{t(lang, "wallet_none")}</p>}
            {user.walletAddress && !user.pendingWallet && <p className="mb-3 text-xs text-slate-500">{t(lang, "wallet_change_hint")}</p>}
            <WalletForm onDone={() => setEditingWallet(false)} onCancel={user.walletAddress && !user.pendingWallet ? () => setEditingWallet(false) : undefined} />
          </>
        )}
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{dt(lang, "wallet_demo_note_verify")}</p>
      </div>
      )}

      {!staff && (
      <div className="mt-4">
        <CardsPanel lang={lang} cards={myCards} onAppeal={appealCard} errorText={(code) => errorText(lang, code)} />
      </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSwitcher(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-200"
        >
          <Users className="h-4 w-4" /> {dt(lang, "demo_switch_profile")}
        </button>
        <ResetDemoButton />
      </div>
      {switcher && <ProfileSwitcher onClose={() => setSwitcher(false)} />}
    </>
  );
}
