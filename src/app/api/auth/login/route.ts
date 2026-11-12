import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`login:${ip}`, 8)) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  // Mensagem única para não revelar se o e-mail existe.
  if (!ok) return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
