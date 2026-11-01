import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { collectionPoints, submissions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { firstName, isPartnerToken } from "@/lib/benefits";
import { pickPublicLang } from "@/lib/saas/public-lang";
import { confirmDeliveryAction, lookupDeliveryAction } from "@/lib/actions/points";
import { CollectionPointView } from "@/components/points/collection-point-view";
import { formatDeliveryCode } from "@/lib/partner";

export const metadata: Metadata = { title: "Check a delivery · EcoVerify", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The collection point's page: the secret link is the only credential (no account). */
export default async function CollectionPointPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  if (!isPartnerToken(token)) notFound();
  const [point] = await db.select().from(collectionPoints).where(eq(collectionPoints.token, token)).limit(1);
  if (!point) notFound();
  const lang = await pickPublicLang((await searchParams).lang, await getCurrentUser());
  const [[stats], recent] = await Promise.all([
    db
      .select({ confirmed: sql<number>`count(*)::int`, kg: sql<number>`coalesce(sum(${submissions.weightKg}), 0)::float` })
      .from(submissions)
      .where(and(eq(submissions.partnerPointId, point.id), isNotNull(submissions.partnerConfirmedAt))),
    db
      .select({ code: submissions.deliveryCode, name: users.name, kg: submissions.weightKg, material: submissions.material, at: submissions.partnerConfirmedAt })
      .from(submissions)
      .innerJoin(users, eq(users.id, submissions.userId))
      .where(and(eq(submissions.partnerPointId, point.id), isNotNull(submissions.partnerConfirmedAt)))
      .orderBy(desc(submissions.partnerConfirmedAt))
      .limit(10),
  ]);
  return (
    <CollectionPointView
      lang={lang}
      pointName={point.name}
      address={[point.address, point.city].filter(Boolean).join(" · ") || null}
      isActive={point.isActive}
      confirmed={stats.confirmed}
      totalKg={Number(stats.kg)}
      recent={recent.map((r) => ({ code: formatDeliveryCode(r.code ?? ""), firstName: firstName(r.name), kg: Number(r.kg ?? 0), material: r.material, at: r.at!.toISOString() }))}
      onLookup={lookupDeliveryAction.bind(null, token, lang)}
      onConfirm={confirmDeliveryAction.bind(null, token)}
    />
  );
}
