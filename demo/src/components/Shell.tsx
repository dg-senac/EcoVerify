import { useState, type ReactNode } from "react";
import { FlaskConical, LogOut, Menu, X, Users } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { PoweredByFone } from "@/components/brand/fone";
import { navItemsFor } from "@/lib/nav";
import { t } from "@/lib/i18n";
import { Link, useRoute } from "../router";
import { dt } from "../i18n";
import { logout, moderatorsOn, useLang, useStore, type User } from "../store";
import { Avatar } from "./ui";
import { ProfileSwitcher } from "./ProfileSwitcher";

const MOBILE_PRIMARY = ["/missions", "/submissions", "/ranking", "/community", "/moderation"];

export function DemoBanner() {
  const lang = useLang();
  return (
    <div className="flex min-h-9 items-center justify-center gap-2 bg-amber-400 px-3 py-1.5 text-center text-xs font-semibold text-amber-950 pt-[max(0.375rem,env(safe-area-inset-top))]">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>{dt(lang, "demo_banner")}</span>
    </div>
  );
}

function roleLabel(user: User, lang: ReturnType<typeof useLang>) {
  return dt(lang, user.role === "admin" ? "demo_role_admin" : user.role === "moderator" ? "demo_role_moderator" : "demo_role_citizen");
}

export function Shell({ user, children }: { user: User; children: ReactNode }) {
  const lang = useLang();
  const path = useRoute();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const unread = useStore((s) => s.notifications.filter((n) => n.userId === user.id && !n.isRead).length);
  const pendingReview = useStore((s) => s.submissions.filter((x) => x.status === "pending" && x.userId !== user.id).length);

  const moderatorsEnabled = useStore((s) => moderatorsOn(s));
  const items = navItemsFor(user.role, moderatorsEnabled);
  const primaryMobile = items.filter((item) => MOBILE_PRIMARY.includes(item.href)).slice(0, 4);
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  const badge = (href: string) => {
    const count = href === "/notifications" ? unread : href === "/moderation" ? pendingReview : 0;
    return count > 0 ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{count}</span> : null;
  };

  const userCard = (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
      <Avatar name={user.name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{roleLabel(user, lang)}</p>
      </div>
    </div>
  );

  const actions = (
    <div className="mt-3 grid gap-2">
      <button
        type="button"
        onClick={() => {
          setDrawerOpen(false);
          setSwitcherOpen(true);
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-200"
      >
        <Users className="h-4 w-4" /> {dt(lang, "demo_switch_profile")}
      </button>
      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
      >
        <LogOut className="h-4 w-4" /> {t(lang, "nav_logout")}
      </button>
      <div className="mt-2 flex justify-center">
        <PoweredByFone lang={lang} height={14} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40">
        <DemoBanner />
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-black/5 bg-white/90 px-4 py-2.5 backdrop-blur md:hidden">
          <Link to="/missions" className="flex items-center gap-2">
            <LogoMark size={32} />
            <span className="text-lg font-extrabold text-slate-900">EcoVerify</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSwitcherOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900"
            >
              <Users className="h-4 w-4" /> {roleLabel(user, lang)}
            </button>
            <button
              type="button"
              aria-label="menu"
              onClick={() => setDrawerOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
            >
              <Menu className="h-6 w-6" />
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />}
            </button>
          </div>
        </header>
      </div>

      <div className="md:flex">
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-black/5 bg-white md:sticky md:top-9 md:flex md:h-[calc(100vh-2.25rem)] md:w-72 md:shrink-0 md:flex-col">
          <div className="flex items-center gap-3 px-6 py-6">
            <LogoMark size={40} />
            <span className="text-xl font-extrabold text-slate-900">EcoVerify</span>
            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{dt(lang, "demo_badge")}</span>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            {items.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive(item.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{t(lang, item.labelKey)}</span>
                {badge(item.href)}
              </Link>
            ))}
          </nav>
          <div className="border-t border-black/5 p-4">
            {userCard}
            {actions}
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-24 md:pb-0">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col overflow-y-auto bg-white p-5 pt-[max(1.25rem,env(safe-area-inset-top))] shadow-2xl animate-slide-up">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogoMark size={32} />
                <span className="font-extrabold text-slate-900">EcoVerify</span>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">{userCard}</div>
            <nav className="space-y-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive(item.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{t(lang, item.labelKey)}</span>
                  {badge(item.href)}
                </Link>
              ))}
            </nav>
            <div className="mt-4">{actions}</div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-black/5 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {primaryMobile.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${isActive(item.href) ? "text-emerald-600" : "text-slate-500"}`}
          >
            <item.icon className="h-6 w-6" />
            {item.href === "/moderation" && pendingReview > 0 && <span className="absolute right-[30%] top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />}
            <span className="max-w-full truncate px-1">{t(lang, item.labelKey)}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-slate-500"
        >
          <Menu className="h-6 w-6" />
          {unread > 0 && <span className="absolute right-[30%] top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />}
          <span>{dt(lang, "more")}</span>
        </button>
      </nav>

      {switcherOpen && <ProfileSwitcher onClose={() => setSwitcherOpen(false)} />}
    </div>
  );
}
