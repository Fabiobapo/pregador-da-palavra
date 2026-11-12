import { db } from "@/lib/db";
import { readSession } from "@/lib/session";

export async function getSermonScope() {
  const session = await readSession();
  if (!session) return null;

  const membership = await db.membership.findFirst({
    where: { userId: session.uid },
    select: { churchId: true },
  });
  if (!membership) return null;

  return { userId: session.uid, churchId: membership.churchId };
}
