"use client";

import { useActionState, useState } from "react";
import { updateSettingsAction } from "@/lib/actions/settings";
import type { ActionState } from "@/lib/actions/auth";
import { LANGS, t, type Lang } from "@/lib/i18n";

const initialState: ActionState = {};

export function SettingsForm({
  language,
  fontSize,
  highContrast,
  reducedMotion,
  notificationsEnabled,
}: {
  language: Lang;
  fontSize: "small" | "medium" | "large";
  highContrast: boolean;
  reducedMotion: boolean;
  notificationsEnabled: boolean;
}) {
  const [lang, setLang] = useState<Lang>(language);
  const [saved, setSaved] = useState(false);
  const [, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await updateSettingsAction(prev, formData);
      if (!result?.error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
      }
      return result;
    },
    initialState,
  );

  const handleLanguageChange = (newLang: Lang) => {
    setLang(newLang);
  };

  return (
    <form action={formAction} className="space-y-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">{t(lang, "settings_language")}</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {LANGS.map((l) => (
            <label
              key={l.value}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                lang === l.value ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
              }`}
            >
              <input
                type="radio"
                name="language"
                value={l.value}
                defaultChecked={language === l.value}
                onChange={() => handleLanguageChange(l.value)}
                className="accent-emerald-600"
              />
              {l.flag} {l.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">{t(lang, "settings_font_size")}</label>
        <div className="grid grid-cols-3 gap-2">
          {(["small", "medium", "large"] as const).map((size) => (
            <label
              key={size}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-700"
            >
              <input type="radio" name="fontSize" value={size} defaultChecked={fontSize === size} className="accent-emerald-600" />
              {t(lang, size === "small" ? "font_small" : size === "medium" ? "font_medium" : "font_large")}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-5">
        <ToggleRow name="highContrast" label={t(lang, "settings_high_contrast")} defaultChecked={highContrast} />
        <ToggleRow name="reducedMotion" label={t(lang, "settings_reduced_motion")} defaultChecked={reducedMotion} />
        <ToggleRow name="notificationsEnabled" label={t(lang, "settings_notifications")} defaultChecked={notificationsEnabled} />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 pt-5">
        {saved && <span className="text-sm font-medium text-emerald-600">✓ Preferências salvas</span>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-70"
        >
          {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {t(lang, "save")}
        </button>
      </div>
    </form>
  );
}

function ToggleRow({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="relative inline-block h-6 w-11">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-500" />
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
