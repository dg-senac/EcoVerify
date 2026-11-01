import type { ReactNode } from "react";
import { Award, Camera, Recycle, Users } from "lucide-react";
import { categoryEmoji, categoryLabels, tx, type Lang } from "@/lib/i18n";
import { formatKg } from "@/lib/impact";
import { formatCo2 } from "@/lib/impact-factors";
import { EVENT_TEXT, formatEventWindow } from "@/lib/saas/events";
import { checkinText } from "@/lib/saas/checkin";
import { LogoHorizontal, LogoMark } from "@/components/logo";

export interface EventReportData {
  orgName: string;
  title: string;
  category: string;
  city: string | null;
  startsAt: string;
  endsAt: string;
  actions: number;
  recycledKg: number;
  /** ESTIMATE of kg CO₂e avoided by the recycling of the event (src/lib/impact-factors.ts). */
  co2Kg?: number;
  participants: { submissionId: string; name: string; points: number; at: string; checkedIn?: boolean }[];
  photos: string[];
  /** Presences confirmed with the organizer's rotating QR (src/lib/saas/checkin.ts). */
  checkins?: number;
}

/**
 * Printable report of one event (mutirão). Pure markup shared by the web page (/evento/[id]) and
 * the offline demo; `certificate` renders the per-person certificate link/button.
 */
export function EventReportView({
  lang,
  data,
  certificate,
  toolbar,
}: {
  lang: Lang;
  data: EventReportData;
  certificate?: (submissionId: string) => ReactNode;
  toolbar?: ReactNode;
}) {
  const text = EVENT_TEXT[lang];
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const stats = [
    { icon: <Users className="h-5 w-5" />, value: data.participants.length.toLocaleString(locale), label: text.participants },
    { icon: <span className="text-lg">{categoryEmoji[data.category] ?? "🌱"}</span>, value: data.actions.toLocaleString(locale), label: text.actions },
    ...(data.recycledKg > 0 ? [{ icon: <Recycle className="h-5 w-5" />, value: formatKg(data.recycledKg, lang), label: text.reportKg }] : []),
    ...(data.co2Kg && data.co2Kg > 0
      ? [{ icon: <span className="text-lg">🌎</span>, value: formatCo2(data.co2Kg, lang), label: tx(lang, "CO₂e evitado (estimativa*)", "CO₂e avoided (estimate*)", "CO₂e evitado (estimación*)") }]
      : []),
    { icon: <Camera className="h-5 w-5" />, value: data.photos.length.toLocaleString(locale), label: text.reportPhotos },
    ...(data.checkins ? [{ icon: <span className="text-lg">📍</span>, value: data.checkins.toLocaleString(locale), label: tx(lang, "Check-ins no local", "On-site check-ins", "Check-ins en el lugar") }] : []),
  ];
  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      {toolbar && <div className="mx-auto mb-4 flex max-w-4xl justify-end gap-2 px-4 print:hidden">{toolbar}</div>}
      <article className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none" data-testid="event-report">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <LogoHorizontal height={34} />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.25em] text-violet-600">🎪 {text.reportTitle}</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-900" data-testid="event-report-title">
              {data.title}
            </h1>
            <p className="text-lg font-semibold text-emerald-700">{data.orgName}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p className="font-semibold text-slate-700">{formatEventWindow(data, lang)}</p>
            <p>
              {categoryLabels[data.category]?.[lang] ?? data.category}
              {data.city ? ` · ${data.city}` : ""}
            </p>
          </div>
        </header>

        <div className={`mt-6 grid grid-cols-2 gap-3 ${stats.length > 4 ? "md:grid-cols-5" : "md:grid-cols-4"}`} data-testid="event-report-stats">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-gradient-to-br from-violet-50 to-emerald-50 p-4">
              <span className="text-violet-600">{s.icon}</span>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs font-medium text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
        {!!data.co2Kg && data.co2Kg > 0 && (
          <p className="mt-2 text-[11px] text-slate-400" data-testid="event-co2-note">
            *{" "}
            {tx(
              lang,
              "Estimativa: kg de cada material × fatores médios da EPA (WARM v16) e, para óleo, da diretiva europeia RED II. O peso é estimado pela contagem ou pesado no ponto parceiro. Não é crédito de carbono.",
              "Estimate: kg of each material × average factors from the US EPA (WARM v16) and, for oil, the EU RED II directive. The weight is estimated from the count or weighed at the partner point. Not a carbon credit.",
              "Estimación: kg de cada material × factores promedio de la EPA (WARM v16) y, para el aceite, de la directiva europea RED II. El peso se estima por el conteo o se pesa en el punto socio. No es crédito de carbono.",
            )}
          </p>
        )}

        <section className="mt-6 print:break-inside-avoid">
          <h2 className="font-bold text-slate-900">{text.reportPhotos}</h2>
          {data.photos.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{text.reportNoPhotos}</p>
          ) : (
            <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4" data-testid="event-report-photos">
              {data.photos.slice(0, 12).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="aspect-square w-full rounded-xl object-cover" loading="lazy" />
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 print:break-inside-avoid">
          <h2 className="font-bold text-slate-900">{text.reportPeople}</h2>
          <table className="mt-3 w-full text-sm" data-testid="event-report-people">
            <tbody>
              {data.participants.map((p, i) => (
                <tr key={p.submissionId} className="border-b border-slate-100 last:border-0">
                  <td className="w-8 py-2 font-bold text-slate-400">{i + 1}</td>
                  <td className="py-2 font-semibold text-slate-800">
                    {p.name}
                    {p.checkedIn && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700" title={checkinText(lang).title}>
                        📍 check-in
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-slate-500">{new Date(p.at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="py-2 text-right font-bold text-emerald-700">{p.points} pts</td>
                  {certificate && <td className="py-2 pl-3 text-right print:hidden">{certificate(p.submissionId)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-8 flex items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
          <span>{new Date().toLocaleDateString(locale)} · EcoVerify</span>
          <LogoMark size={28} />
        </footer>
      </article>
    </div>
  );
}

export interface EventCertificateData {
  name: string;
  title: string;
  orgName: string;
  startsAt: string;
  endsAt: string;
  code: string;
  url: string;
}

/** A4 landscape participation certificate of an event (QR code = verification link). */
export function EventCertificateView({ lang, data, qrSvg, toolbar }: { lang: Lang; data: EventCertificateData; qrSvg?: string; toolbar?: ReactNode }) {
  const text = EVENT_TEXT[lang];
  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      {toolbar && <div className="mx-auto mb-4 flex max-w-4xl justify-end gap-2 px-4 print:hidden">{toolbar}</div>}
      <article
        className="relative mx-auto aspect-[1.414/1] max-w-4xl overflow-hidden rounded-3xl bg-white p-10 shadow-xl print:max-w-none print:rounded-none print:shadow-none"
        data-testid="event-certificate"
      >
        <div className="pointer-events-none absolute inset-3 rounded-[1.4rem] border-4 border-double border-violet-200" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-100/70" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-emerald-100/60" />
        <div className="relative flex h-full flex-col items-center justify-between text-center">
          <LogoHorizontal height={36} />
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.3em] text-violet-700">
              <Award className="h-5 w-5" /> {text.certTitle}
            </p>
            <h1 className="mt-4 font-serif text-4xl font-bold text-slate-900 md:text-5xl" data-testid="event-certificate-name">
              {data.name}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{text.certBody(data.name, data.title, data.orgName)}</p>
            <p className="mt-3 text-sm font-semibold text-slate-500">{formatEventWindow(data, lang)}</p>
          </div>
          <div className="flex w-full items-end justify-between gap-4 text-left">
            <div className="text-xs text-slate-500">
              <p className="font-semibold text-slate-700">{data.orgName}</p>
              <p>
                {text.certCode}: <span className="font-mono font-bold text-slate-700">{data.code}</span>
              </p>
            </div>
            <LogoMark size={44} />
            <div className="flex items-end gap-3">
              <p className="max-w-[11rem] break-all text-right font-mono text-[10px] text-slate-500">{data.url}</p>
              {qrSvg && <div className="h-20 w-20 shrink-0 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
