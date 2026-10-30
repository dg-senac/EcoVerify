"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, LocateFixed, RefreshCw } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { categoryLabels } from "@/lib/i18n";
import {
  createOrgMissionAction,
  leaveOrganizationAction,
  regenerateInviteAction,
  removeMemberAction,
  setMemberRoleAction,
  toggleOrgMissionAction,
  updateOrganizationAction,
  type OrgActionState,
} from "@/lib/actions/orgs";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { ORG_TYPES, type OrgType } from "@/lib/saas/org-rules";
import { orgField } from "@/components/org/create-org-form";
import { EventFields } from "@/components/org/event-fields";

function useOrgAction(lang: Lang) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<OrgActionState>) =>
    start(async () => {
      const result = await fn();
      setError(result.error ? (ORG_TEXT[lang].errors[result.error] ?? ORG_TEXT[lang].errors.invalid) : null);
    });
  return { pending, error, run };
}

export function InviteBox({ lang, orgId, code, url }: { lang: Lang; orgId: string; code: string; url: string }) {
  const text = ORG_TEXT[lang];
  const [copied, setCopied] = useState(false);
  const { pending, error, run } = useOrgAction(lang);
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5" data-testid="invite-box">
      <h3 className="font-bold text-slate-900">{text.inviteTitle}</h3>
      <p className="mt-1 text-sm text-slate-600">{text.inviteHint}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-xl bg-white px-3 py-2 font-mono text-lg font-bold tracking-widest text-emerald-800 ring-1 ring-emerald-200" data-testid="invite-code">
          {code}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard?.writeText(url).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-600"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? text.inviteCopied : text.inviteCopy}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => regenerateInviteAction(orgId))}
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" /> {text.inviteRegenerate}
        </button>
      </div>
      <p className="mt-2 break-all text-xs text-slate-500" data-testid="invite-url">{url}</p>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function MemberControls({
  lang,
  orgId,
  userId,
  role,
  viewerRole,
  canPromote,
}: {
  lang: Lang;
  orgId: string;
  userId: string;
  role: "owner" | "manager" | "member";
  viewerRole: "owner" | "manager" | "member";
  canPromote: boolean;
}) {
  const text = ORG_TEXT[lang];
  const { pending, error, run } = useOrgAction(lang);
  if (role === "owner") return null;
  const btn = "rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 transition disabled:opacity-50";
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {viewerRole === "owner" && (
        <button
          type="button"
          disabled={pending || (role === "member" && !canPromote)}
          title={role === "member" && !canPromote ? text.teamNeedsPlan : undefined}
          onClick={() => run(() => setMemberRoleAction(orgId, userId, role === "member" ? "manager" : "member"))}
          className={`${btn} bg-white text-slate-700 ring-slate-200 hover:bg-slate-50`}
        >
          {role === "member" ? text.makeManager : text.makeMember}
        </button>
      )}
      {(viewerRole === "owner" || role === "member") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => removeMemberAction(orgId, userId))}
          className={`${btn} bg-white text-red-600 ring-red-200 hover:bg-red-50`}
        >
          {text.remove}
        </button>
      )}
      {error && <p className="w-full text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function LeaveOrgButton({ lang, orgId }: { lang: Lang; orgId: string }) {
  const text = ORG_TEXT[lang];
  const { pending, error, run } = useOrgAction(lang);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(text.leaveConfirm)) run(() => leaveOrganizationAction(orgId));
        }}
        className="text-sm font-semibold text-red-600 hover:underline"
      >
        {text.leave}
      </button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function ToggleMissionButton({ lang, missionId, active }: { lang: Lang; missionId: string; active: boolean }) {
  const text = ORG_TEXT[lang];
  const { pending, error, run } = useOrgAction(lang);
  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => toggleOrgMissionAction(missionId))}
        className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition disabled:opacity-50 ${active ? "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50" : "bg-emerald-500 text-white ring-emerald-500 hover:bg-emerald-600"}`}
      >
        {active ? text.deactivate : text.activate}
      </button>
      {error && <p className="mt-1 max-w-xs text-xs text-red-700">{error}</p>}
    </div>
  );
}

const CATEGORIES = ["recycling", "cleanup", "planting", "donation", "other"] as const;

export function OrgMissionForm({ lang, orgId }: { lang: Lang; orgId: string }) {
  const text = ORG_TEXT[lang];
  const [state, action, pending] = useActionState<OrgActionState, FormData>(createOrgMissionAction, {});
  const [scope, setScope] = useState<"anywhere" | "local">("anywhere");
  const [coords, setCoords] = useState({ lat: "", lng: "" });
  return (
    <form action={action} className="grid gap-3" data-testid="org-mission-form" key={state.success ? "done" : "form"}>
      <input type="hidden" name="orgId" value={orgId} />
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        {text.missionTitle}
        <input name="title" required minLength={4} maxLength={120} className={orgField} />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        {text.missionDescription}
        <textarea name="description" required minLength={10} maxLength={1000} rows={3} className={orgField} />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          {text.missionCategory}
          <select name="category" className={orgField} defaultValue="recycling">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]?.[lang] ?? c}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          {text.missionPoints}
          <input name="points" type="number" min={5} max={200} defaultValue={30} required className={orgField} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          {text.missionScope}
          <select name="scope" value={scope} onChange={(e) => setScope(e.target.value === "local" ? "local" : "anywhere")} className={orgField}>
            <option value="anywhere">{text.scopeAnywhere}</option>
            <option value="local">{text.scopeLocal}</option>
          </select>
        </label>
      </div>
      {scope === "local" && (
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            {text.missionLat}
            <input name="latitude" value={coords.lat} onChange={(e) => setCoords({ ...coords, lat: e.target.value })} inputMode="decimal" required className={orgField} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            {text.missionLng}
            <input name="longitude" value={coords.lng} onChange={(e) => setCoords({ ...coords, lng: e.target.value })} inputMode="decimal" required className={orgField} />
          </label>
          <button
            type="button"
            onClick={() =>
              navigator.geolocation?.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }))
            }
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <LocateFixed className="h-4 w-4" /> {text.useMyLocation}
          </button>
        </div>
      )}
      <EventFields lang={lang} />
      <p className="text-xs text-slate-500">{text.pointsOnlyNote}</p>
      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{text.errors[state.error] ?? text.errors.invalid}</p>}
      {state.success && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{text.missionCreated}</p>}
      <button type="submit" disabled={pending} className="justify-self-start rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60">
        {text.missionCreate}
      </button>
    </form>
  );
}

export function OrgSettingsForm({
  lang,
  org,
  canBrand,
}: {
  lang: Lang;
  org: { id: string; name: string; type: OrgType; city: string | null; brandColor: string | null };
  canBrand: boolean;
}) {
  const text = ORG_TEXT[lang];
  const [state, action, pending] = useActionState<OrgActionState, FormData>(updateOrganizationAction, {});
  return (
    <form action={action} className="grid gap-3" data-testid="org-settings-form">
      <input type="hidden" name="orgId" value={org.id} />
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        {text.name}
        <input name="name" defaultValue={org.name} required minLength={3} maxLength={80} className={orgField} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          {text.type}
          <select name="type" defaultValue={org.type} className={orgField}>
            {ORG_TYPES.map((type) => (
              <option key={type} value={type}>
                {text.types[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          {text.city}
          <input name="city" defaultValue={org.city ?? ""} maxLength={80} className={orgField} />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        {text.brandColor}
        <div className="flex items-center gap-3">
          <input name="brandColor" type="color" defaultValue={org.brandColor ?? "#10b981"} disabled={!canBrand} className="h-10 w-16 cursor-pointer rounded-lg border border-slate-200 bg-white disabled:opacity-40" />
          {!canBrand && <span className="text-xs font-medium text-slate-500">{text.brandNeedsPlan}</span>}
        </div>
      </label>
      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{text.errors[state.error] ?? text.errors.invalid}</p>}
      {state.success && <p className="text-sm font-semibold text-emerald-700">{text.saved}</p>}
      <button type="submit" disabled={pending} className="justify-self-start rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60">
        {text.save}
      </button>
    </form>
  );
}
