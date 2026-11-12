"use client";

import { useState } from "react";

type Field = { name: string; label: string; type?: string; required?: boolean; placeholder?: string };

type SimpleFormProps = {
  title?: string;
  endpoint: string;
  fields: Field[];
  extra?: Record<string, string | boolean | number>;
  done?: string;
  redirect?: string;
  submitLabel?: string;
};

export default function SimpleForm(p: SimpleFormProps) {
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const data: Record<string, string> = {};
    new FormData(e.currentTarget).forEach((value, key) => {
      if (typeof value === "string") data[key] = value;
    });
    const payload = { ...data, ...p.extra };

    const response = await fetch(p.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      setMsg(p.done ?? "Operação concluída.");
      if (p.redirect) window.location.href = p.redirect;
      return;
    }

    setErr(result.error ?? "Algo deu errado.");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {p.title && <h1 className="mb-4 font-serif text-2xl">{p.title}</h1>}
      {p.fields.map((field) => (
        <label key={field.name} className="block text-sm font-medium text-gray-700">
          {field.label}
          <input
            name={field.name}
            type={field.type ?? "text"}
            required={field.required}
            placeholder={field.placeholder}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </label>
      ))}
      {err && <p role="alert" className="text-red-600">{err}</p>}
      {msg && <p role="status" className="text-green-600">{msg}</p>}
      <button type="submit" className="w-full rounded bg-accent px-3 py-2 font-medium text-white">
        {p.submitLabel ?? "Enviar"}
      </button>
    </form>
  );
}
