"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { MARKETING_TEXT } from "@/lib/marketing-text";
import { PLAN_ORDER, PLANS, formatBRL, type BillingCycle, type PlanId } from "@/lib/plans";

/** Plan cards with a monthly/yearly toggle. Plain data props: rendered by Next server pages and by the demo. */
export function PricingPlans({
  lang,
  hrefs,
}: {
  lang: Lang;
  /** Where each plan's button goes, per billing cycle. */
  hrefs: Record<PlanId, Record<BillingCycle, string>>;
}) {
  const text = MARKETING_TEXT[lang];
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div>
      <div className="mb-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5" role="group">
          {(["monthly", "yearly"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              aria-pressed={cycle === c}
              data-testid={`billing-${c}`}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                cycle === c ? "bg-emerald-500 text-white shadow" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {c === "monthly" ? text.monthly : text.yearly}
              {c === "yearly" && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${cycle === c ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                  {text.yearlyBadge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id, index) => {
          const plan = PLANS[id];
          const previous = index > 0 ? PLANS[PLAN_ORDER[index - 1]] : null;
          const newFeatures = previous ? plan.features.filter((f) => !previous.features.includes(f)) : plan.features;
          const price = cycle === "monthly" ? plan.monthlyCents : plan.yearlyCents;
          return (
            <div
              key={id}
              data-testid={`plan-${id}`}
              className={`relative flex flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-lg ${
                plan.highlight ? "ring-2 ring-emerald-500" : "ring-black/5"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 text-xs font-bold text-white shadow">
                  <Sparkles className="h-3.5 w-3.5" /> {text.popular}
                </span>
              )}
              <h3 className="text-lg font-extrabold text-slate-900">{text.planNames[id]}</h3>
              <p className="mt-1 min-h-10 text-sm text-slate-500">{text.planTaglines[id]}</p>
              <div className="mt-4 min-h-16">
                {price === null ? (
                  <>
                    <p className="text-2xl font-extrabold text-slate-900">{text.custom}</p>
                    <p className="text-xs text-slate-500">{text.customFrom}</p>
                  </>
                ) : price === 0 ? (
                  <p className="text-3xl font-extrabold text-slate-900">{text.free}</p>
                ) : (
                  <>
                    <p className="text-3xl font-extrabold text-slate-900" data-testid={`price-${id}`}>
                      {formatBRL(price, lang)}
                      <span className="text-base font-semibold text-slate-400">{cycle === "monthly" ? text.perMonth : text.perYear}</span>
                    </p>
                    {cycle === "yearly" && plan.monthlyCents !== null && (
                      <p className="text-xs text-slate-500">
                        ≈ {formatBRL(Math.round(price / 12), lang)}
                        {text.perMonth}
                      </p>
                    )}
                  </>
                )}
              </div>
              <ul className="mt-4 grid flex-1 content-start gap-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {text.members(plan.maxMembers)}
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {text.missions(plan.maxActiveMissions)}
                </li>
                {previous && <li className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{text.everythingIn(text.planNames[previous.id])}</li>}
                {newFeatures.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {text.featureNames[f]}
                  </li>
                ))}
              </ul>
              <a
                href={hrefs[id][cycle]}
                data-testid={`plan-cta-${id}`}
                className={`mt-6 inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  plan.highlight
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:shadow-lg"
                    : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                }`}
              >
                {text.planCta[id]}
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
