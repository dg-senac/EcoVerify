"use client";

import { useActionState, useState } from "react";
import { submitExtraProofAction, type ExtraProofActionState } from "@/lib/actions/submissions";
import { tx, type Lang } from "@/lib/i18n";

const initialState: ExtraProofActionState = {};

/** Upload of the extra photo (paper with the code next to the place/items). Web only. */
export function ExtraProofForm({ lang, submissionId }: { lang: Lang; submissionId: string }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const [state, formAction, pending] = useActionState(submitExtraProofAction, initialState);
  const [chosen, setChosen] = useState(false);
  if (state.success) {
    return <p className="text-xs font-semibold text-emerald-700">✓ {T("Prova extra enviada.", "Extra proof sent.", "Prueba extra enviada.")}</p>;
  }
  const errors: Record<string, string> = {
    photo_required: T("Escolha a foto.", "Choose the photo.", "Elige la foto."),
    photo_too_large: T("Foto muito grande.", "Photo too large.", "Foto demasiado grande."),
    invalid_photo: T("Arquivo de imagem inválido.", "Invalid image file.", "Archivo de imagen no válido."),
    duplicate_photo: T("Essa foto já foi usada. Tire uma foto nova com o código.", "This photo was already used. Take a new photo with the code.", "Esa foto ya se usó. Toma una foto nueva con el código."),
    extra_proof_not_open: T("O prazo da prova extra terminou.", "The extra proof deadline is over.", "El plazo de la prueba extra terminó."),
  };
  return (
    <form action={formAction} className="grid gap-2">
      <input type="hidden" name="submissionId" value={submissionId} />
      <input
        type="file"
        name="photo"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={(e) => setChosen(Boolean(e.target.files?.length))}
        className="text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
        data-testid="extra-file"
      />
      <button type="submit" disabled={!chosen || pending} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">
        {pending ? T("Enviando…", "Sending…", "Enviando…") : T("Enviar prova extra", "Send extra proof", "Enviar prueba extra")}
      </button>
      {state.error && <p className="text-xs font-medium text-red-600">{errors[state.error] ?? errors.invalid_photo}</p>}
    </form>
  );
}
