import type { NextConfig } from "next";

// Extra hosts allowed to call Server Actions (comma separated), e.g. "ecoverify.app,www.ecoverify.app".
const extraOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Next 16 blocks its dev resources (HMR, client chunks) for any host other than localhost: without this
// the app does not hydrate in dev when opened via 127.0.0.1 or GitHub Codespaces (buttons do nothing).
const devOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Camera, microphone and location are used by the app itself (proof photos, audio messages, GPS).
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1", "*.app.github.dev", ...devOrigins],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: ["localhost:3000", "*.app.github.dev", ...extraOrigins],
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
