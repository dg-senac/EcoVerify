"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import symbolImg from "@/assets/brand/ecoverify/symbol.png";
import { assetUrl, FoneMark, FoneProtocolLogo } from "@/components/brand/fone";
import { t, type DictKey, type Lang } from "@/lib/i18n";
import { PAYMENTS_ENABLED } from "@/lib/features";

/**
 * Animated splash shown when the app opens (once per session), right after the native Android splash
 * (same gradient and logo, so it feels like one continuous animation). On the very first launch it
 * continues into a short "how it works" in 4 steps.
 *
 * Shared by the Next.js app and the offline demo (Vite/APK). Server-rendered markup fades out by CSS
 * alone, so the page is never stuck behind it, even without JavaScript.
 */

export const SPLASH_SEEN_KEY = "ev-splash-seen"; // sessionStorage
export const ONBOARDED_KEY = "ev-onboarded"; // localStorage
export const SPLASH_GRADIENT = "linear-gradient(135deg, #2cc35f 0%, #278c98 50%, #2456d0 100%)";

/** Inline <head> script for server-rendered pages: hides the splash before paint when already seen. */
export const SPLASH_HEAD_SCRIPT = `try{if(sessionStorage.getItem("${SPLASH_SEEN_KEY}")==="1")document.documentElement.classList.add("ev-splash-seen")}catch(e){}`;

// Long enough to read the name, the slogan and "Powered by Fone" (the slogan only finishes appearing
// after ~1.3 s), still skippable with a tap.
const INTRO_MS = 4000;
const EXIT_MS = 420;

type Start = { seen: boolean; onboarded: boolean };
const SERVER_START: Start = { seen: false, onboarded: true };
let clientStart: Start | null = null;

function flag(storage: "session" | "local", key: string) {
  try {
    return (storage === "session" ? window.sessionStorage : window.localStorage).getItem(key) === "1";
  } catch {
    return false;
  }
}

/** Read once per page load (before this splash marks itself as seen). */
function getClientStart(): Start {
  clientStart ??= { seen: flag("session", SPLASH_SEEN_KEY), onboarded: flag("local", ONBOARDED_KEY) };
  return clientStart;
}
const noSubscribe = () => () => {};

function remember(storage: "session" | "local", key: string) {
  try {
    (storage === "session" ? window.sessionStorage : window.localStorage).setItem(key, "1");
  } catch {
    // Private mode / storage full: the splash simply shows again next time.
  }
}

const STEPS: { emoji: string; title: DictKey; text: DictKey }[] = [
  { emoji: "🗺️", title: "splash_step1_title", text: "splash_step1_text" },
  { emoji: "📸", title: "splash_step2_title", text: "splash_step2_text" },
  { emoji: "✅", title: "splash_step3_title", text: "splash_step3_text" },
  { emoji: "🏆", title: "splash_step4_title", text: PAYMENTS_ENABLED ? "splash_step4_text" : "splash_step4_text_free" },
];

type Phase = "intro" | "steps" | "exit" | "done";

export function AppSplash({ lang, onboarding = true }: { lang: Lang; onboarding?: boolean }) {
  const start = useSyncExternalStore(noSubscribe, getClientStart, () => SERVER_START);
  const showSteps = onboarding && !start.onboarded;
  const [phase, setPhase] = useState<Phase>("intro");

  const finish = () => {
    remember("local", ONBOARDED_KEY);
    setPhase("exit");
  };

  // Timers only (no synchronous state changes in the effect).
  useEffect(() => {
    if (start.seen) return;
    remember("session", SPLASH_SEEN_KEY);
    if (phase === "intro") {
      const timer = window.setTimeout(() => setPhase(showSteps ? "steps" : "exit"), INTRO_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "exit") {
      const timer = window.setTimeout(() => setPhase("done"), EXIT_MS);
      return () => window.clearTimeout(timer);
    }
  }, [phase, showSteps, start.seen]);

  // Esc skips, like the "Skip" button.
  useEffect(() => {
    if (start.seen || phase === "done") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (start.seen || phase === "done") return null;

  // Tapping the intro jumps ahead (to the steps on first launch, otherwise into the app).
  const skipIntro = () => {
    if (phase === "intro") setPhase(showSteps ? "steps" : "exit");
  };

  // Server markup (no JS yet) and "no steps" visits fade out by CSS on their own.
  const autoExit = phase === "intro" && !showSteps;

  return (
    <div
      className={`ev-splash fixed inset-0 z-[200] overflow-hidden text-white ${autoExit ? "ev-splash-auto" : ""} ${phase === "exit" ? "ev-splash-out" : ""}`}
      style={{ background: SPLASH_GRADIENT }}
      role={phase === "steps" ? "dialog" : "presentation"}
      aria-modal={phase === "steps" ? true : undefined}
      aria-label={phase === "steps" ? t(lang, "splash_how_title") : "EcoVerify"}
      data-testid="app-splash"
    >
      <style>{SPLASH_CSS}</style>
      {/* Soft light blobs for depth */}
      <span aria-hidden className="ev-blob pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
      <span aria-hidden className="ev-blob ev-blob-2 pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-blue-300/25 blur-3xl" />

      {phase !== "steps" ? (
        <button
          type="button"
          onClick={skipIntro}
          className="relative flex h-full w-full cursor-default flex-col items-center justify-center px-8 text-center outline-none"
          aria-label="EcoVerify"
          tabIndex={-1}
        >
          <span className="relative grid place-items-center">
            <span aria-hidden className="ev-ring absolute h-44 w-44 rounded-full border-2 border-white/40" />
            <span aria-hidden className="ev-ring ev-ring-2 absolute h-44 w-44 rounded-full border border-white/25" />
            {/* eslint-disable-next-line @next/next/no-img-element -- shared with the Vite demo */}
            <img
              src={assetUrl(symbolImg)}
              alt=""
              width={112}
              height={118}
              className="ev-pop relative h-[118px] w-auto select-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.25)]"
              draggable={false}
            />
          </span>
          <span className="ev-rise mt-8 text-[2.6rem] font-extrabold leading-none tracking-tight" style={{ animationDelay: "450ms" }}>
            EcoVerify
          </span>
          <span className="ev-rise mt-3 max-w-xs text-sm font-medium text-white/85" style={{ animationDelay: "650ms" }}>
            {t(lang, "tagline")}
          </span>
          <span
            className="ev-rise absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] flex items-center justify-center gap-2 text-xs font-medium text-white/85"
            style={{ animationDelay: "900ms" }}
          >
            {t(lang, "powered_by_fone")}
            <FoneProtocolLogo height={22} variant="white" />
          </span>
        </button>
      ) : (
        <div className="relative mx-auto flex h-full w-full max-w-md flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="ev-fade flex items-center justify-between">
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- shared with the Vite demo */}
              <img src={assetUrl(symbolImg)} alt="" width={30} height={32} className="h-8 w-auto select-none" draggable={false} />
              <span className="text-lg font-extrabold tracking-tight">EcoVerify</span>
            </span>
            <button
              type="button"
              onClick={finish}
              className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
              data-testid="splash-skip"
            >
              {t(lang, "splash_skip")}
            </button>
          </div>

          <div className="flex flex-1 flex-col justify-center py-6">
            <h2 className="ev-rise text-3xl font-extrabold tracking-tight">{t(lang, "splash_how_title")}</h2>
            <ol className="relative mt-6 space-y-3">
              {/* Line joining the steps */}
              <span aria-hidden className="ev-line absolute bottom-6 left-[1.6rem] top-6 w-0.5 rounded-full bg-white/30" />
              {STEPS.map((step, index) => (
                <li
                  key={step.title}
                  className="ev-rise relative flex items-start gap-3.5 rounded-2xl border border-white/15 bg-white/12 p-3.5 shadow-lg shadow-black/5 backdrop-blur-md"
                  style={{ animationDelay: `${180 + index * 170}ms` }}
                  data-testid="splash-step"
                >
                  <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-sm font-extrabold text-teal-700 shadow">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span aria-hidden>{step.emoji}</span>
                      {t(lang, step.title)}
                      {index === STEPS.length - 1 && (
                        <span className="ml-0.5 grid h-5 w-5 place-items-center rounded-full bg-white">
                          <FoneMark size={13} />
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-white/85">{t(lang, step.text)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="ev-rise space-y-4" style={{ animationDelay: "900ms" }}>
            <button
              type="button"
              onClick={finish}
              autoFocus
              className="w-full rounded-2xl bg-white py-3.5 text-base font-extrabold text-teal-700 shadow-xl shadow-black/10 outline-none transition hover:bg-emerald-50 focus-visible:ring-4 focus-visible:ring-white/50 active:scale-[0.99]"
              data-testid="splash-start"
            >
              {t(lang, "splash_start")} →
            </button>
            <p className="flex items-center justify-center gap-2 text-xs font-medium text-white/80">
              {t(lang, "powered_by_fone")}
              <FoneProtocolLogo height={18} variant="white" />
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const SPLASH_CSS = `
.ev-splash-seen .ev-splash{display:none}
.ev-splash-auto{animation:ev-out ${EXIT_MS}ms ease ${INTRO_MS}ms forwards}
.ev-splash-out{animation:ev-out ${EXIT_MS}ms ease forwards}
.ev-pop{animation:ev-pop 850ms cubic-bezier(.2,1.5,.4,1) both}
.ev-rise{animation:ev-rise 600ms cubic-bezier(.2,.9,.3,1) both}
.ev-fade{animation:ev-fade 500ms ease both}
.ev-ring{animation:ev-ring 1800ms ease-out 350ms infinite both}
.ev-ring-2{animation-delay:1250ms}
.ev-line{transform-origin:top;animation:ev-line 900ms ease 250ms both}
.ev-blob{animation:ev-float 7s ease-in-out infinite alternate}
.ev-blob-2{animation-duration:9s;animation-direction:alternate-reverse}
@keyframes ev-pop{0%{opacity:0;transform:scale(.35) rotate(-14deg)}60%{opacity:1}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes ev-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes ev-fade{from{opacity:0}to{opacity:1}}
@keyframes ev-ring{0%{opacity:0;transform:scale(.6)}25%{opacity:1}100%{opacity:0;transform:scale(1.6)}}
@keyframes ev-line{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes ev-float{from{transform:translate(0,0)}to{transform:translate(30px,40px)}}
@keyframes ev-out{to{opacity:0;visibility:hidden}}
@media (prefers-reduced-motion: reduce){
  .ev-pop,.ev-rise,.ev-fade,.ev-line{animation:ev-fade 300ms ease both}
  .ev-ring,.ev-blob{animation:none}
}
.reduce-motion .ev-pop,.reduce-motion .ev-rise,.reduce-motion .ev-fade,.reduce-motion .ev-line{animation:ev-fade 300ms ease both}
.reduce-motion .ev-ring,.reduce-motion .ev-blob{animation:none}
`;
