import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { initials } from "@/lib/utils";

export const card =
  "card-surface rounded-2xl border border-black/5 bg-white shadow-[0_10px_30px_rgba(16,24,40,0.06)]";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50";

export const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";

export const label = "mb-1.5 block text-sm font-semibold text-slate-700";

export function PageHeader({ title, subtitle, icon: Icon, action }: { title: string; subtitle?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 animate-fade-in">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className={`${card} flex flex-col items-center gap-3 px-6 py-12 text-center animate-fade-in`}>
      <span className="text-5xl">{emoji}</span>
      <p className="max-w-sm text-sm text-slate-500">{text}</p>
    </div>
  );
}

export function Avatar({ name, size = 40, tone = "from-emerald-500 to-teal-600" }: { name: string; size?: number; tone?: string }) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${tone} font-bold text-white`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-slide-up sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="close" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------------- Toasts ---------------- */

type Toast = { id: number; kind: "success" | "error"; text: string };
let toasts: Toast[] = [];
let nextId = 1;
const toastListeners = new Set<(list: Toast[]) => void>();

export function toast(text: string, kind: Toast["kind"] = "success") {
  const id = nextId++;
  toasts = [...toasts, { id, kind, text }];
  toastListeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastListeners.forEach((l) => l(toasts));
  }, 3500);
}

export function Toaster() {
  const [list, setList] = useState<Toast[]>(toasts);
  useEffect(() => {
    toastListeners.add(setList);
    return () => {
      toastListeners.delete(setList);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6">
      {list.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl animate-scale-in ${
            t.kind === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {t.kind === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({ status, label: text }: { status: "pending" | "approved" | "rejected"; label: string }) {
  const tone = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rejected: "bg-red-50 text-red-700 ring-red-200",
  }[status];
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>{text}</span>;
}
