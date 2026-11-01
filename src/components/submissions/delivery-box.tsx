import type { Lang } from "@/lib/i18n";
import { formatKg } from "@/lib/impact";
import { deliveryQrPayload, formatDeliveryCode, pointText } from "@/lib/partner";
import { formatDate } from "@/lib/utils";
import { QrImage } from "@/components/qr/qr-image";

/**
 * Collection point missions: the QR + code the person shows at the counter (until the point weighs it),
 * then the checked weight. Shared by the web app and the APK.
 */
export function DeliveryBox({
  lang,
  code,
  pointName,
  pointAddress,
  confirmedKg,
  dueAt,
}: {
  lang: Lang;
  code: string;
  pointName: string;
  pointAddress?: string | null;
  /** Set once the point confirmed the delivery. */
  confirmedKg?: number | null;
  dueAt?: Date | string | null;
}) {
  const text = pointText(lang);
  if (confirmedKg != null) {
    return (
      <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900" data-testid="delivery-confirmed">
        ⚖️ {text.confirmedNotice(formatKg(confirmedKg, lang))} <span className="font-normal text-teal-700">({pointName})</span>
      </p>
    );
  }
  return (
    <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-950" data-testid="delivery-box">
      <p className="font-bold">⚖️ {text.boxTitle}</p>
      <p className="mt-1 text-xs leading-relaxed">{text.boxHint(pointName)}</p>
      {pointAddress && <p className="mt-0.5 text-[11px] text-teal-700">📍 {pointAddress}</p>}
      <div className="mt-3 flex flex-col items-center gap-2">
        <QrImage text={deliveryQrPayload(code)} size={168} label={text.codeLabel} />
        <p className="font-mono text-3xl font-black tracking-[0.25em] text-teal-800" data-testid="delivery-code">
          {formatDeliveryCode(code)}
        </p>
      </div>
      <p className="mt-2 text-[11px] text-teal-800">
        ⏰ {text.boxDeadline}
        {dueAt && <> ({formatDate(typeof dueAt === "string" ? new Date(dueAt) : dueAt, lang)})</>}
      </p>
    </div>
  );
}
