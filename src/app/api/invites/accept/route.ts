import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export async function POST(req: Request) {
  const parsed = z.object({
    token: z.string().min(20),
    name: z.string().min(2).max(120),
    password: z.string().min(10).max(128),
  }).safeParse(await req.json().catch(() => null));

  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const invite = await db.invite.findUnique({ where: { tokenHash: hashToken(parsed.data.token) } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Convite inválido ou expirado." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: invite.email,
      passwordHash,
      memberships: {
        create: {
          churchId: invite.churchId,
          role: invite.role,
        },
      },
    },
  });

  await db.invite.update({ where: { id: invite.id }, data: { usedAt: new Date(), userId: user.id } });

  return NextResponse.json({ ok: true, userId: user.id });
}
