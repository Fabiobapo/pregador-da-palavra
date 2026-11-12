// Provedor de IA: API compatível com OpenAI (se OPENAI_BASE_URL estiver definida) ou Ollama local.
// Serviços gratuitos têm limites, podem mudar de política e podem exigir chave ou cobrar após o limite.
export class AIProviderError extends Error {
  constructor(message: string, public status = 503) {
    super(message);
    this.name = "AIProviderError";
  }
}

async function request(url: string, init: RequestInit, provider: "Ollama" | "provedor de IA") {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new AIProviderError("O serviço de IA demorou demais para responder. Tente novamente ou use um modelo mais leve.");
    }

    const message = provider === "Ollama"
      ? "O Ollama não está acessível. Inicie-o com `docker compose up -d ollama` e confirme se o modelo definido em AI_MODEL está instalado."
      : "Não foi possível conectar ao provedor de IA configurado. Verifique a URL e tente novamente.";
    throw new AIProviderError(message);
  }
}

export async function generate(prompt: string): Promise<string> {
  const base = process.env.OPENAI_BASE_URL;
  const signal = AbortSignal.timeout(180_000);

  if (base) {
    const response = await request(`${base.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(process.env.OPENAI_API_KEY ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    }, "provedor de IA");
    if (!response.ok) throw new AIProviderError(`O provedor de IA respondeu com erro ${response.status}.`, 502);
    try {
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) throw new Error("empty response");
      return text;
    } catch {
      throw new AIProviderError("O provedor de IA retornou uma resposta inválida ou vazia.", 502);
    }
  }

  const ollamaUrl = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/+$/, "");
  const response = await request(`${ollamaUrl}/api/generate`, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "llama3.1",
      prompt,
      stream: false,
      options: { num_ctx: 2048, num_predict: 768 },
    }),
  }, "Ollama");

  if (!response.ok) {
    let detail = "";
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
        detail = body.error.slice(0, 240);
      }
    } catch {
      detail = "";
    }

    const message = response.status === 404
      ? "O modelo de IA configurado não foi encontrado no Ollama. Baixe o modelo definido em AI_MODEL e tente novamente."
      : response.status === 500
        ? "O Ollama não conseguiu iniciar o modelo. Verifique a memória disponível e tente novamente."
        : `O Ollama respondeu com erro ${response.status}. Verifique se o modelo está disponível e tente novamente.`;
    throw new AIProviderError(detail ? `${message} Detalhe: ${detail}` : message, 502);
  }
  try {
    const data = await response.json();
    if (typeof data.response !== "string" || !data.response.trim()) throw new Error("empty response");
    return data.response;
  } catch {
    throw new AIProviderError("O Ollama retornou uma resposta inválida ou vazia.", 502);
  }
}
