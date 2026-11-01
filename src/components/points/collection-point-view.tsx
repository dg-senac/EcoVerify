"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock, Scale, XCircle } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { formatKg, MATERIAL_EMOJI, MATERIAL_LABELS, MATERIALS, type Material } from "@/lib/impact";
import { formatDeliveryCode, normalizeDeliveryCode, parseDeliveryQr, pointText, type DeliveryError } from "@/lib/partner";
import { LogoHorizontal } from "@/components/logo";
import { QrScanButton } from "@/components/qr/qr-scan-button";

export type DeliveryLookupResult = { error?: DeliveryError; firstName?: string; missionTitle?: string; code?: string };
export type DeliveryConfirmResult = { error?: DeliveryError; firstName?: string; kg?: number };

/**
 * The collection point's page (/ponto/<token>): no account, only the secret link. The team reads the
 * person's QR (or types the code), sees the first name and the mission, weighs and confirms.
 * Shared by the web app and the APK: the caller does the work in onLookup / onConfirm.
 */
export function CollectionPointView({
  lang,
  pointName,
  address,
  isActive,
  confirmed,
  totalKg,
  recent,
  onLookup,
  onConfirm,
}: {
  lang: Lang;
  pointName: string;
  address: string | null;
  isActive: boolean;
  confirmed: number;
  totalKg: number;
  recent: { code: string; firstName: string; kg: number; material: Material | null; at: string }[];
  onLookup: (code: string) => Promise<DeliveryLookupResult>;
  onConfirm: (code: string, material: Material, kg: string) => Promise<DeliveryConfirmResult>;
}) {
  const text = pointText(lang);
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [code, setCode] = useState("");
  const [found, setFound] = useState<{ code: string; firstName: string; missionTitle: string } | null>(null);
  const [material, setMaterial] = useState<Material | "">("");
  const [kg, setKg] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const lookup = (raw: string) => {
    const clean = parseDeliveryQr(raw);
    setResult(null);
    if (!clean) return setResult({ ok: false, message: text.errors.invalid });
    setCode(clean);
    start(async () => {
      const r = await onLookup(clean);
      if (r.error) setResult({ ok: false, message: text.errors[r.error] ?? text.errors.invalid });
      else setFound({ code: clean, firstName: r.firstName ?? "", missionTitle: r.missionTitle ?? "" });
    });
  };
  const reset = () => {
    setFound(null);
    setCode("");
    setMaterial("");
    setKg("");
  };
  const confirm = () => {
    if (!found || !material) return;
    start(async () => {
      const r = await onConfirm(found.code, material, kg);
      if (r.error) return setResult({ ok: false, message: text.errors[r.error] ?? text.errors.invalid });
      setResult({ ok: true, message: text.ok(r.firstName ?? found.firstName, formatKg(r.kg ?? 0, lang)) });
      reset();
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-slate-100 px-4 py-8" data-testid="point-page">
      <div className="mx-auto grid max-w-md gap-5">
        <div className="flex justify-center">
          <LogoHorizontal height={32} />
        </div>
        <section className="rounded-3xl bg-white p-6 shadow-xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            <Scale className="h-4 w-4" /> {pointName}
          </p>
          <h1 className="mt-1 text-xl font-extrabold text-slate-900">{text.pageTitle}</h1>
          {address && <p className="text-xs text-slate-500">{address}</p>}
          <p className="mt-1 text-sm font-semibold text-teal-700" data-testid="point-stats">
            {text.stats(confirmed, formatKg(totalKg, lang))}
          </p>

          {!isActive ? (
            <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{text.inactive}</p>
          ) : !found ? (
            <form
              className="mt-5 grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                lookup(code);
              }}
            >
              <p className="text-sm text-slate-600">{text.subtitle}</p>
              <QrScanButton label={text.scan} failedText={text.scanFailed} onResult={lookup} />
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                {text.codeLabel}
                <input
                  value={formatDeliveryCode(code)}
                  onChange={(e) => setCode(normalizeDeliveryCode(e.target.value))}
                  placeholder="ABC-234"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={7}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.2em] text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  data-testid="point-code"
                />
              </label>
              <button
                type="submit"
                disabled={pending || code.length < 6}
                className="rounded-xl bg-gradient-to-r from-teal-500 to-sky-600 px-5 py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
                data-testid="point-find"
              >
                {text.find}
              </button>
            </form>
          ) : (
            <div className="mt-5 grid gap-3" data-testid="point-delivery">
              <div className="rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-950">
                <p>
                  <b>{text.person}:</b> {found.firstName}
                </p>
                <p>
                  <b>{text.mission}:</b> {found.missionTitle}
                </p>
                <p className="font-mono text-xs text-teal-700">{formatDeliveryCode(found.code)}</p>
              </div>
              <fieldset className="grid gap-1">
                <legend className="mb-1 text-sm font-semibold text-slate-700">{text.material}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {MATERIALS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMaterial(m)}
                      aria-pressed={material === m}
                      className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${material === m ? "border-teal-500 bg-teal-50 text-teal-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                      data-material={m}
                    >
                      {MATERIAL_EMOJI[m]} {MATERIAL_LABELS[m][lang]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">
                {text.weight}
                <input
                  value={kg}
                  onChange={(e) => setKg(e.target.value.replace(/[^\d.,]/g, ""))}
                  inputMode="decimal"
                  placeholder="0,0"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center text-2xl font-bold text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  data-testid="point-kg"
                />
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={reset} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  {text.cancel}
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  disabled={pending || !material || !kg}
                  className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md disabled:opacity-50"
                  data-testid="point-confirm"
                >
                  ⚖️ {text.confirm}
                </button>
              </div>
            </div>
          )}
          {result && (
            <p
              className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
              data-testid={result.ok ? "point-ok" : "point-error"}
            >
              {result.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />} {result.message}
            </p>
          )}
        </section>

        {recent.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">{text.recent}</h2>
            <ul className="mt-2 divide-y divide-slate-100 text-sm" data-testid="point-recent">
              {recent.map((r) => (
                <li key={r.code} className="flex items-center justify-between gap-2 py-2">
                  <span className="font-semibold text-slate-800">{r.firstName}</span>
                  <span className="text-slate-600">
                    {r.material ? MATERIAL_EMOJI[r.material] : "♻️"} {formatKg(r.kg, lang)}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(r.at).toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <p className="flex items-start gap-2 px-2 text-xs text-slate-500">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {text.privacy}
        </p>
      </div>
    </div>
  );
}
