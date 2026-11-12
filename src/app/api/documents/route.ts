import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCtx, fail } from "@/lib/auth";

export async function GET() {
  try {
    const { churchId } = await requireCtx();
    const docs = await db.document.findMany({ where: { churchId }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ ok: true, documents: docs });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const { churchId, userId } = await requireCtx(["ADMIN", "PASTOR", "EDITOR"]);
    const parsed = z.object({
      title: z.string().min(2).max(200),
      type: z.enum(["SERMON", "STUDY", "NOTE", "OTHER"]),
      content: z.string().max(200000).default(""),
      tags: z.array(z.string()).max(20).default([]),
    }).safeParse(await req.json().catch(() => null));

    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    const doc = await db.document.create({
      data: {
        churchId,
        authorId: userId,
        createdById: userId,
        title: parsed.data.title,
        type: parsed.data.type,
        content: parsed.data.content,
        tags: parsed.data.tags,
      },
    });

    return NextResponse.json({ ok: true, document: doc }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
