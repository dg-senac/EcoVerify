import type { ReactNode } from "react";
import type { Lang } from "@/lib/i18n";

/** Plain building blocks for the legal documents (no Next.js imports: also used by the offline demo). */

export function LegalSection({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-bold text-slate-900">
        {n}. {title}
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function contactText(contactEmail: string | null, lang: Lang = "pt") {
  return contactEmail ? (
    <a className="font-semibold text-emerald-700 underline" href={`mailto:${contactEmail}`}>
      {contactEmail}
    </a>
  ) : (
    { pt: "pelos canais de contato informados no aplicativo", en: "through the contact channels shown in the app", es: "por los canales de contacto indicados en la aplicación" }[lang]
  );
}
