/**
 * Generates the link preview image (WhatsApp, social networks) at demo/public/og.jpg, 1200x630, in English.
 * Uses branding/icon-1024.png and the official white Fone Protocol logo.
 *
 *   node scripts/og-image.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;
const FONT = "DejaVu Sans, Verdana, Arial, sans-serif";

const TEXT = {
  headline: ["Sustainable actions, verified", "and rewarded in FONE"],
  sub: "Missions near you · photo + GPS + AI · transparent payouts",
  pill: "Free for citizens · Android & web",
  rewards: "Rewards on the",
};

const b64 = (buffer) => buffer.toString("base64");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const icon = await sharp(path.join(ROOT, "branding/icon-1024.png")).resize(128, 128).png().toBuffer();
const tile = await sharp(icon)
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="28" fill="#fff"/></svg>`), blend: "dest-in" }])
  .png()
  .toBuffer();

const foneHeight = 44;
const foneSrc = path.join(ROOT, "src/assets/brand/fone/fone-protocol-logo-white.png");
const foneMeta = await sharp(foneSrc).metadata();
const foneWidth = Math.round((foneMeta.width / foneMeta.height) * foneHeight);
const fone = await sharp(readFileSync(foneSrc)).resize({ height: foneHeight }).png().toBuffer();

const pillWidth = Math.round(TEXT.pill.length * 11.3 + 36);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#075f47"/>
    <stop offset="0.5" stop-color="#0f7369"/>
    <stop offset="1" stop-color="#115e58"/>
  </linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<circle cx="1050" cy="140" r="250" fill="#fff" opacity="0.06"/>
<circle cx="870" cy="620" r="210" fill="#fff" opacity="0.06"/>
<image x="86" y="149" width="128" height="128" href="data:image/png;base64,${b64(tile)}"/>
<text x="240" y="242" font-family="${FONT}" font-size="84" font-weight="700" fill="#fff">EcoVerify</text>
<text font-family="${FONT}" font-size="44" font-weight="700" fill="#fff">
  <tspan x="90" y="350">${esc(TEXT.headline[0])}</tspan>
  <tspan x="90" y="406">${esc(TEXT.headline[1])}</tspan>
</text>
<text x="90" y="470" font-family="${FONT}" font-size="26" fill="#d6efe9">${esc(TEXT.sub)}</text>
<rect x="90" y="532" width="${pillWidth}" height="44" rx="22" fill="#fff" opacity="0.14"/>
<text x="${90 + 18}" y="561" font-family="${FONT}" font-size="20" font-weight="700" fill="#fff">${esc(TEXT.pill)}</text>
<text x="${1110 - foneWidth - 14}" y="568" text-anchor="end" font-family="${FONT}" font-size="21" fill="#eef7f5">${esc(TEXT.rewards)}</text>
<image x="${1110 - foneWidth}" y="${560 - foneHeight / 2 - 2}" width="${foneWidth}" height="${foneHeight}" href="data:image/png;base64,${b64(fone)}"/>
</svg>`;

const out = path.join(ROOT, "demo/public/og.jpg");
writeFileSync(out, await sharp(Buffer.from(svg)).jpeg({ quality: 90, mozjpeg: true }).toBuffer());
console.log("Wrote", path.relative(ROOT, out));
