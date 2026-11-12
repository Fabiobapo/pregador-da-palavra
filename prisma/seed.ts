// Dados de demonstração. Usuário de teste: demo@pregador.local / Demo@12345
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
async function main() {
  const church = await db.church.create({ data: { name: "Igreja Demonstração" } });
  await db.user.create({
    data: {
      name: "Pastor Demo",
      email: "demo@pregador.local",
      passwordHash: await bcrypt.hash("Demo@12345", 12),
      memberships: { create: { churchId: church.id, role: "ADMIN" } },
    },
  });
}
main().finally(() => db.$disconnect());
