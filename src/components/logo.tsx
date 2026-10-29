import ecoverifyIcon from "@/assets/brand/ecoverify/icon.png";
import { assetUrl } from "@/components/brand/fone";

/** App icon (globe + leaf on the green→blue gradient). Artwork: branding/, sizes: scripts/brand-icons.mjs. */
export function LogoMark({ size = 40, rounded = "rounded-xl" }: { size?: number; rounded?: string }) {
  return (
    <div className={`relative shrink-0 ${rounded} overflow-hidden shadow-sm`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- shared with the Vite demo */}
      <img src={assetUrl(ecoverifyIcon)} alt="EcoVerify" width={size} height={size} className="block h-full w-full select-none" draggable={false} />
    </div>
  );
}

export function LogoHorizontal({ height = 40 }: { height?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={height} />
      <span
        className="font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent"
        style={{ fontSize: height * 0.55 }}
      >
        EcoVerify
      </span>
    </div>
  );
}
