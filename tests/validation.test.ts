import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/validation";

describe("validação de cadastro", () => {
  const ok = { name: "Maria", email: "MARIA@IGREJA.COM", password: "umasenhalonga1", churchName: "Igreja Central" };
  it("aceita dados válidos e normaliza o e-mail", () => {
    expect(registerSchema.parse(ok).email).toBe("maria@igreja.com");
  });
  it("rejeita senha curta", () => {
    expect(registerSchema.safeParse({ ...ok, password: "curta" }).success).toBe(false);
  });
  it("rejeita e-mail inválido no login", () => {
    expect(loginSchema.safeParse({ email: "x", password: "y" }).success).toBe(false);
  });
});
