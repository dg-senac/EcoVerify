import { CollectionPointView } from "@/components/points/collection-point-view";
import { firstName } from "@/lib/benefits";
import { formatDeliveryCode, pointText } from "@/lib/partner";
import { confirmDelivery, lookupDelivery, pointStats, useLang, useStore } from "../store";

/** The collection point's page (#/ponto/<token>): no login, the link is the credential. */
export function PointScreen({ token }: { token: string }) {
  const lang = useLang();
  const point = useStore((s) => (s.collectionPoints ?? []).find((p) => p.token === token) ?? null);
  const stats = useStore((s) => (point ? pointStats(s, point.id) : null));
  const users = useStore((s) => s.users);
  if (!point || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-slate-500" data-testid="point-missing">
        {pointText(lang).errors.invalid}
      </div>
    );
  }
  return (
    <CollectionPointView
      lang={lang}
      pointName={point.name}
      address={[point.address, point.city].filter(Boolean).join(" · ") || null}
      isActive={point.isActive}
      confirmed={stats.confirmed}
      totalKg={stats.totalKg}
      recent={stats.recent.map((x) => ({
        code: formatDeliveryCode(x.deliveryCode ?? ""),
        firstName: firstName(users.find((u) => u.id === x.userId)?.name ?? ""),
        kg: Number(x.weightKg ?? 0),
        material: x.material ?? null,
        at: x.partnerConfirmedAt!,
      }))}
      onLookup={async (code) => lookupDelivery(token, code, lang)}
      onConfirm={async (code, material, kg) => confirmDelivery(token, code, material, kg)}
    />
  );
}
