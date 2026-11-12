"use client";
export default function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("pdp-theme", next); } catch {}
  }
  return (
    <button onClick={toggle} className="rounded border border-line px-3 py-1.5 text-sm">
      Alternar tema
    </button>
  );
}
