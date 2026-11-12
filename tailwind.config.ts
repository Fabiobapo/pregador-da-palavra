import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { surface:"var(--surface)", line:"var(--line)", accent:"var(--accent)", danger:"var(--danger)" },
    fontFamily: { serif: ["Georgia", "Cambria", "serif"] },
  } },
} satisfies Config;
