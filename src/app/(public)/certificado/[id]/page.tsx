import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { organizationMembers, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { orgPlan } from "@/lib/saas/org-rules";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { orgById, orgRanking } from "@/lib/saas/orgs";
import { publicBaseUrl } from "@/lib/saas/base-url";
import { LogoHorizontal, LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/org/print-button";
import { PublicShell } from "@/components/org/public-shell";
import { pickPublicLang } from "@/lib/saas/public-lang";

export const metadata: Metadata = { title: "Certificado · EcoVerify", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Participation certificate. The link (and its QR code) is the proof: anyone who has it can check
 * that the person really took part, with the numbers taken live from the database.
 */
export default async function CertificatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const lang = await pickPublicLang((await searchParams).lang, await getCurrentUser());
  const text = ORG_TEXT[lang];
  const [member] = UUID.test(id)
    ? await db
        .select({ id: organizationMembers.id, orgId: organizationMembers.organizationId, userId: organizationMembers.userId, joinedAt: organizationMembers.joinedAt, deletedAt: users.deletedAt })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(eq(organizationMembers.id, id))
        .limit(1)
    : [];
  const org = member && !member.deletedAt ? await orgById(member.orgId) : null;
  if (!member || !org || !hasFeature(orgPlan(org), "certificates")) {
    return (
      <PublicShell lang={lang} path={`/certificado/${id}`} wide={false}>
        <p className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm" data-testid="certificate-invalid">
          {text.certificateInvalid}
        </p>
      </PublicShell>
    );
  }
  const stats = (await orgRanking(org.id, 5000)).find((r) => r.memberId === member.id);
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const url = `${await publicBaseUrl()}/certificado/${member.id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-4xl justify-end px-4 print:hidden">
        <PrintButton label={text.reportPrint} />
      </div>
      <article
        className="relative mx-auto aspect-[1.414/1] max-w-4xl overflow-hidden rounded-3xl bg-white p-10 shadow-xl print:max-w-none print:rounded-none print:shadow-none"
        data-testid="certificate"
      >
        <div className="pointer-events-none absolute inset-3 rounded-[1.4rem] border-4 border-double border-emerald-200" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/70" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-teal-100/60" />
        <div className="relative flex h-full flex-col items-center justify-between text-center">
          <LogoHorizontal height={36} />
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-700">{text.certificateTitle}</p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-slate-900 md:text-5xl" data-testid="certificate-name">
              {stats?.name ?? "—"}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              {text.certificateBody(stats?.name ?? "", org.name, stats?.actions ?? 0, stats?.points ?? 0)}
            </p>
          </div>
          <div className="flex w-full items-end justify-between gap-4 text-left">
            <div className="text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{org.name}</p>
              <p>{text.certificateIssued(new Date().toLocaleDateString(locale))}</p>
            </div>
            <LogoMark size={44} />
            <div className="flex items-end gap-3">
              <div className="max-w-[11rem] text-right text-[10px] text-slate-500">
                <p>{text.certificateVerify}</p>
                <p className="break-all font-mono text-slate-600">{url}</p>
              </div>
              <div className="h-20 w-20 shrink-0 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
