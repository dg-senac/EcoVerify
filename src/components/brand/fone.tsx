import foneMarkImg from "@/assets/brand/fone/fone-mark.png";
import foneLogoImg from "@/assets/brand/fone/fone-protocol-logo.png";
import foneLogoWhiteImg from "@/assets/brand/fone/fone-protocol-logo-white.png";
import { FONE_SITE_URL } from "@/lib/fone";
import { t, type Lang } from "@/lib/i18n";

/**
 * Fone Protocol brand (official artwork from fone.dev). Usage rules: docs/MARCA_FONE.md.
 * Plain <img> on purpose: the same components run in Next.js and in the offline demo (Vite).
 * Next returns { src } for image imports and Vite returns a string, so normalise both.
 */
function assetUrl(asset: unknown): string {
  return typeof asset === "string" ? asset : (asset as { src: string }).src;
}

const LOGO_RATIO = 733 / 122;

/** The Fone "F" mark, used next to FONE amounts. */
export function FoneMark({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- shared with the Vite demo
    <img
      src={assetUrl(foneMarkImg)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={`inline-block shrink-0 select-none ${className}`}
      draggable={false}
    />
  );
}

/** "[F] 25.00 FONE" */
export function FoneAmount({
  amount,
  size = 16,
  className = "",
  unitClassName = "",
}: {
  amount: string | number;
  size?: number;
  className?: string;
  unitClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      <FoneMark size={size} />
      <span>
        {amount} <span className={unitClassName}>FONE</span>
      </span>
    </span>
  );
}

/**
 * Full "FONE | Protocol" logo. Use variant "white" on coloured backgrounds.
 * The default variant follows the theme: dark artwork in light mode, white artwork in dark mode
 * (both images are rendered and theme.css shows the right one, so there is no flash).
 */
export function FoneProtocolLogo({ height = 20, variant = "default" }: { height?: number; variant?: "default" | "white" }) {
  const width = Math.round(height * LOGO_RATIO);
  if (variant === "white") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- shared with the Vite demo
      <img src={assetUrl(foneLogoWhiteImg)} alt="Fone Protocol" width={width} height={height} className="inline-block select-none" draggable={false} />
    );
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- shared with the Vite demo */}
      <img src={assetUrl(foneLogoImg)} alt="Fone Protocol" width={width} height={height} className="ev-on-light inline-block select-none" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element -- shared with the Vite demo */}
      <img src={assetUrl(foneLogoWhiteImg)} alt="Fone Protocol" width={width} height={height} className="ev-on-dark select-none" draggable={false} />
    </>
  );
}

/** "Recompensas na rede [FONE | Protocol]", linking to fone.dev. */
export function PoweredByFone({
  lang,
  height = 16,
  variant = "default",
  className = "",
}: {
  lang: Lang;
  height?: number;
  variant?: "default" | "white";
  className?: string;
}) {
  return (
    <a
      href={FONE_SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-xs font-medium ${variant === "white" ? "text-white/80" : "text-slate-500"} hover:opacity-80 ${className}`}
    >
      <span>{t(lang, "powered_by_fone")}</span>
      <FoneProtocolLogo height={height} variant={variant} />
    </a>
  );
}
