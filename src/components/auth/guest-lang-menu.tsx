"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { LANGS, rememberGuestLang, type Lang } from "@/lib/i18n";

/** Language picker of the login and sign-up screens. The choice is remembered (cookie) for the next pages. */
export function GuestLangMenu({ value, onChange }: { value: Lang; onChange: (lang: Lang) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find((l) => l.value === value) ?? LANGS[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
        data-testid="guest-lang"
      >
        <Globe className="h-4 w-4" /> {current.label}
      </button>
      {open && (
        <div role="listbox" className="absolute right-0 top-10 z-10 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {LANGS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                rememberGuestLang(option.value);
                setOpen(false);
                router.refresh();
              }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50 ${option.value === value ? "font-bold text-emerald-700" : "text-slate-700"}`}
            >
              <span>{option.flag}</span> {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
