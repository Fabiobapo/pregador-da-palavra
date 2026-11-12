import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCtx, fail } from "@/lib/auth";
import { callHolyrics } from "@/lib/holyrics";

export async function POST(req: Request) {
  try {
    const { churchId } = await requireCtx(["ADMIN", "PASTOR", "EDITOR"]);
    const parsed = z.object({
      title: z.string().min(2).max(180),
      text: z.string().min(1).max(50000),
      slides: z.array(z.string()).max(20).optional(),
      style: z.string().optional(),
    }).safeParse(await req.json().catch(() => null));

    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const config = await db.holyricsConfig.findUnique({ where: { churchId } });
    if (!config?.enabled || !config.secretEnc) {
      return NextResponse.json({ error: "Configure e ative o Holyrics antes de apresentar." }, { status: 400 });
    }
    const result = await callHolyrics(config, "SetTextCP", {
      text: `${parsed.data.title}\n${parsed.data.text}`,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return fail(error);
  }
}
