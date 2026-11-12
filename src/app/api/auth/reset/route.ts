import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`reset:${req.headers.get("x-forwarded-for") ?? "local"}`, 8)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }

  const parsed = z.object({
    token: z.string().min(20),
    password: z.string().min(10, "A senha precisa ter ao menos 10 caracteres.").max(128),
  }).safeParse(await req.json().catch(() => null));

  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const passwordReset = await db.passwordReset.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });

  if (!passwordReset || passwordReset.usedAt || passwordReset.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 });
  }

  await db.$transaction([
    db.user.update({
      where: { id: passwordReset.userId },
      data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) },
    }),
    db.passwordReset.update({
      where: { id: passwordReset.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
