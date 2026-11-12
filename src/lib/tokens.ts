import { createHash, randomBytes } from "node:crypto";

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export function newToken() {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashToken(raw) };
}
