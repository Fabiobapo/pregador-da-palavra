import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCtx, fail } from "@/lib/auth";

export async function GET() {
  try {
    const { user } = await requireCtx();
    return NextResponse.json({ consent: Boolean(user.aiConsentAt) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireCtx();
    const parsed = z.object({ consent: z.boolean() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Consentimento inválido." }, { status: 400 });

    const user = await db.user.update({
      where: { id: userId },
      data: { aiConsentAt: parsed.data.consent ? new Date() : null },
    });

    return NextResponse.json({ ok: true, consent: !!user.aiConsentAt });
  } catch (error) {
    return fail(error);
  }
}
