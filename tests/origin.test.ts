import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "@/lib/origin";

describe("validação de origem da requisição", () => {
  it("aceita o host encaminhado pelo proxy", () => {
    expect(isAllowedOrigin("https://app.example.com", ["app.example.com", "internal:3000"])).toBe(true);
  });

  it("aceita um host correspondente em uma cadeia de proxy", () => {
    expect(isAllowedOrigin("https://app.example.com", ["internal:3000, app.example.com"])).toBe(true);
  });

  it("rejeita origem ausente, inválida ou de outro host", () => {
    expect(isAllowedOrigin(null, ["app.example.com"])).toBe(false);
    expect(isAllowedOrigin("not a URL", ["app.example.com"])).toBe(false);
    expect(isAllowedOrigin("https://attacker.example", ["app.example.com"])).toBe(false);
  });
});
