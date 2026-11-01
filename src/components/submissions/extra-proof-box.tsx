import type { ReactNode } from "react";
import { tx, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { PendingStage } from "@/lib/verification";

/**
 * What the person sees while a proof is still being verified (src/lib/verification.ts).
 * "extra_proof": the code to write by hand, the deadline and the upload controls (children).
 * Shared by the web app and the APK. No hooks.
 */
export function ExtraProofBox({
  lang,
  stage,
  code,
  dueAt,
  children,
}: {
  lang: Lang;
  stage: PendingStage;
  code?: string | null;
  dueAt?: Date | string | null;
  children?: ReactNode;
}) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  if (stage === "extra_sent" || stage === "analyzing") {
    return (
      <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900" data-testid="verify-stage">
        🔎 {stage === "extra_sent"
          ? T("Prova extra recebida. A verificação automática está comparando as fotos.", "Extra proof received. The automatic verification is comparing the photos.", "Prueba extra recibida. La verificación automática está comparando las fotos.")
          : T("Em verificação automática. Pode levar algumas horas; você recebe uma notificação.", "Being verified automatically. It may take a few hours; you will get a notification.", "En verificación automática. Puede tardar algunas horas; recibirás una notificación.")}
      </p>
    );
  }
  if (stage !== "extra_proof" || !code) return null;
  return (
    <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950" data-testid="extra-proof">
      <p className="font-bold">📸 {T("Falta uma prova extra", "One extra proof needed", "Falta una prueba extra")}</p>
      <p className="mt-1 text-xs leading-relaxed">
        {T(
          "Para concluir a verificação, escreva este código num papel e tire uma foto do papel junto do local ou dos itens da missão:",
          "To finish the verification, write this code on a piece of paper and take a photo of the paper next to the place or the items of the mission:",
          "Para terminar la verificación, escribe este código en un papel y toma una foto del papel junto al lugar o los artículos de la misión:",
        )}
      </p>
      <p className="my-2 text-center font-mono text-3xl font-black tracking-[0.3em] text-violet-700" data-testid="extra-code">
        {code}
      </p>
      {dueAt && (
        <p className="text-[11px] text-violet-800">
          ⏰ {T("Envie até", "Send it by", "Envíala hasta")} {formatDate(typeof dueAt === "string" ? new Date(dueAt) : dueAt, lang)}.{" "}
          {T("Sem a prova extra, a comprovação é recusada (você pode enviar outra).", "Without it the proof is refused (you can send another one).", "Sin ella la comprobación se rechaza (puedes enviar otra).")}
        </p>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}
