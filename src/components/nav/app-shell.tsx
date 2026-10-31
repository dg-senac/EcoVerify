"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/logo";
import { homeFor, navItemsFor, mobileNav, type Role } from "@/lib/nav";
import { t, type Lang } from "@/lib/i18n";
import { initials } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth";
import { PoweredByFone } from "@/components/brand/fone";
import { LogOut, Menu, X } from "@/components/ui/icons";

type ShellUser = {
  name: string;
  email: string;
  role: Role;
};

export function AppShell({
  user,
  lang,
  unreadCount,
  moderatorsEnabled = false,
  children,
}: {
  user: ShellUser;
  lang: Lang;
  unreadCount: number;
  /** Moderators only see Moderation when the platform turned the role on (lib/staff-config.ts). */
  moderatorsEnabled?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = navItemsFor(user.role, moderatorsEnabled);
  const { primary: primaryMobile, more: moreItems } = mobileNav(items);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 border-r border-black/5 bg-white">
        <div className="flex items-center gap-3 px-6 py-6">
          <LogoMark size={40} />
          <span className="text-xl font-extrabold text-slate-900">EcoVerify</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{t(lang, item.labelKey)}</span>
              {item.href === "/notifications" && unreadCount > 0 && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-black/5 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <LogOut className="h-4 w-4" /> {t(lang, "nav_logout")}
            </button>
          </form>
          <div className="mt-4 flex justify-center">
            <PoweredByFone lang={lang} height={14} />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <Link href={homeFor(user.role, moderatorsEnabled)} className="flex items-center gap-2">
          <LogoMark size={32} />
          <span className="text-lg font-extrabold text-slate-900">EcoVerify</span>
        </Link>
        <button
          type="button"
          aria-label="menu"
          onClick={() => setDrawerOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 hover:bg-slate-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-white p-5 shadow-2xl animate-slide-up">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogoMark size={32} />
                <span className="font-extrabold text-slate-900">EcoVerify</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                {initials(user.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <nav className="space-y-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive(item.href) ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{t(lang, item.labelKey)}</span>
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
            <form action={logoutAction} className="mt-4">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <LogOut className="h-4 w-4" /> {t(lang, "nav_logout")}
              </button>
            </form>
            <div className="mt-4 flex justify-center">
              <PoweredByFone lang={lang} height={14} />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-72 pb-24 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-black/5 bg-white/95 backdrop-blur md:hidden">
        {primaryMobile.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
              isActive(item.href) ? "text-emerald-600" : "text-slate-500"
            }`}
          >
            <item.icon className="h-6 w-6" />
            {item.href === "/notifications" && unreadCount > 0 && (
              <span className="absolute right-5 top-1 h-2 w-2 rounded-full bg-red-500" />
            )}
            <span>{t(lang, item.labelKey)}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-slate-500"
        >
          <Menu className="h-6 w-6" />
          <span>{moreItems.length > 0 ? t(lang, "nav_more") : ""}</span>
        </button>
      </nav>
    </div>
  );
}
