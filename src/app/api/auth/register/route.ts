import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`reg:${ip}`, 5)) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { name, email, password, churchName } = parsed.data;
  if (await db.user.findUnique({ where: { email } }))
    return NextResponse.json({ error: "Este e-mail já está cadastrado." }, { status: 409 });
  // O primeiro usuário cria a igreja e vira administrador.
  const user = await db.user.create({
    data: {
      name, email,
      passwordHash: await bcrypt.hash(password, 12),
      memberships: { create: { role: "ADMIN", church: { create: { name: churchName } } } },
    },
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true }, { status: 201 });
}
