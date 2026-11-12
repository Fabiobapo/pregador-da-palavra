import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSession } from "@/lib/session";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "./LogoutButton";
import SermonLibrary from "./SermonLibrary";

export default async function Painel() {
  const session = await readSession();
  if (!session) redirect("/entrar");

  const user = await db.user.findUnique({
    where: { id: session.uid },
    include: { memberships: { include: { church: true } } },
  });
  if (!user) redirect("/entrar");
  const membership = user.memberships[0];

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h1 className="font-serif text-3xl">Olá, {user.name}</h1>
          <p className="text-sm opacity-80">{membership?.church.name} · {membership?.role}</p>
        </div>
        <ThemeToggle />
        <LogoutButton />
      </header>
      <SermonLibrary />
    </main>
  );
}
