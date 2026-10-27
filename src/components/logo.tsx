import { useId } from "react";

export function LogoMark({ size = 40, rounded = "rounded-xl" }: { size?: number; rounded?: string }) {
  // Unique per instance: with a shared id, Chrome paints nothing when the first copy is hidden (e.g. the desktop sidebar on mobile).
  const gradientId = `ecoverify-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div
      className={`relative shrink-0 ${rounded} overflow-hidden shadow-sm`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="EcoVerify">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gradientId})`} />
        <path
          d="M32 78C22 68 20 50 30 36C38 25 52 20 66 22C64 34 58 44 48 50C58 47 66 41 71 32C74 46 70 62 58 72C50 79 40 80 32 78Z"
          fill="white"
          fillOpacity="0.95"
        />
        <path d="M30 72L64 40" stroke="#0d9488" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
        <path
          d="M40 62L48 70L63 52"
          fill="none"
          stroke="#0f766e"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function LogoHorizontal({ height = 40 }: { height?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={height} />
      <span
        className="font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent"
        style={{ fontSize: height * 0.55 }}
      >
        EcoVerify
      </span>
    </div>
  );
}
