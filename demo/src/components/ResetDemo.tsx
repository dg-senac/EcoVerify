import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { t } from "@/lib/i18n";
import { navigate } from "../router";
import { dt } from "../i18n";
import { resetDemo, useLang } from "../store";
import { Modal, btnDanger, btnSecondary, toast } from "./ui";

export function ResetDemoButton() {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        <RotateCcw className="h-4 w-4" /> {dt(lang, "demo_reset")}
      </button>
      {open && (
        <Modal title={dt(lang, "demo_reset")} onClose={() => setOpen(false)}>
          <p className="text-sm text-slate-600">{dt(lang, "demo_reset_confirm")}</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>{t(lang, "cancel")}</button>
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                resetDemo();
                navigate("/", { replace: true });
                toast(`${dt(lang, "demo_reset")} ✓`);
              }}
            >
              {dt(lang, "demo_reset")}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
