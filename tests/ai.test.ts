import { afterEach, describe, expect, it, vi } from "vitest";
import { AIProviderError, generate } from "@/lib/ai";
import { generateOutline } from "@/lib/outline";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("provedor de IA", () => {
  it("explica como resolver quando o Ollama não está acessível", async () => {
    vi.stubEnv("OPENAI_BASE_URL", "");
    vi.stubEnv("OLLAMA_URL", "http://localhost:11434/");
    vi.stubEnv("AI_MODEL", "qwen2.5:3b");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(generate("tema")).rejects.toMatchObject({
      name: "AIProviderError",
      status: 503,
      message: expect.stringContaining("docker compose up -d ollama"),
    });
  });

  it("normaliza a URL e devolve a resposta do Ollama", async () => {
    vi.stubEnv("OPENAI_BASE_URL", "");
    vi.stubEnv("OLLAMA_URL", "http://localhost:11434/");
    vi.stubEnv("AI_MODEL", "qwen2.5:3b");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ response: "Esboço gerado" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(generate("tema")).resolves.toBe("Esboço gerado");
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:11434/api/generate");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).options).toEqual({
      num_ctx: 2048,
      num_predict: 768,
    });
  });

  it("sinaliza quando o modelo configurado não existe no Ollama", async () => {
    vi.stubEnv("OPENAI_BASE_URL", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not found", { status: 404 })));

    await expect(generate("tema")).rejects.toBeInstanceOf(AIProviderError);
    await expect(generate("tema")).rejects.toThrow("modelo de IA configurado não foi encontrado");
  });

  it("inclui o erro do runner quando o Ollama responde 500", async () => {
    vi.stubEnv("OPENAI_BASE_URL", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "llama runner terminated" }), { status: 500 }),
    ));

    await expect(generate("tema")).rejects.toThrow("llama runner terminated");
  });

  it("não transforma resposta fora de JSON em erro interno", async () => {
    vi.stubEnv("OPENAI_BASE_URL", "");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ response: "Resposta sem JSON" }), { status: 200 }),
    ));

    await expect(generateOutline({ topic: "Esperança" })).rejects.toMatchObject({
      name: "AIProviderError",
      status: 502,
      message: expect.stringContaining("formato inválido"),
    });
  });
});
