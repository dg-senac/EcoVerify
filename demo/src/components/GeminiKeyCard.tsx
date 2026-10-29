import { useState } from "react";
import { Bot, ExternalLink, Eye, EyeOff, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useLang } from "../store";
import { dt } from "../i18n";
import {
  AI_STUDIO_KEYS_URL,
  BYOK_MODEL,
  byokErrorText,
  looksLikeGeminiKey,
  maskKey,
  removeGeminiKey,
  saveGeminiKey,
  testGeminiKey,
  useGeminiKey,
} from "../byok";
import { btnPrimary, btnSecondary, card, input, toast } from "./ui";

type Status = { kind: "idle" } | { kind: "checking" } | { kind: "ok" } | { kind: "error"; text: string };

/** Settings card: paste your own Gemini key to try the real photo analysis in the offline demo. */
export function GeminiKeyCard() {
  const lang = useLang();
  const savedKey = useGeminiKey();
  const [draft, setDraft] = useState("");
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const runTest = async (key: string, savedAnyway: boolean) => {
    setStatus({ kind: "checking" });
    const result = await testGeminiKey(key);
    if (result === "ok") return setStatus({ kind: "ok" });
    const text = byokErrorText(lang, result);
    setStatus({ kind: "error", text: savedAnyway && result !== "invalid_key" ? `${text} ${dt(lang, "byok_saved_anyway")}` : text });
  };

  const save = async () => {
    const key = draft.trim();
    if (!looksLikeGeminiKey(key)) return setStatus({ kind: "error", text: dt(lang, "byok_bad_format") });
    if (!saveGeminiKey(key)) return setStatus({ kind: "error", text: dt(lang, "demo_storage_full") });
    setDraft("");
    setVisible(false);
    await runTest(key, true);
  };

  const remove = () => {
    removeGeminiKey();
    setStatus({ kind: "idle" });
    toast(dt(lang, "byok_removed"));
  };

  return (
    <div className={`${card} mt-4 grid gap-4 p-5`} data-testid="byok-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Bot className="h-5 w-5 text-emerald-600" aria-hidden="true" /> {dt(lang, "byok_title")}
        </h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${savedKey ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
          data-testid="byok-status"
        >
          {savedKey ? `🤖 ${dt(lang, "byok_status_on")}` : dt(lang, "byok_status_off")}
        </span>
      </div>
      <p className="text-sm text-slate-600">{dt(lang, "byok_intro")}</p>

      {savedKey ? (
        <div className="grid gap-3">
          <p className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-sm text-slate-700">
            {dt(lang, "byok_saved_as", { key: maskKey(savedKey) })} · <span className="font-sans text-xs text-slate-500">{BYOK_MODEL}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => runTest(savedKey, false)} disabled={status.kind === "checking"}>
              {dt(lang, "byok_test")}
            </button>
            <button type="button" className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50" onClick={remove}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> {dt(lang, "byok_remove")}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="byok-key">
            {dt(lang, "byok_label")}
          </label>
          <div className="flex gap-2">
            <input
              id="byok-key"
              type={visible ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="AIza…"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={`${input} font-mono`}
            />
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setVisible((v) => !v)}
              aria-label={dt(lang, visible ? "byok_hide" : "byok_show")}
              title={dt(lang, visible ? "byok_hide" : "byok_show")}
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btnPrimary} onClick={save} disabled={!draft.trim() || status.kind === "checking"}>
              {dt(lang, "byok_save")}
            </button>
            <a href={AI_STUDIO_KEYS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline">
              {dt(lang, "byok_get_key")} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      {status.kind === "checking" && (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {dt(lang, "byok_checking")}
        </p>
      )}
      {status.kind === "ok" && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{dt(lang, "byok_ok")}</p>}
      {status.kind === "error" && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {status.text}
        </p>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <p className="mb-1 flex items-center gap-1.5 font-bold">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> {dt(lang, "byok_safety_title")}
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{dt(lang, "byok_safety_1")}</li>
          <li>{dt(lang, "byok_safety_2")}</li>
          <li>{dt(lang, "byok_safety_3")}</li>
        </ul>
      </div>
    </div>
  );
}
