"use client";
export default function LogoutButton() {
  return (
    <button className="rounded border border-line px-3 py-1.5 text-sm"
      onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/"; }}>
      Sair
    </button>
  );
}
