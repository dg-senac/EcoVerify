import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { offerRedemptions, partnerOffers, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { firstName, isPartnerToken, localizeOffer } from "@/lib/benefits";
import { pickPublicLang } from "@/lib/saas/public-lang";
import { validateRedemptionAction } from "@/lib/actions/benefits";
import { PartnerValidateView } from "@/components/benefits/partner-validate";

export const metadata: Metadata = { title: "Validate code · EcoVerify", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The shop's validation page: the secret link is the only credential (no account). */
export default async function PartnerPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  if (!isPartnerToken(token)) notFound();
  const [offer] = await db.select().from(partnerOffers).where(eq(partnerOffers.partnerToken, token)).limit(1);
  if (!offer) notFound();
  const lang = await pickPublicLang((await searchParams).lang, await getCurrentUser());
  const [[stats], recent] = await Promise.all([
    db
      .select({ generated: sql<number>`count(*)::int`, used: sql<number>`count(${offerRedemptions.usedAt})::int` })
      .from(offerRedemptions)
      .where(eq(offerRedemptions.offerId, offer.id)),
    db
      .select({ code: offerRedemptions.code, name: users.name, usedAt: offerRedemptions.usedAt })
      .from(offerRedemptions)
      .innerJoin(users, eq(users.id, offerRedemptions.userId))
      .where(and(eq(offerRedemptions.offerId, offer.id), isNotNull(offerRedemptions.usedAt)))
      .orderBy(desc(offerRedemptions.usedAt))
      .limit(10),
  ]);
  const validate = validateRedemptionAction.bind(null, token);
  return (
    <PartnerValidateView
      lang={lang}
      partnerName={offer.partnerName}
      offerTitle={localizeOffer(offer, lang).title}
      isActive={offer.isActive}
      generated={stats.generated}
      used={stats.used}
      recent={recent.map((r) => ({ code: r.code, firstName: firstName(r.name), usedAt: r.usedAt!.toISOString() }))}
      onValidate={validate}
    />
  );
}
