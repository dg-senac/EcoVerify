"use client";

import { useActionState } from "react";
import { updateAiSettingsAction, type AdminActionState } from "@/lib/actions/admin";
import type { AiSettingsValues } from "@/lib/ai/decision";

const initialState: AdminActionState = {};

export type AiStats = {
  analyzed: number;
  autoApproved: number;
  autoRejected: number;
  sentToHumans: number;
  failed: number;
  appeals: number;
  appealsOverturned: number;
};

const MODES = [
  { value: "auto", label: "Automático", hint: "Aprova e rejeita sozinha os casos claros; o resto vai para a moderação com sugestão." },
  { value: "suggest", label: "Só sugestão", hint: "Analisa todas as fotos, mas quem decide é sempre a moderação. Bom para testar." },
  { value: "off", label: "Desligada", hint: "Nada é enviado à IA. Tudo é decidido pela moderação, como antes." },
] as const;

const input =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function AiTab({
  settings,
  stats,
  model,
  hasKey,
}: {
  settings: AiSettingsValues;
  stats: AiStats;
  model: string;
  hasKey: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateAiSettingsAction, initialState);
  const cards = [
    { label: "Fotos analisadas", value: stats.analyzed },
    { label: "Aprovadas pela IA", value: stats.autoApproved },
    { label: "Rejeitadas pela IA", value: stats.autoRejected },
    { label: "Enviadas à moderação", value: stats.sentToHumans },
    { label: "IA indisponível", value: stats.failed },
    { label: "Contestações (revertidas)", value: `${stats.appeals} (${stats.appealsOverturned})` },
  ];

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl px-4 py-3 text-sm ${hasKey ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
        {hasKey ? (
          <>
            🤖 Modelo: <code className="font-semibold">{model}</code> (Google Gemini). Quando a cota gratuita do dia acaba, as fotos vão
            direto para a moderação e dá para reanalisar depois.
          </>
        ) : (
          <>
            🤖 Sem chave da IA: defina <code>GEMINI_API_KEY</code> (grátis em aistudio.google.com/apikey). Enquanto isso, só as regras locais
            (foto repetida/parecida) rodam e a moderação decide o resto.
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-black/5 bg-white p-4">
            <p className="text-2xl font-bold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      <form action={formAction} className="space-y-5 rounded-2xl border border-black/5 bg-white p-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-700">Modo da verificação automática</p>
          <div className="grid gap-2 md:grid-cols-3">
            {MODES.map((mode) => (
              <label
                key={mode.value}
                className="cursor-pointer rounded-xl border border-slate-200 p-3 text-sm has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50"
              >
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <input type="radio" name="mode" value={mode.value} defaultChecked={settings.mode === mode.value} className="accent-emerald-600" />
                  {mode.label}
                </span>
                <span className="mt-1 block text-xs text-slate-500">{mode.hint}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Confiança mínima para aprovar (%)</span>
            <input type="number" name="approveMinConfidence" min={50} max={100} step={1} defaultValue={settings.approveMinConfidence} className={input} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Confiança mínima para rejeitar (%)</span>
            <input type="number" name="rejectMinConfidence" min={50} max={100} step={1} defaultValue={settings.rejectMinConfidence} className={input} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Aprovar sozinha só até (FONE)</span>
            <input type="number" name="maxAutoApproveFone" min={0} step="0.01" defaultValue={settings.maxAutoApproveFone} className={input} />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Missões que pagam mais que o limite sempre passam por um moderador. Toda decisão automática pode ser contestada pelo usuário
          (LGPD, art. 20) e aparece em Moderação → Decisões automáticas recentes.
        </p>

        <div className="flex items-center gap-3">
          {state.success && <span className="text-sm font-medium text-emerald-600">✓ Configuração salva</span>}
          {state.error && <span className="text-sm font-medium text-red-600">Valores inválidos (confiança entre 50 e 100).</span>}
          <button
            type="submit"
            disabled={pending}
            className="ml-auto rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-70"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
