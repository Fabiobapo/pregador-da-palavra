import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const ACCESS_COOKIE = "pdp_app_access";
const schema = z.object({ password: z.string().min(1).max(256) });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`app-access:${ip}`, 5)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }

  const accessPassword = process.env.APP_ACCESS_PASSWORD;
  const accessSecret = process.env.APP_ACCESS_SECRET;
  if (!accessPassword || accessPassword.length < 16 || !accessSecret || accessSecret.length < 32) {
    return NextResponse.json(
      { error: "A proteção por senha não está configurada corretamente no servidor." },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe a senha de acesso." }, { status: 400 });

  const supplied = createHash("sha256").update(parsed.data.password).digest();
  const expected = createHash("sha256").update(accessPassword).digest();
  if (!timingSafeEqual(supplied, expected)) {
    return NextResponse.json({ error: "Senha de acesso incorreta." }, { status: 401 });
  }

  const token = await new SignJWT({ scope: "app-access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(new TextEncoder().encode(accessSecret));

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}
