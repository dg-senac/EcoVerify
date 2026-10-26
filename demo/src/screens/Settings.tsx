import { Settings as SettingsIcon } from "lucide-react";
import { t, type Lang } from "@/lib/i18n";
import { updateSettings, useLang, type FontSize, type User } from "../store";
import { PageHeader, card } from "../components/ui";
import { ResetDemoButton } from "../components/ResetDemo";

const LANGS: { id: Lang; label: string }[] = [
  { id: "pt", label: "🇧🇷 Português" },
  { id: "en", label: "🇺🇸 English" },
  { id: "es", label: "🇪🇸 Español" },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function SettingsScreen({ user }: { user: User }) {
  const lang = useLang();
  const sizes: { id: FontSize; key: "font_small" | "font_medium" | "font_large" }[] = [
    { id: "small", key: "font_small" },
    { id: "medium", key: "font_medium" },
    { id: "large", key: "font_large" },
  ];
  const chip = (active: boolean) =>
    `rounded-xl px-3 py-2 text-sm font-semibold transition ${active ? "bg-emerald-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

  return (
    <>
      <PageHeader title={t(lang, "settings_title")} icon={SettingsIcon} />
      <div className={`${card} grid gap-6 p-5 animate-slide-up`}>
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900">{t(lang, "settings_language")}</h3>
          <div className="flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <button key={l.id} type="button" className={chip(user.language === l.id)} onClick={() => updateSettings({ language: l.id })}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900">{t(lang, "settings_font_size")}</h3>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button key={s.id} type="button" className={chip(user.fontSize === s.id)} onClick={() => updateSettings({ fontSize: s.id })}>
                {t(lang, s.key)}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          <Toggle label={t(lang, "settings_high_contrast")} checked={user.highContrast} onChange={(v) => updateSettings({ highContrast: v })} />
          <Toggle label={t(lang, "settings_reduced_motion")} checked={user.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} />
          <Toggle label={t(lang, "settings_notifications")} checked={user.notificationsEnabled} onChange={(v) => updateSettings({ notificationsEnabled: v })} />
        </div>
      </div>
      <div className="mt-4">
        <ResetDemoButton />
      </div>
    </>
  );
}
