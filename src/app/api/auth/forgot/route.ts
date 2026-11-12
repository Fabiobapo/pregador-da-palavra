import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { newToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mail";

export async function POST(req: Request) {
  if (!rateLimit(`forgot:${req.headers.get("x-forwarded-for") ?? "local"}`, 5)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }

  const parsed = z.object({ email: z.string().trim().toLowerCase().email() })
    .safeParse(await req.json().catch(() => null));

  if (parsed.success) {
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (user) {
      const token = newToken();
      await db.passwordReset.create({
        data: { userId: user.id, tokenHash: token.hash, expiresAt: new Date(Date.now() + 3_600_000) },
      });
      await sendMail(user.email, "Redefinição de senha", `Use este link (vale por 1 hora): ${process.env.APP_URL}/redefinir?token=${token.raw}`);
    }
  }

  return NextResponse.json({ ok: true });
}
