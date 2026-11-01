import { tx, type Lang } from "@/lib/i18n";

/** Extra proof asked by the automatic verification, as seen by the moderator (web + APK). No hooks. */
export function ExtraProofNote({ lang, code, status, photoUrl }: { lang: Lang; code?: string | null; status?: string | null; photoUrl?: string | null }) {
  if (!code || !status) return null;
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const label =
    status === "ok"
      ? T("código conferido", "code checked", "código comprobado")
      : status === "failed"
        ? T("código não conferiu", "code did not match", "el código no coincide")
        : status === "expired"
          ? T("não enviada no prazo", "not sent in time", "no enviada a tiempo")
          : status === "sent"
            ? T("enviada, aguardando análise", "sent, waiting for analysis", "enviada, esperando análisis")
            : T("aguardando a pessoa", "waiting for the person", "esperando a la persona");
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900" data-testid="extra-proof-note">
      {photoUrl && (
        <a href={photoUrl} target="_blank" rel="noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
        </a>
      )}
      <p>
        <span className="font-bold">📸 {T("Prova extra", "Extra proof", "Prueba extra")}</span> · {T("código", "code", "código")}{" "}
        <span className="font-mono font-bold tracking-widest">{code}</span> · {label}
      </p>
    </div>
  );
}
