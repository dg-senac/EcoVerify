/**
 * Static Pix "BR Code" (EMV QR) generator — the "Pix copia e cola" text and the QR code content.
 * Spec: Banco Central do Brasil, "Manual de Padrões para Iniciação do Pix" (EMV-QRCPS MPM).
 * Pure module (no network): shared by the server and the offline demo.
 */

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

/** Names/cities must be plain ASCII in the QR code. */
function ascii(value: string, max: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();
}

/** CRC16-CCITT (poly 0x1021, init 0xFFFF), as required by field 63. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(payload)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Reference shown in the bank statement: 1–25 letters/numbers. */
export function pixTxid(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
}

export interface PixCharge {
  key: string;
  name: string;
  city: string;
  amountCents: number;
  txid: string;
  description?: string;
}

export function pixPayload(charge: PixCharge): string {
  const account =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", charge.key.trim()) +
    (charge.description ? tlv("02", ascii(charge.description, 40)) : "");
  const body =
    tlv("00", "01") +
    tlv("26", account) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (charge.amountCents > 0 ? tlv("54", (charge.amountCents / 100).toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", ascii(charge.name, 25) || "ECOVERIFY") +
    tlv("60", ascii(charge.city, 15) || "RECIFE") +
    tlv("62", tlv("05", pixTxid(charge.txid))) +
    "6304";
  return body + crc16(body);
}

/** Unique, readable reference for an invoice, e.g. "EV7K2M9Q4T". */
export function newInvoiceReference(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let ref = "EV";
  for (let i = 0; i < 10; i++) ref += alphabet[Math.floor(random() * alphabet.length)];
  return ref;
}
