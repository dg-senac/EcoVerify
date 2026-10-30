import { Gift } from "lucide-react";
import { BENEFIT_TEXT, firstName, offerExpired, offerInCity, offerVisible, sortOffers } from "@/lib/benefits";
import { BenefitsView } from "@/components/benefits/benefits-view";
import { PartnerValidateView } from "@/components/benefits/partner-validate";
import { declareAdult, redeemOffer, useLang, useStore, validateOfferCode, type User } from "../store";
import { PageHeader } from "../components/ui";

/** Benefícios (same component as the web app; the actions run on the local store). */
export function BenefitsScreen({ user }: { user: User }) {
  const lang = useLang();
  const text = BENEFIT_TEXT[lang];
  const offers = useStore((s) => s.offers ?? []);
  const redemptions = useStore((s) => s.redemptions ?? []);
  const city = useStore((s) => s.region?.city ?? null);

  const local = offers.filter((o) => o.isActive && offerInCity(o.city, city) && !offerExpired(o));
  const visible = sortOffers(
    local.filter((o) => offerVisible(o, user)).map((o) => ({ ...o, redeemedCount: redemptions.filter((r) => r.offerId === o.id).length })),
    user.totalPoints,
  );
  const mine = redemptions.filter((r) => r.userId === user.id);

  return (
    <>
      <PageHeader title={text.title} subtitle={city ? `${text.subtitle} · ${city}` : text.subtitle} icon={Gift} />
      <BenefitsView
        lang={lang}
        points={user.totalPoints}
        adultDeclared={!!user.adultDeclaredAt}
        hiddenAdultCount={user.adultDeclaredAt ? 0 : local.filter((o) => o.adultsOnly).length}
        offers={visible}
        codes={mine.map((r) => {
          const offer = offers.find((o) => o.id === r.offerId);
          return { offerId: r.offerId, code: r.code, createdAt: r.createdAt, usedAt: r.usedAt, title: offer?.title, partnerName: offer?.partnerName };
        })}
        onRedeem={async (offerId) => redeemOffer(offerId)}
        onDeclareAdult={async () => {
          const result = declareAdult();
          return result.error ? result : { success: true };
        }}
      />
    </>
  );
}

/** The shop's validation page (#/parceiro/<token>) — works without signing in, like /parceiro/<token>. */
export function PartnerScreen({ token }: { token: string }) {
  const lang = useLang();
  const offer = useStore((s) => (s.offers ?? []).find((o) => o.partnerToken === token) ?? null);
  const redemptions = useStore((s) => (s.redemptions ?? []).filter((r) => r.offerId === offer?.id));
  const users = useStore((s) => s.users);
  if (!offer) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-slate-500" data-testid="partner-missing">
        {BENEFIT_TEXT[lang].partnerBadLink}
      </div>
    );
  }
  const used = redemptions.filter((r) => r.usedAt).sort((a, b) => b.usedAt!.localeCompare(a.usedAt!));
  return (
    <PartnerValidateView
      lang={lang}
      partnerName={offer.partnerName}
      offerTitle={offer.title}
      isActive={offer.isActive}
      generated={redemptions.length}
      used={used.length}
      recent={used.slice(0, 10).map((r) => ({ code: r.code, firstName: firstName(users.find((u) => u.id === r.userId)?.name ?? ""), usedAt: r.usedAt! }))}
      onValidate={async (code) => validateOfferCode(token, code)}
    />
  );
}
