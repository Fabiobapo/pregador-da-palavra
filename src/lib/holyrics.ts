import { decrypt, encrypt } from "./crypto";

type Cfg = {
  host?: string;
  port?: number;
  pathPrefix?: string;
  connectorUrl?: string | null;
  secretEnc?: string;
  secret?: string | null;
  baseUrl?: string | null;
  connectorKey?: string | null;
};

// Modo conector: chama o conector local (x-connector-key). Modo direto: chama a API do Holyrics (token na URL).
// Reconexão automática: até 2 tentativas.
export async function callHolyrics(cfg: Cfg, action: string, body: unknown = {}) {
  const secret = cfg.secretEnc ? decrypt(cfg.secretEnc) : (cfg.secret ?? "");
  const viaConnector = !!(cfg.connectorUrl || cfg.connectorKey);
  const url = viaConnector
    ? `${(cfg.connectorUrl ?? cfg.baseUrl ?? "http://localhost:3000").replace(/\/$/, "")}/action/${encodeURIComponent(action)}`
    : `http://${cfg.host ?? "127.0.0.1"}:${cfg.port ?? 8091}${cfg.pathPrefix ?? "/api/"}${encodeURIComponent(action)}?token=${encodeURIComponent(secret)}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (viaConnector) headers["x-connector-key"] = cfg.connectorKey ?? secret;

  let last: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      const text = await response.text();
      let data: unknown = text;
      try { data = JSON.parse(text); } catch {
        // mantém texto bruto se a resposta não for JSON
      }
      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }

  throw new Error(last instanceof Error && last.name === "TimeoutError"
    ? "O Holyrics não respondeu a tempo."
    : "Não foi possível alcançar o Holyrics.");
}

export async function testHolyricsConnection(input: { baseUrl?: string; connectorKey?: string; secret?: string } = {}) {
  const cfg = {
    baseUrl: input.baseUrl ?? process.env.HOLyrics_BASE_URL ?? "http://localhost:8091",
    connectorKey: input.connectorKey ?? process.env.HOLYRICS_CONNECTOR_KEY ?? "",
    secret: input.secret ?? process.env.HOLYRICS_SECRET ?? "",
  };

  try {
    const response = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/health`, { method: "GET", signal: AbortSignal.timeout(5000) });
    const payload = await response.text();
    return { ok: response.ok, status: response.status, data: payload || null, config: { baseUrl: cfg.baseUrl } };
  } catch (error) {
    return { ok: false, status: 0, data: error instanceof Error ? error.message : "Não foi possível testar o Holyrics.", config: { baseUrl: cfg.baseUrl } };
  }
}

export async function presentWithHolyrics(input: { title: string; text: string; slides?: string[]; style?: string }) {
  const payload = {
    title: input.title,
    text: input.text,
    slides: input.slides ?? [],
    style: input.style ?? "default",
    encrypted: !!process.env.ENCRYPTION_KEY,
  };

  if (!process.env.HOLYRICS_SECRET && !process.env.ENCRYPTION_KEY) {
    return { ok: true, status: 202, data: { message: "Holyrics não configurado; envio simulado.", payload } };
  }

  const secret = process.env.HOLYRICS_SECRET ?? "simulated-secret";
  const baseUrl = process.env.HOLYRICS_BASE_URL ?? "http://localhost:8091";
  const result = await fetch(`${baseUrl.replace(/\/$/, "")}/present`, {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${secret}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000),
  }).then(async (response) => ({ ok: response.ok, status: response.status, data: await response.text() })).catch((error) => ({ ok: false, status: 0, data: error instanceof Error ? error.message : "Erro ao enviar para Holyrics." }));

  return result;
}

export function encodeHolyricsSecret(secret: string) {
  return encrypt(secret);
}
