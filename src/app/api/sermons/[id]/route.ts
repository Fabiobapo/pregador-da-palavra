import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSermonScope } from "@/lib/sermon-auth";
import { sermonSchema } from "@/lib/sermon-validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const scope = await getSermonScope();
  if (!scope) return NextResponse.json({ error: "Sessão ou vínculo com igreja inválido." }, { status: 401 });

  const parsed = sermonSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const { id } = await params;
  try {
    const result = await db.sermon.updateMany({
      where: { id, churchId: scope.churchId },
      data: parsed.data,
    });
    if (!result.count) return NextResponse.json({ error: "Sermão não encontrado." }, { status: 404 });

    const sermon = await db.sermon.findFirst({ where: { id, churchId: scope.churchId } });
    return NextResponse.json(sermon);
  } catch (error) {
    console.error("Failed to update sermon:", error);
    return NextResponse.json({ error: "Não foi possível atualizar o sermão." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const scope = await getSermonScope();
  if (!scope) return NextResponse.json({ error: "Sessão ou vínculo com igreja inválido." }, { status: 401 });

  const { id } = await params;
  try {
    const result = await db.sermon.deleteMany({
      where: { id, churchId: scope.churchId },
    });
    if (!result.count) return NextResponse.json({ error: "Sermão não encontrado." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete sermon:", error);
    return NextResponse.json({ error: "Não foi possível remover o sermão." }, { status: 500 });
  }
}
