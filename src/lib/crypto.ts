import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const key = () => createHash("sha256").update(process.env.ENCRYPTION_KEY ?? "").digest();

export function encrypt(plain: string) {
  if (!process.env.ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY não configurada.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decrypt(b64: string) {
  const b = Buffer.from(b64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([decipher.update(b.subarray(28)), decipher.final()]).toString("utf8");
}
