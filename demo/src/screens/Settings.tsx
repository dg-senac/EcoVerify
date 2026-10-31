import { useState } from "react";
import { Download, Monitor, Moon, Settings as SettingsIcon, Sun, Trash2 } from "lucide-react";
import { THEMES } from "@/lib/theme";
import { t, type Lang } from "@/lib/i18n";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { deleteMyAccount, exportMyData, updateSettings, useLang, type FontSize, type User } from "../store";
import { PageHeader, btnDanger, btnSecondary, card, toast } from "../components/ui";
import { Link, navigate } from "../router";
import { dt, errorText } from "../i18n";
import { formatDate } from "@/lib/utils";
import { ResetDemoButton } from "../components/ResetDemo";
import { GeminiKeyCard } from "../components/GeminiKeyCard";

const LANGS: { id: Lang; label: string }[] = [
  { id: "pt", label: "🇧🇷 Português" },
  { id: "en", label: "🇺🇸 English" },
  { id: "es", label: "🇪🇸 Español" },
];

/** "Privacidade e dados": same options as the web app (export + delete), stored only on this device. */
function PrivacySection({ user }: { user: User }) {
  const lang = useLang();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = () => {
    const json = exportMyData();
    if (!json) return;
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ecoverify-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const remove = () => {
    const result = deleteMyAccount(confirm);
    if (result.error) return setError(errorText(lang, result.error));
    toast(dt(lang, "demo_account_deleted"));
    navigate("/", { replace: true });
  };

  return (
    <div className={`${card} mt-4 grid gap-4 p-5`}>
      <h3 className="text-sm font-bold text-slate-900">{t(lang, "privacy_section")}</h3>
      <div className="text-sm text-slate-600">
        {user.termsAcceptedAt && <p>{t(lang, "terms_accepted_on").replace("{date}", formatDate(user.termsAcceptedAt, lang))}</p>}
        <p className="mt-1 flex flex-wrap gap-4 font-semibold">
          <Link to="/termos" className="text-emerald-700 underline">{t(lang, "terms_of_use")}</Link>
          <Link to="/privacidade" className="text-emerald-700 underline">{t(lang, "privacy_policy")}</Link>
          <Link to="/transparencia" className="text-emerald-700 underline">{t(lang, "transparency")}</Link>
        </p>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700">{t(lang, "export_title")}</p>
        <p className="mt-1 text-xs text-slate-500">{t(lang, "export_text")}</p>
        <button type="button" onClick={download} className={`${btnSecondary} mt-2`}>
          <Download className="h-4 w-4" /> {t(lang, "export_button")}
        </button>
      </div>
      <div className="rounded-2xl border border-red-200 bg-red-50/40 p-4">
        <p className="text-sm font-semibold text-red-700">{t(lang, "delete_title")}</p>
        <p className="mt-1 text-sm text-slate-600">{t(lang, PAYMENTS_ENABLED ? "delete_text" : "delete_text_free")}</p>
        <label className="mt-3 flex items-start gap-2.5 text-sm text-slate-700">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-red-600" />
          <span>{t(lang, "delete_confirm_label")}</span>
        </label>
        {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        <button type="button" onClick={remove} className={`${btnDanger} mt-3`}>
          <Trash2 className="h-4 w-4" /> {t(lang, "delete_button")}
        </button>
      </div>
    </div>
  );
}

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
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900">{t(lang, "settings_theme")}</h3>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((id) => {
              const Icon = id === "system" ? Monitor : id === "light" ? Sun : Moon;
              return (
                <button key={id} type="button" className={`${chip((user.theme ?? "system") === id)} inline-flex items-center gap-1.5`} onClick={() => updateSettings({ theme: id })}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {t(lang, id === "system" ? "theme_system" : id === "light" ? "theme_light" : "theme_dark")}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t(lang, "theme_system_hint")}</p>
        </div>
        <div className="divide-y divide-slate-100">
          <Toggle label={t(lang, "settings_high_contrast")} checked={user.highContrast} onChange={(v) => updateSettings({ highContrast: v })} />
          <Toggle label={t(lang, "settings_reduced_motion")} checked={user.reducedMotion} onChange={(v) => updateSettings({ reducedMotion: v })} />
          <Toggle label={t(lang, "settings_notifications")} checked={user.notificationsEnabled} onChange={(v) => updateSettings({ notificationsEnabled: v })} />
        </div>
      </div>
      <GeminiKeyCard />
      <PrivacySection user={user} />
      <div className="mt-4">
        <ResetDemoButton />
      </div>
    </>
  );
}
