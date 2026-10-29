/**
 * Generates every EcoVerify icon from branding/logo-source.png (white globe + leaf on a green→blue gradient).
 *
 *   node scripts/brand-icons.mjs
 *
 * The white symbol is cut out of the source and placed on a gradient rebuilt in SVG, so every size is
 * sharp and the Android adaptive icon gets separate layers (background, foreground, monochrome).
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SOURCE = path.join(ROOT, "branding/logo-source.png");
const RES = path.join(ROOT, "android/app/src/main/res");

// Gradient measured from the source artwork (top-left → bottom-right).
export const BRAND = { from: "#2cc35f", via: "#278c98", to: "#2456d0" };

const out = (p) => {
  const full = path.join(ROOT, p);
  mkdirSync(path.dirname(full), { recursive: true });
  return full;
};

/** White symbol with real transparency, trimmed to its bounds. */
async function extractSymbol() {
  const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const rgba = Buffer.alloc(width * height * 4);
  // Only the centre holds the symbol (the source has white rounded corners outside the gradient).
  const margin = Math.round(width * 0.12);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const o = (y * width + x) * 4;
      const inside = x > margin && y > margin && x < width - margin && y < height - margin;
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      // Background channels never go above ~70 on their darkest channel; the symbol is ~255.
      const alpha = inside ? Math.max(0, Math.min(1, (min - 70) / (235 - 70))) : 0;
      rgba[o] = 255;
      rgba[o + 1] = 255;
      rgba[o + 2] = 255;
      rgba[o + 3] = Math.round(alpha * 255);
    }
  }
  return sharp(rgba, { raw: { width, height, channels: 4 } }).trim({ threshold: 1 }).png().toBuffer();
}

const gradientSvg = (w, h, radius = 0, circle = false) => {
  const shape = circle
    ? `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2}" fill="url(#g)"/>`
    : `<rect width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="url(#g)"/>`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${BRAND.from}"/><stop offset="0.5" stop-color="${BRAND.via}"/><stop offset="1" stop-color="${BRAND.to}"/>` +
      `</linearGradient></defs>${shape}</svg>`,
  );
};

/** Symbol resized so its height is `fraction` of the canvas height. */
async function symbolAt(symbol, canvasH, fraction) {
  return sharp(symbol).resize({ height: Math.max(8, Math.round(canvasH * fraction)) }).png().toBuffer();
}

async function compose(base, symbol, w, h, fraction) {
  const sym = await symbolAt(symbol, h, fraction);
  const meta = await sharp(sym).metadata();
  return sharp(base)
    .composite([{ input: sym, left: Math.round((w - meta.width) / 2), top: Math.round((h - meta.height) / 2) }])
    .png();
}

/** Full-bleed square (stores, PWA, apple-touch). */
const square = (symbol, size, fraction = 0.5) => compose(gradientSvg(size, size), symbol, size, size, fraction);
/** Rounded square with a little transparent margin (legacy launcher, favicons, in-app logo). */
async function rounded(symbol, size, fraction = 0.5) {
  const pad = Math.round(size * 0.04);
  const inner = size - pad * 2;
  const tile = await compose(gradientSvg(inner, inner, inner * 0.22), symbol, inner, inner, fraction).then((s) => s.toBuffer());
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: tile, left: pad, top: pad }])
    .png();
}
const round = (symbol, size, fraction = 0.5) => compose(gradientSvg(size, size, 0, true), symbol, size, size, fraction);

async function transparent(symbol, size, fraction) {
  const sym = await symbolAt(symbol, size, fraction);
  const meta = await sharp(sym).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: sym, left: Math.round((size - meta.width) / 2), top: Math.round((size - meta.height) / 2) }])
    .png();
}

async function main() {
  const symbol = await extractSymbol();

  // Shared artwork (app, demo, splash).
  await sharp(symbol).resize({ height: 512 }).png().toFile(out("src/assets/brand/ecoverify/symbol.png"));
  await (await square(symbol, 256)).toFile(out("src/assets/brand/ecoverify/icon.png"));
  await (await square(symbol, 1024)).toFile(out("branding/icon-1024.png"));
  await (await square(symbol, 512)).toFile(out("branding/play-store-512.png"));

  // Android launcher: legacy (pre-8.0), round, and adaptive layers (108dp canvas, 66dp safe zone).
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [name, scale] of Object.entries(densities)) {
    const dir = path.join(RES, `mipmap-${name}`);
    mkdirSync(dir, { recursive: true });
    const legacy = Math.round(48 * scale);
    const layer = Math.round(108 * scale);
    await (await rounded(symbol, legacy, 0.56)).toFile(path.join(dir, "ic_launcher.png"));
    await (await round(symbol, legacy)).toFile(path.join(dir, "ic_launcher_round.png"));
    await (await transparent(symbol, layer, 0.4)).toFile(path.join(dir, "ic_launcher_foreground.png"));
    await (await transparent(symbol, layer, 0.4)).toFile(path.join(dir, "ic_launcher_monochrome.png"));
    await sharp(gradientSvg(layer, layer)).png().toFile(path.join(dir, "ic_launcher_background.png"));
  }

  // Native splash (Android < 12 draws this bitmap; 12+ uses the colour + icon from styles.xml).
  for (const dir of readdirSync(RES).filter((d) => d.startsWith("drawable"))) {
    const file = path.join(RES, dir, "splash.png");
    if (!existsSync(file)) continue;
    const { width, height } = await sharp(readFileSync(file)).metadata();
    const img = await compose(gradientSvg(width, height), symbol, width, height, Math.min(width, height) * 0.3 / height);
    await img.toFile(file);
  }

  // Web: demo (Vercel + APK) and the Next.js app.
  for (const base of ["demo/public", "public/icons"]) {
    await (await square(symbol, 192)).toFile(out(`${base}/icon-192.png`));
    await (await square(symbol, 512)).toFile(out(`${base}/icon-512.png`));
    // Maskable: everything inside the central 80% circle.
    await (await square(symbol, 512, 0.42)).toFile(out(`${base}/icon-maskable-512.png`));
  }
  await (await square(symbol, 180)).toFile(out("demo/public/apple-touch-icon.png"));
  await (await square(symbol, 180)).toFile(out("src/app/apple-icon.png"));
  await (await rounded(symbol, 32, 0.56)).toFile(out("demo/public/favicon-32.png"));

  // SVG favicons: vector gradient + the symbol embedded as PNG.
  const sym128 = (await sharp(symbol).resize({ height: 160 }).png().toBuffer()).toString("base64");
  const symMeta = await sharp(symbol).resize({ height: 160 }).metadata();
  const w = (symMeta.width / symMeta.height) * 50;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${BRAND.from}"/><stop offset="0.5" stop-color="${BRAND.via}"/><stop offset="1" stop-color="${BRAND.to}"/>` +
    `</linearGradient></defs><rect width="100" height="100" rx="22" fill="url(#g)"/>` +
    `<image x="${(100 - w) / 2}" y="25" width="${w}" height="50" href="data:image/png;base64,${sym128}"/></svg>`;
  writeFileSync(out("demo/public/icon.svg"), svg);
  writeFileSync(out("src/app/icon.svg"), svg);

  // Link preview (WhatsApp, redes): the new icon over the logo area of demo/public/og.jpg (1200x630).
  const og = path.join(ROOT, "demo/public/og.jpg");
  if (existsSync(og)) {
    const tile = await compose(gradientSvg(128, 128, 28), symbol, 128, 128, 0.56).then((s) => s.toBuffer());
    const patched = await sharp(readFileSync(og)).composite([{ input: tile, left: 86, top: 149 }]).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    writeFileSync(og, patched);
  }

  console.log("Icons generated from", path.relative(ROOT, SOURCE));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
