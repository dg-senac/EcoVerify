"use client";

import { useActionState, useState } from "react";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { Check } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { createOrganizationAction, type OrgActionState } from "@/lib/actions/orgs";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { PLAN_TEXT } from "@/lib/saas/plan-text";
import { ORG_TYPES } from "@/lib/saas/org-rules";
import { PLANS, TRIAL_DAYS, formatBRL, type BillingCycle, type PlanId } from "@/lib/plans";

export const orgField =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

const CHOICES: PlanId[] = ["free", "school", "business"];

export function CreateOrgForm({
  lang,
  defaultPlan,
  defaultCycle,
  trialAvailable,
}: {
  lang: Lang;
  defaultPlan: PlanId;
  defaultCycle: BillingCycle;
  trialAvailable: boolean;
}) {
  const text = ORG_TEXT[lang];
  const mk = PLAN_TEXT[lang];
  const [state, action, pending] = useActionState<OrgActionState, FormData>(createOrganizationAction, {});
  const [plan, setPlan] = useState<PlanId>(PAYMENTS_ENABLED && CHOICES.includes(defaultPlan) ? defaultPlan : "free");
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle);

  return (
    <form action={action} className="grid gap-4" data-testid="create-org-form">
      <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
        {text.name}
        <input name="name" required minLength={3} maxLength={80} className={orgField} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          {text.type}
          <select name="type" defaultValue={defaultPlan === "business" ? "business" : "school"} className={orgField}>
            {ORG_TYPES.map((type) => (
              <option key={type} value={type}>
                {text.types[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
          {text.city}
          <input name="city" maxLength={80} className={orgField} />
        </label>
      </div>

      {/* Plans and prices: hidden while payments are off (PAYMENTS_ENABLED); the org starts on "free" with every feature. */}
      {PAYMENTS_ENABLED ? (
        <>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-semibold text-slate-700">{text.plan}</legend>
        {CHOICES.map((id) => {
          const price = cycle === "monthly" ? PLANS[id].monthlyCents : PLANS[id].yearlyCents;
          return (
            <label
              key={id}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${plan === id ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
            >
              <input type="radio" name="plan" value={id} checked={plan === id} onChange={() => setPlan(id)} className="sr-only" />
              <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${plan === id ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                {plan === id && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-slate-900">{mk.planNames[id]}</span>
                <span className="block text-xs text-slate-500">
                  {mk.members(PLANS[id].maxMembers)} · {mk.missions(PLANS[id].maxActiveMissions)}
                </span>
              </span>
              <span className="text-sm font-extrabold text-slate-900">
                {price ? `${formatBRL(price, lang)}${cycle === "monthly" ? mk.perMonth : mk.perYear}` : mk.free}
              </span>
            </label>
          );
        })}
      </fieldset>

      {plan !== "free" && (
        <div className="grid gap-2">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-bold ${cycle === c ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500"}`}
              >
                {c === "monthly" ? mk.monthly : `${mk.yearly} · ${mk.yearlyBadge}`}
              </button>
            ))}
          </div>
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800" data-testid="trial-info">
            {trialAvailable ? text.trialInfo(TRIAL_DAYS) : text.trialUsedInfo}
          </p>
        </div>
      )}
        </>
      ) : (
        <input type="hidden" name="plan" value="free" />
      )}
      <input type="hidden" name="cycle" value={cycle} />

      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{text.errors[state.error] ?? text.errors.invalid}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 font-bold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
      >
        {text.createSubmit}
      </button>
    </form>
  );
}
