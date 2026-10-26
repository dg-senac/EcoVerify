"use client";

import { useActionState, useEffect, useRef } from "react";
import { createMissionAction, type AdminActionState } from "@/lib/actions/admin";
import { categoryEmoji, categoryLabels } from "@/lib/i18n";
import { Star, Utensils } from "@/components/ui/icons";
import { FoneAmount, FoneMark } from "@/components/brand/fone";

const initialState: AdminActionState = {};
const categories = Object.keys(categoryLabels);

export function MissionForm() {
  const [state, formAction, pending] = useActionState(createMissionAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">Nova missão</h3>
      <form ref={formRef} action={formAction} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Título (Português)</label>
          <input
            name="title"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Título (Inglês)</label>
          <input
            name="titleEn"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Título (Espanhol)</label>
          <input
            name="titleEs"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Descrição (Português)</label>
          <textarea
            name="description"
            required
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Descrição (Inglês)</label>
          <textarea
            name="descriptionEn"
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Descrição (Espanhol)</label>
          <textarea
            name="descriptionEs"
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Contexto da missão</label>
          <textarea name="context" required rows={2} placeholder="O que deve ser verificado no local?" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Por que esta missão importa?</label>
          <textarea name="impact" required rows={2} placeholder="Como esta ação ajuda a sociedade e o meio ambiente?" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Latitude do local</label>
          <input type="number" name="latitude" required step="any" min={-90} max={90} placeholder="-8.0476" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Longitude do local</label>
          <input type="number" name="longitude" required step="any" min={-180} max={180} placeholder="-34.8770" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
          <select
            name="category"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {categoryEmoji[cat]} {categoryLabels[cat].pt}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 flex items-center gap-1">
              <Star className="h-4 w-4" /> Pontos
            </label>
            <input
              type="number"
              name="pointsReward"
              min={1}
              required
              defaultValue={30}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 flex items-center gap-1">
              <FoneMark size={16} /> FONE
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              name="foneReward"
              required
              defaultValue={1}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
        <div className="sm:col-span-2 flex items-center justify-between gap-3">
          {state.error && <p className="text-xs font-medium text-red-500">Preencha todos os campos corretamente.</p>}
          {state.success && <p className="text-xs font-medium text-emerald-600">Missão criada com sucesso!</p>}
          <button
            type="submit"
            disabled={pending}
            className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-70"
          >
            {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
