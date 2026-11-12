import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCtx, fail } from "@/lib/auth";
import { newToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mail";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["PASTOR", "PREACHER", "EDITOR", "MEDIA_OPERATOR", "READER"]),
});

export async function POST(req: Request) {
  try {
    const { churchId } = await requireCtx(["ADMIN", "PASTOR"]);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

    const token = newToken();
    await db.invite.create({
      data: {
        churchId,
        email: parsed.data.email,
        role: parsed.data.role,
        tokenHash: token.hash,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });

    const link = `${process.env.APP_URL}/convite?token=${token.raw}`;
    await sendMail(parsed.data.email, "Convite para o Pregador da Palavra", `Você foi convidado. Aceite em até 7 dias: ${link}`);

    return NextResponse.json({ ok: true, ...(process.env.NODE_ENV !== "production" ? { link } : {}) }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
