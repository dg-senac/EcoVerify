import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Camera,
  ChevronDown,
  Eye,
  GraduationCap,
  HandHeart,
  Landmark,
  Leaf,
  Lock,
  Menu,
  MapPin,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import heroImg from "@/assets/marketing/hero.webp";
import type { Lang } from "@/lib/i18n";
import { MARKETING_TEXT } from "@/lib/marketing-text";
import { CAMPAIGN_FEE_PERCENT, TRIAL_DAYS, type BillingCycle, type PlanId } from "@/lib/plans";
import { LogoHorizontal } from "@/components/logo";
import { FoneMark, PoweredByFone, assetUrl } from "@/components/brand/fone";
import { PricingPlans } from "@/components/marketing/pricing-plans";

export interface LandingLinks {
  login: string;
  start: string;
  demo: string;
  transparency: string;
  terms: string;
  privacy: string;
  contact: string;
  /** Set when someone is signed in: the nav shows "Open the app" instead of sign in. */
  app?: string;
}

export interface LandingStats {
  actions: number;
  people: number;
  cities: number;
  foneCents: number;
}

/**
 * Public landing page. Server-friendly (no state): shared by the web app (src/app/page.tsx) and the
 * offline demo (demo/src/screens/Landing.tsx). Interactive bits come in as slots or client components.
 */
export function Landing({
  lang,
  links,
  stats,
  planHrefs,
  langSwitcher,
  contactForm,
  topBanner,
}: {
  lang: Lang;
  links: LandingLinks;
  stats: LandingStats;
  planHrefs: Record<PlanId, Record<BillingCycle, string>>;
  langSwitcher: ReactNode;
  contactForm: ReactNode;
  topBanner?: ReactNode;
}) {
  const text = MARKETING_TEXT[lang];
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const n = (v: number) => v.toLocaleString(locale);
  const stepIcons = [MapPin, Camera, ShieldCheck, Trophy];
  const audienceIcons = { school: GraduationCap, business: Building2, government: Landmark, ngo: HandHeart };
  const trustIcons = [ShieldCheck, Eye, Lock, BadgeCheck];
  const navLinks = [
    { href: "#como-funciona", label: text.nav.how },
    { href: "#organizacoes", label: text.nav.orgs },
    { href: "#planos", label: text.nav.pricing },
    { href: links.transparency, label: text.nav.transparency },
  ];

  return (
    <div className="ev-landing min-h-screen bg-white text-slate-800" data-testid="landing">
      {topBanner}
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="#topo" aria-label="EcoVerify">
            <LogoHorizontal height={34} />
          </a>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 lg:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-emerald-700">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">{langSwitcher}</div>
            {links.app ? (
              <a href={links.app} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600" data-testid="nav-app">
                {text.nav.panel}
              </a>
            ) : (
              <>
                <a href={links.login} className="hidden rounded-xl px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:inline-flex" data-testid="nav-login">
                  {text.nav.login}
                </a>
                <a href={links.start} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600" data-testid="nav-start">
                  {text.nav.start}
                </a>
              </>
            )}
            <details className="relative lg:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </summary>
              <div className="absolute right-0 mt-2 grid w-60 gap-1 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5">
                {navLinks.map((l) => (
                  <a key={l.href} href={l.href} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    {l.label}
                  </a>
                ))}
                {!links.app && (
                  <a href={links.login} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    {text.nav.login}
                  </a>
                )}
                <div className="px-3 py-2 sm:hidden">{langSwitcher}</div>
              </div>
            </details>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="topo" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-emerald-200/50 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -right-32 top-20 h-[26rem] w-[26rem] rounded-full bg-teal-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-16">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
              <FoneMark size={14} /> {text.hero.badge}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
              {text.hero.title}{" "}
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">{text.hero.titleAccent}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">{text.hero.subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={links.start}
                data-testid="hero-start"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-xl"
              >
                {text.hero.ctaStart} <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href={links.demo}
                data-testid="hero-demo"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white px-6 py-3.5 text-base font-bold text-slate-800 shadow-sm ring-1 ring-black/10 transition hover:bg-slate-50"
              >
                <PlayCircle className="h-5 w-5 text-emerald-600" /> {text.hero.ctaDemo}
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">{text.hero.note}</p>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element -- shared with the Vite demo */}
              <img src={assetUrl(heroImg)} alt="" width={1200} height={655} className="aspect-[4/3] h-full w-full object-cover" />
            </div>
            <div className="absolute -left-3 top-6 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-xl ring-1 ring-black/5 sm:-left-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Sparkles className="h-4 w-4" />
              </span>
              {text.floating.verified}
            </div>
            <div className="absolute -right-2 top-1/2 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-xl ring-1 ring-black/5 sm:-right-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Trophy className="h-4 w-4" />
              </span>
              {text.floating.points}
            </div>
            <div className="absolute -bottom-4 left-8 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-xl ring-1 ring-black/5">
              <FoneMark size={22} /> {text.floating.fone}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-black/5 bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4" data-testid="landing-stats">
          {(stats.actions >= 10
            ? [
                { value: n(stats.actions), label: text.stats.actions },
                { value: n(stats.people), label: text.stats.people },
                { value: n(stats.cities), label: text.stats.cities },
                { value: n(Math.round(stats.foneCents / 100)), label: text.stats.fone },
              ]
            : text.facts
          ).map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <SectionTitle title={text.howTitle} subtitle={text.howSubtitle} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {text.steps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <div key={step.title} className="relative rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                <span className="absolute right-5 top-5 text-5xl font-extrabold text-slate-100">{i + 1}</span>
                <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="relative mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Organizations */}
      <section id="organizacoes" className="scroll-mt-20 bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionTitle title={text.orgsTitle} subtitle={text.orgsSubtitle} />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {text.audiences.map((a) => {
              const Icon = audienceIcons[a.id];
              return (
                <div key={a.id} className="flex flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{a.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{a.body}</p>
                  <ul className="mt-4 grid gap-2 text-sm text-slate-700">
                    {a.bullets.map((b) => (
                      <li key={b} className="flex gap-2">
                        <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust (always dark, in both themes) */}
      <section className="bg-[#06261d] text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-center text-3xl font-extrabold tracking-tight sm:text-4xl">{text.trustTitle}</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {text.trust.map((item, i) => {
              const Icon = trustIcons[i];
              return (
                <div key={item.title} className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/10">
                  <Icon className="h-7 w-7 text-[#34d399]" />
                  <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{item.body}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex justify-center">
            <PoweredByFone lang={lang} variant="white" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <SectionTitle title={text.pricingTitle} subtitle={text.pricingSubtitle} />
        <div className="mt-10">
          <PricingPlans lang={lang} hrefs={planHrefs} />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">{text.trialNote(TRIAL_DAYS)}</p>
        <p className="mt-1 text-center text-sm font-semibold text-emerald-700">{text.citizensFree}</p>

        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white shadow-lg md:flex-row md:items-center">
          <div className="max-w-2xl">
            <h3 className="flex items-center gap-2 text-2xl font-extrabold">
              <FoneMark size={26} /> {text.campaignTitle}
            </h3>
            <p className="mt-2 text-white/90">{text.campaignBody(CAMPAIGN_FEE_PERCENT)}</p>
          </div>
          <a href={links.contact} className="shrink-0 rounded-2xl bg-white px-6 py-3 font-bold text-emerald-700 shadow hover:bg-emerald-50" data-testid="campaign-cta">
            {text.campaignCta}
          </a>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">{text.faqTitle}</h2>
          <div className="mt-10 grid gap-3">
            {text.faq.map((item) => (
              <details key={item.q} className="group rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">
                  {item.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contato" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{text.contactTitle}</h2>
            <p className="mt-3 text-lg text-slate-600">{text.contactSubtitle}</p>
            <div className="mt-8 grid gap-3">
              {text.audiences.map((a) => {
                const Icon = audienceIcons[a.id];
                return (
                  <div key={a.id} className="flex items-center gap-3 text-slate-700">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-semibold">{a.title}</span>
                    <span className="text-sm text-slate-500">· {a.body}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-black/5 sm:p-8">{contactForm}</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <LogoHorizontal height={30} />
            <p className="mt-3 max-w-sm text-sm text-slate-500">{text.footerTagline}</p>
            <div className="mt-4">
              <PoweredByFone lang={lang} />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{text.footerProduct}</p>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600">
              <li><a href="#como-funciona" className="hover:text-emerald-700">{text.nav.how}</a></li>
              <li><a href="#planos" className="hover:text-emerald-700">{text.nav.pricing}</a></li>
              <li><a href={links.demo} className="hover:text-emerald-700">{text.nav.demo}</a></li>
              <li><a href={links.transparency} className="hover:text-emerald-700">{text.nav.transparency}</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{text.footerLegal}</p>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600">
              <li><a href={links.terms} className="hover:text-emerald-700">{lang === "en" ? "Terms of use" : lang === "es" ? "Términos de uso" : "Termos de uso"}</a></li>
              <li><a href={links.privacy} className="hover:text-emerald-700">{lang === "en" ? "Privacy policy" : lang === "es" ? "Política de privacidad" : "Política de privacidade"}</a></li>
              <li><a href={links.contact} className="hover:text-emerald-700">{text.contactTitle}</a></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-black/5 px-4 py-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} EcoVerify · {text.footerIndependent}
        </p>
      </footer>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      <p className="mt-3 text-lg text-slate-600">{subtitle}</p>
    </div>
  );
}
