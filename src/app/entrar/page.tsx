"use client";
import { useState } from "react";
import { registerSchema, loginSchema } from "@/lib/validation";

export default function Entrar() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data: Record<string, string> = {};
    new FormData(e.currentTarget).forEach((value, key) => {
      if (typeof value === "string") data[key] = value;
    });
    const check = (mode === "login" ? loginSchema : registerSchema).safeParse(data);
    if (!check.success) return setError(check.error.issues[0].message);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(check.data),
      });
      const result = await res.json().catch(() => null);
      if (res.ok) location.href = "/painel";
      else setError(result?.error ?? "Não foi possível entrar. Tente novamente.");
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded border border-line bg-surface px-3 py-2";
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 font-serif text-2xl">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && (<>
          <label className="block">Seu nome<input name="name" className={field} autoComplete="name" /></label>
          <label className="block">Nome da igreja<input name="churchName" className={field} /></label>
        </>)}
        <label className="block">E-mail<input name="email" type="email" className={field} autoComplete="email" /></label>
        <label className="block">Senha<input name="password" type="password" className={field} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <button disabled={busy} className="w-full rounded bg-accent px-3 py-2 font-medium text-white">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </button>
      </form>
      <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="mt-4 underline">
        {mode === "login" ? "Ainda não tenho conta" : "Já tenho conta"}
      </button>
    </main>
  );
}
