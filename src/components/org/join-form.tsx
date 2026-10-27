"use client";

import { useActionState } from "react";
import type { Lang } from "@/lib/i18n";
import { joinOrganizationAction, type OrgActionState } from "@/lib/actions/orgs";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { orgField } from "@/components/org/create-org-form";

export function JoinOrgForm({ lang, code, compact = false }: { lang: Lang; code?: string; compact?: boolean }) {
  const text = ORG_TEXT[lang];
  const [state, action, pending] = useActionState<OrgActionState, FormData>(joinOrganizationAction, {});
  return (
    <form action={action} className={compact ? "flex flex-wrap gap-2" : "grid gap-3"} data-testid="join-org-form">
      {code ? (
        <input type="hidden" name="code" value={code} />
      ) : (
        <input
          name="code"
          required
          placeholder={text.joinCodePlaceholder}
          aria-label={text.joinCodeLabel}
          maxLength={12}
          className={`${orgField} ${compact ? "w-44 flex-none font-mono uppercase" : "font-mono uppercase"}`}
        />
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
      >
        {text.joinSubmit}
      </button>
      {state.error && <p className="w-full rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{text.errors[state.error] ?? text.errors.invalid}</p>}
    </form>
  );
}
