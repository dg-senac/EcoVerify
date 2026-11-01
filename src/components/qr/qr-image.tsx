"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** A QR code for `text` (SVG). Shared by the web app and the APK. */
export function QrImage({ text, size = 200, label }: { text: string; size?: number; label: string }) {
  const [svg, setSvg] = useState<{ text: string; svg: string } | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M" }).then((out) => alive && setSvg({ text, svg: out }));
    return () => {
      alive = false;
    };
  }, [text]);
  return (
    <div
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
      className="mx-auto overflow-hidden rounded-xl bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
      data-testid="qr-image"
      data-qr={text}
      dangerouslySetInnerHTML={svg && svg.text === text ? { __html: svg.svg } : undefined}
    />
  );
}
