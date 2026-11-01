import { useState, type ChangeEvent } from "react";
import { tx, type Lang } from "@/lib/i18n";
import { AiUnavailableError } from "@/lib/ai/gemini-core";
import type { AiAnalysis } from "@/lib/ai/decision";
import { proofTypeOf } from "@/lib/proof";
import { compressPhoto, detectImageType, hashBytes, MAX_PHOTO_BYTES } from "../media";
import { drawExtraProofPhoto, type SampleKind } from "../demoAi";
import { analyzeWithMyKey, byokErrorText, useGeminiKey } from "../byok";
import { submitExtraProof, type Mission, type Submission } from "../store";
import { toast } from "./ui";

/** Upload of the extra photo asked by the automatic verification (paper with the code). */
export function ExtraProofUploader({ lang, sub, mission }: { lang: Lang; sub: Submission; mission: Mission }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const myKey = useGeminiKey();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const code = sub.extraProofCode ?? "";

  const errors: Record<string, string> = {
    photo_required: T("Escolha a foto.", "Choose the photo.", "Elige la foto."),
    duplicate_photo: T("Essa foto já foi usada. Tire uma foto nova com o código.", "This photo was already used. Take a new photo with the code.", "Esa foto ya se usó. Toma una foto nueva con el código."),
    extra_proof_not_open: T("O prazo da prova extra terminou.", "The extra proof deadline is over.", "El plazo de la prueba extra terminó."),
    invalid: T("Arquivo de imagem inválido.", "Invalid image file.", "Archivo de imagen no válido."),
    too_large: T("Foto muito grande.", "Photo too large.", "Foto demasiado grande."),
    storage: T("Sem espaço no aparelho para salvar a foto.", "No space on the device to save the photo.", "Sin espacio en el dispositivo para guardar la foto."),
  };
  const done = (result: { error?: string }) => {
    if (result.error) return setError(errors[result.error] ?? errors.invalid);
    toast(T("Prova extra enviada ✓", "Extra proof sent ✓", "Prueba extra enviada ✓"));
  };

  const useSample = async () => {
    setError(null);
    const kind: SampleKind = mission.category === "other" ? "cleanup" : mission.category;
    const dataUrl = drawExtraProofPhoto(kind, code);
    done(submitExtraProof({ submissionId: sub.id, photo: dataUrl, photoHash: await hashBytes(new TextEncoder().encode(dataUrl)), sample: true }));
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_PHOTO_BYTES) return setError(errors.too_large);
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!detectImageType(bytes)) return setError(errors.invalid);
      const [hash, dataUrl] = await Promise.all([hashBytes(bytes), compressPhoto(file)]);
      let realAi: { analysis: AiAnalysis; model: string } | { failed: true } | null = null;
      if (myKey) {
        const proofType = proofTypeOf(mission);
        try {
          // The original photo goes first, the extra photo with the code second.
          realAi = await analyzeWithMyKey({
            key: myKey,
            dataUrl,
            beforeDataUrl: sub.photo,
            mission: {
              title: mission.title,
              description: mission.description,
              category: mission.category,
              context: mission.context ?? null,
              aiChecklist: null,
              proofType,
              countItem: proofType === "count" ? (mission.countItem ?? null) : null,
              declaredCount: proofType === "count" ? (sub.itemCount ?? null) : null,
              challengeCode: code,
            },
            report: sub.report,
            lang,
          });
        } catch (err) {
          realAi = { failed: true };
          toast(byokErrorText(lang, err instanceof AiUnavailableError ? err.kind : "http"), "error");
        }
      }
      done(submitExtraProof({ submissionId: sub.id, photo: dataUrl, photoHash: hash, realAi }));
    } catch {
      setError(errors.invalid);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <label className="cursor-pointer rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700">
          📷 {busy ? T("Enviando…", "Sending…", "Enviando…") : T("Tirar a foto com o código", "Take the photo with the code", "Tomar la foto con el código")}
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={onFile} disabled={busy} data-testid="extra-file" />
        </label>
        <button
          type="button"
          onClick={useSample}
          disabled={busy}
          className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100"
          data-sample="extra"
        >
          🖼️ {T("Usar foto de exemplo com o código", "Use a sample photo with the code", "Usar foto de ejemplo con el código")}
        </button>
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
