/**
 * Génération d'identifiants UUID v7 (ADR-013).
 *
 * Les IDs sont générés **côté client** pour permettre la création hors-ligne sans collision
 * entre postes. UUID v7 = 48 bits de timestamp + entropie aléatoire : ordonnables
 * temporellement, donc efficaces pour les index et le tri, contrairement à v4.
 *
 * Utilise la Web Crypto API (`crypto.getRandomValues`), disponible en Node ≥ 20 **et** dans
 * les navigateurs — indispensable pour le mode offline-first (PWA).
 */

const globalCrypto: Crypto = (globalThis as { crypto?: Crypto }).crypto ?? (globalThis as any).crypto;

/** Génère un UUID v7 (format canonique, ordonnable temporellement). */
export function uuidv7(): string {
  const bytes = new Uint8Array(16);
  globalCrypto.getRandomValues(bytes);
  // timestamp 48 bits (ms depuis epoch)
  const ms = BigInt(Date.now());
  bytes[0] = Number((ms >> 40n) & 0xffn);
  bytes[1] = Number((ms >> 32n) & 0xffn);
  bytes[2] = Number((ms >> 24n) & 0xffn);
  bytes[3] = Number((ms >> 16n) & 0xffn);
  bytes[4] = Number((ms >> 8n) & 0xffn);
  bytes[5] = Number(ms & 0xffn);
  // version 7
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // variant 10xx
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
