import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCtx, fail } from "@/lib/auth";
import { AIProviderError } from "@/lib/ai";
import { generateOutline } from "@/lib/outline";

export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    const { user } = await requireCtx();
    if (!user.aiConsentAt) {
      return NextResponse.json({ error: "É necessário aceitar o envio de dados ao provedor de IA." }, { status: 403 });
    }
    const parsed = z.object({
      topic: z.string().min(3).max(200),
      tone: z.string().min(2).max(50).optional(),
      audience: z.string().min(2).max(80).optional(),
      notes: z.string().max(2000).optional(),
    }).safeParse(await req.json().catch(() => null));

    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const outline = await generateOutline(parsed.data);
    return NextResponse.json({ ok: true, outline });
  } catch (error) {
    if (error instanceof AIProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return fail(error);
  }
}
