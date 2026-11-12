import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const COOKIE = "pdp_session";
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET!);

export async function createSession(uid: string) {
  const token = await new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function readSession(): Promise<{ uid: string } | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { uid: payload.uid as string };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}
