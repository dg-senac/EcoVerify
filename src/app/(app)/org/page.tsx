import Link from "next/link";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { redirect } from "next/navigation";
import { citizenOnly } from "@/lib/role-guard";
import { Building2, Plus, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { myOrganizations } from "@/lib/saas/orgs";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { PLAN_TEXT } from "@/lib/saas/plan-text";
import { orgPlan } from "@/lib/saas/org-rules";
import { JoinOrgForm } from "@/components/org/join-form";

export default async function OrganizationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  citizenOnly(user.role);
  const lang = user.language;
  const text = ORG_TEXT[lang];
  const mk = PLAN_TEXT[lang];
  const orgs = await myOrganizations(user.id);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{text.myOrgs}</h1>
          <p className="mt-1 text-sm text-slate-500">{text.myOrgsSubtitle}</p>
        </div>
        <Link
          href="/org/nova"
          data-testid="org-create-link"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg"
        >
          <Plus className="h-4 w-4" /> {text.create}
        </Link>
      </div>

      {orgs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <Building2 className="mx-auto h-14 w-14 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-500">{text.noOrgs}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="org-list">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/org/${org.slug}`}
              className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-extrabold text-white"
                  style={{ background: org.brandColor ?? "linear-gradient(135deg,#10b981,#0d9488)" }}
                >
                  {org.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900 group-hover:text-emerald-700">{org.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {text.types[org.type]}
                    {org.city ? ` · ${org.city}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                {PAYMENTS_ENABLED && <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">{mk.planNames[orgPlan(org)]}</span>}
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">{text.roles[org.role]}</span>
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <Users className="h-3.5 w-3.5" /> {org.members}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">{text.joinTitle}</h2>
        <p className="mb-3 mt-1 text-sm text-slate-500">{text.joinCodeLabel}</p>
        <JoinOrgForm lang={lang} compact />
      </div>
    </div>
  );
}
