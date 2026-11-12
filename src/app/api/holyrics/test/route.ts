import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCtx, fail } from "@/lib/auth";
import { callHolyrics } from "@/lib/holyrics";

export async function POST(req: Request) {
  try {
    const { churchId } = await requireCtx(["ADMIN", "PASTOR", "EDITOR"]);
    const config = await db.holyricsConfig.findUnique({ where: { churchId } });
    if (!config?.enabled || !config.secretEnc) {
      return NextResponse.json({ error: "Configure e ative o Holyrics antes de testar." }, { status: 400 });
    }
    const result = await callHolyrics(config, "GetCPInfo");
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (error) {
    return fail(error);
  }
}
