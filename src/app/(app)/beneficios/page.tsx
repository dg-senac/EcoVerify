import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { Gift } from "lucide-react";
import { db } from "@/db";
import { offerRedemptions, partnerOffers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getRegion } from "@/lib/regional/cookie";
import { BENEFIT_TEXT, localizeOffer, offerExpired, offerInCity, offerVisible, sortOffers } from "@/lib/benefits";
import { inLang } from "@/lib/i18n";
import { declareAdultAction, redeemOfferAction } from "@/lib/actions/benefits";
import { BenefitsView } from "@/components/benefits/benefits-view";

export const metadata: Metadata = { title: "Perks · EcoVerify" };

/** Local business benefits: unlocked by points (not spent), one code per person per offer. */
export default async function BenefitsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/beneficios");
  const lang = user.language;
  const text = BENEFIT_TEXT[lang];
  const region = await getRegion();

  const [offers, mine] = await Promise.all([
    db
      .select({
        offer: partnerOffers,
        redeemedCount: sql<number>`(select count(*)::int from ${offerRedemptions} r where r.offer_id = ${partnerOffers.id})`,
      })
      .from(partnerOffers)
      .where(eq(partnerOffers.isActive, true)),
    db
      .select({ redemption: offerRedemptions, title: partnerOffers.title, titleEn: partnerOffers.titleEn, titleEs: partnerOffers.titleEs, partnerName: partnerOffers.partnerName })
      .from(offerRedemptions)
      .innerJoin(partnerOffers, eq(partnerOffers.id, offerRedemptions.offerId))
      .where(eq(offerRedemptions.userId, user.id))
      .orderBy(desc(offerRedemptions.createdAt)),
  ]);
  const local = offers.filter(({ offer }) => offerInCity(offer.city, region?.city) && !offerExpired(offer));
  const visible = sortOffers(
    local.filter(({ offer }) => offerVisible(offer, user)).map(({ offer, redeemedCount }) => ({ ...localizeOffer(offer, lang), redeemedCount })),
    user.totalPoints,
  );

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Gift className="h-8 w-8 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{text.title}</h1>
          <p className="text-sm text-slate-500">
            {text.subtitle}
            {region ? ` · ${region.city}` : ""}
          </p>
        </div>
      </div>
      <BenefitsView
        lang={lang}
        points={user.totalPoints}
        adultDeclared={!!user.adultDeclaredAt}
        hiddenAdultCount={user.adultDeclaredAt ? 0 : local.filter(({ offer }) => offer.adultsOnly).length}
        offers={visible.map((o) => ({
          id: o.id,
          partnerName: o.partnerName,
          title: o.title,
          description: o.description,
          kind: o.kind,
          city: o.city,
          address: o.address,
          minPoints: o.minPoints,
          adultsOnly: o.adultsOnly,
          maxRedemptions: o.maxRedemptions,
          expiresAt: o.expiresAt?.toISOString() ?? null,
          featured: o.featured,
          redeemedCount: o.redeemedCount,
        }))}
        codes={mine.map(({ redemption, title, titleEn, titleEs, partnerName }) => ({
          offerId: redemption.offerId,
          code: redemption.code,
          createdAt: redemption.createdAt.toISOString(),
          usedAt: redemption.usedAt?.toISOString() ?? null,
          title: inLang(lang, title, titleEn, titleEs),
          partnerName,
        }))}
        onRedeem={redeemOfferAction}
        onDeclareAdult={declareAdultAction}
      />
    </div>
  );
}
