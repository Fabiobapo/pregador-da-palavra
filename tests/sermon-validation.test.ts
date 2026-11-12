import { describe, expect, it } from "vitest";
import { sermonSchema } from "@/lib/sermon-validation";

const validSermon = {
  title: "Esperança",
  type: "Sermão",
  date: "2026-11-10",
  author: "",
  tags: "",
  reference: "João 3:16",
  verse: "",
  duration: 30,
  status: "Rascunho",
  points: [{ type: "Ponto", text: "Introdução", note: "Nota privada" }],
  privateNotes: "",
};

describe("validação de sermões", () => {
  it("aceita um sermão válido com pontos", () => {
    expect(sermonSchema.safeParse(validSermon).success).toBe(true);
  });

  it("rejeita títulos vazios e durações fora do limite", () => {
    expect(sermonSchema.safeParse({ ...validSermon, title: " " }).success).toBe(false);
    expect(sermonSchema.safeParse({ ...validSermon, duration: 0 }).success).toBe(false);
  });

  it("limita o número de pontos", () => {
    const points = Array.from({ length: 101 }, () => ({ type: "Ponto", text: "", note: "" }));
    expect(sermonSchema.safeParse({ ...validSermon, points }).success).toBe(false);
  });
});
