"use client";

import { useState } from "react";
import { InvalidJsonResponseError, parseJsonResponse } from "@/lib/response";

export default function AccessForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/access/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.get("password") }),
      });
      const result = await parseJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        setError(result.error ?? "Não foi possível liberar o acesso.");
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/entrar");
    } catch (reason) {
      setError(reason instanceof InvalidJsonResponseError
        ? reason.message
        : "Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium">
        Senha de acesso
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="mt-1 w-full rounded border border-line bg-surface px-3 py-2"
        />
      </label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded bg-accent px-3 py-2 font-medium text-white disabled:opacity-60"
      >
        {busy ? "Verificando..." : "Acessar"}
      </button>
    </form>
  );
}
