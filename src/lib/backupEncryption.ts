const FORMAT = "HPC-Encrypted-Backup";
const ITERATIONS = 600_000;
const MAX_BYTES = 25 * 1024 * 1024;
const aad = new TextEncoder().encode(`${FORMAT}:1`);

const encode = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
};
const decode = (value: unknown, max: number) => {
  if (typeof value !== "string" || value.length > Math.ceil(max / 3) * 4 + 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new Error("Invalid encrypted backup encoding.");
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
};
const derive = async (passphrase: string, salt: Uint8Array) => {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
};

export async function encryptBackup(plaintext: string, passphrase: string) {
  if (passphrase.length < 12) throw new Error("Use a backup passphrase with at least 12 characters.");
  const bytes = new TextEncoder().encode(plaintext);
  if (bytes.length > 16 * 1024 * 1024) throw new Error("This backup exceeds the in-app encrypted backup limit.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: aad }, key, bytes);
  return JSON.stringify({ format: FORMAT, version: 1, cipher: "AES-256-GCM", kdf: "PBKDF2-SHA256", iterations: ITERATIONS, salt: encode(salt), iv: encode(iv), ciphertext: encode(new Uint8Array(encrypted)) });
}

export function isEncryptedBackup(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && "format" in value && value.format === FORMAT;
}

export async function decryptBackup(value: Record<string, unknown>, passphrase: string) {
  if (value.version !== 1 || value.cipher !== "AES-256-GCM" || value.kdf !== "PBKDF2-SHA256" || value.iterations !== ITERATIONS) throw new Error("Unsupported encrypted backup format.");
  const salt = decode(value.salt, 16); const iv = decode(value.iv, 12); const ciphertext = decode(value.ciphertext, MAX_BYTES);
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 16 || ciphertext.length > MAX_BYTES) throw new Error("Invalid encrypted backup.");
  try {
    const key = await derive(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: aad }, key, ciphertext);
    return new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
  } catch {
    throw new Error("The passphrase is incorrect or the backup was altered.");
  }
}
