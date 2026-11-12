import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { readSession } from "./session";

export class HttpError extends Error {
  constructor(public status: number, msg: string) {
    super(msg);
  }
}

// Exige sessão e (opcionalmente) um dos papéis. Nesta versão cada usuário atua na primeira igreja dele.
export async function requireCtx(roles?: Role[]) {
  const s = await readSession();
  if (!s) throw new HttpError(401, "Entre na sua conta.");

  const user = await db.user.findUnique({ where: { id: s.uid }, include: { memberships: true } });
  const m = user?.memberships[0];
  if (!user || !m) throw new HttpError(401, "Sessão inválida.");
  if (roles && !roles.includes(m.role)) throw new HttpError(403, "Sem permissão para esta ação.");

  return { user, userId: user.id, churchId: m.churchId, role: m.role };
}

export function fail(e: unknown) {
  if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}
