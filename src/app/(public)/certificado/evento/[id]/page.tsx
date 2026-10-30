import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { missions, submissions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { proofCode } from "@/lib/impact";
import { orgPlan } from "@/lib/saas/org-rules";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { eventUnlocked, isEvent } from "@/lib/saas/events";
import { orgById } from "@/lib/saas/orgs";
import { publicBaseUrl } from "@/lib/saas/base-url";
import { pickPublicLang } from "@/lib/saas/public-lang";
import { EventCertificateView } from "@/components/org/event-report";
import { PrintButton } from "@/components/org/print-button";
import { PublicShell } from "@/components/org/public-shell";

export const metadata: Metadata = { title: "Certificado de participação · EcoVerify", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Certificate of one person's verified action in an event. The (unguessable) link and its QR code are
 * the proof; it only exists while the event is unlocked (paid plan or "evento avulso").
 */
export default async function EventCertificatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { id } = await params;
  const lang = await pickPublicLang((await searchParams).lang, await getCurrentUser());
  const [row] = UUID.test(id)
    ? await db
        .select({ submission: submissions, mission: missions, name: users.name, deletedAt: users.deletedAt })
        .from(submissions)
        .innerJoin(missions, eq(missions.id, submissions.missionId))
        .innerJoin(users, eq(users.id, submissions.userId))
        .where(eq(submissions.id, id))
        .limit(1)
    : [];
  const org = row?.mission.organizationId && !row.deletedAt ? await orgById(row.mission.organizationId) : null;
  if (!row || !org || row.submission.status !== "approved" || !isEvent(row.mission) || !eventUnlocked(orgPlan(org), row.mission)) {
    return (
      <PublicShell lang={lang} path={`/certificado/evento/${id}`} wide={false}>
        <p className="rounded-2xl bg-white p-8 text-center text-slate-600 shadow-sm" data-testid="certificate-invalid">
          {ORG_TEXT[lang].certificateInvalid}
        </p>
      </PublicShell>
    );
  }
  const url = `${await publicBaseUrl()}/certificado/evento/${id}`;
  const qr = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  return (
    <EventCertificateView
      lang={lang}
      qrSvg={qr}
      data={{
        name: row.name,
        title: row.mission.title,
        orgName: org.name,
        startsAt: row.mission.startsAt!.toISOString(),
        endsAt: row.mission.endsAt!.toISOString(),
        code: proofCode(id),
        url,
      }}
      toolbar={<PrintButton label={ORG_TEXT[lang].reportPrint} />}
    />
  );
}
