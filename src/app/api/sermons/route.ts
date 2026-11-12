import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSermonScope } from "@/lib/sermon-auth";
import { sermonSchema } from "@/lib/sermon-validation";

export async function GET() {
  const scope = await getSermonScope();
  if (!scope) return NextResponse.json({ error: "Sessão ou vínculo com igreja inválido." }, { status: 401 });

  try {
    const sermons = await db.sermon.findMany({
      where: { churchId: scope.churchId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json(sermons);
  } catch (error) {
    console.error("Failed to load sermons:", error);
    return NextResponse.json({ error: "Não foi possível carregar os sermões." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const scope = await getSermonScope();
  if (!scope) return NextResponse.json({ error: "Sessão ou vínculo com igreja inválido." }, { status: 401 });

  const parsed = sermonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  try {
    const sermon = await db.sermon.create({
      data: {
        ...parsed.data,
        churchId: scope.churchId,
        userId: scope.userId,
      },
    });
    return NextResponse.json(sermon, { status: 201 });
  } catch (error) {
    console.error("Failed to create sermon:", error);
    return NextResponse.json({ error: "Não foi possível criar o sermão." }, { status: 500 });
  }
}
