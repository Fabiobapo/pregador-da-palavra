import http from "node:http";
import { timingSafeEqual } from "node:crypto";

const env = process.env;
const config = {
  host: env.HOLYRICS_HOST || "127.0.0.1",
  port: Number(env.HOLYRICS_PORT || 8091),
  prefix: env.HOLYRICS_PATH || "/api/",
  token: env.HOLYRICS_TOKEN || "",
  key: env.CONNECTOR_KEY || "",
  listenHost: env.LISTEN_HOST || "127.0.0.1",
  listenPort: Number(env.CONNECTOR_PORT || 3939),
  origins: (env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  timeout: Number(env.TIMEOUT_MS || 5000),
  actions: (env.ALLOWED_ACTIONS || "GetCPInfo,SetTextCP")
    .split(",")
    .map((action) => action.trim())
    .filter(Boolean),
};

function assertPort(port, name) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
}

assertPort(config.port, "HOLYRICS_PORT");
assertPort(config.listenPort, "CONNECTOR_PORT");

if (!Number.isInteger(config.timeout) || config.timeout < 1 || config.timeout > 120000) {
  throw new Error("TIMEOUT_MS must be an integer between 1 and 120000");
}

if (!config.token || config.key.length < 16) {
  console.error("Configure HOLYRICS_TOKEN and a CONNECTOR_KEY of at least 16 characters in .env.");
  process.exit(1);
}

if (!config.prefix.startsWith("/") || config.prefix.includes("?") || config.prefix.includes("#")) {
  throw new Error("HOLYRICS_PATH must be an absolute URL path without query or fragment");
}

let holyricsBase;
try {
  holyricsBase = new URL(`http://${config.host}:${config.port}`);
} catch {
  throw new Error("HOLYRICS_HOST or HOLYRICS_PORT is invalid");
}
holyricsBase.pathname = config.prefix;

const log = (...values) => console.log(new Date().toISOString(), ...values);

function keyIsValid(givenKey) {
  const provided = Buffer.from(String(givenKey ?? ""));
  const expected = Buffer.from(config.key);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function callHolyrics(action, body) {
  const endpoint = new URL(encodeURIComponent(action), holyricsBase);
  endpoint.searchParams.set("token", config.token);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
    redirect: "error",
    signal: AbortSignal.timeout(config.timeout),
  });
  const text = await response.text();

  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    // Holyrics may return plain text.
  }

  return { status: response.status, data };
}

function readJsonBody(request, maxBytes = 100_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let settled = false;

    request.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > maxBytes) {
        settled = true;
        reject(Object.assign(new Error("Request body too large"), { statusCode: 413 }));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (settled) return;
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(Object.assign(new Error("Invalid JSON body"), { statusCode: 400 }));
      }
    });

    request.on("error", (error) => {
      if (!settled) reject(error);
    });
  });
}

function send(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (origin) {
    if (!config.origins.includes(origin)) {
      send(response, 403, { ok: false, error: "Origem não permitida" });
      return;
    }

    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("vary", "Origin");
    response.setHeader("access-control-allow-headers", "Content-Type, x-connector-key");
    response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(request.url, "http://localhost");
  } catch {
    send(response, 400, { ok: false, error: "URL inválida" });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    send(response, 200, { status: "ok", service: "holyrics-connector" });
    return;
  }

  if (!keyIsValid(request.headers["x-connector-key"])) {
    send(response, 401, { ok: false, error: "Chave inválida" });
    return;
  }

  try {
    if (request.method === "GET" && requestUrl.pathname === "/status") {
      const result = await callHolyrics("GetCPInfo", {});
      log("status", result.status);
      send(response, 200, {
        ok: result.status === 200,
        holyricsStatus: result.status,
        holyrics: result.data,
      });
      return;
    }

    const match = requestUrl.pathname.match(/^\/action\/([A-Za-z0-9_]+)$/);
    if (request.method === "POST" && match) {
      const action = match[1];
      if (!config.actions.includes(action)) {
        send(response, 403, { ok: false, error: "Ação não permitida" });
        return;
      }

      if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
        send(response, 415, { ok: false, error: "Content-Type deve ser application/json" });
        return;
      }

      const result = await callHolyrics(action, await readJsonBody(request));
      log("action", action, result.status);
      send(response, 200, {
        ok: result.status === 200,
        holyricsStatus: result.status,
        holyrics: result.data,
      });
      return;
    }

    send(response, 404, { ok: false, error: "Rota não encontrada" });
  } catch (error) {
    if (error.statusCode) {
      send(response, error.statusCode, {
        ok: false,
        error: error.statusCode === 413 ? "Corpo muito grande" : "JSON inválido",
      });
      return;
    }

    const timedOut = error.name === "TimeoutError";
    log("erro", timedOut ? "tempo esgotado" : "falha na comunicação com Holyrics");
    send(response, 502, {
      ok: false,
      error: timedOut ? "Holyrics não respondeu a tempo" : "Falha na comunicação com Holyrics",
    });
  }
});

server.on("error", (error) => {
  console.error("Holyrics connector failed to start:", error.message);
  process.exitCode = 1;
});

server.listen(config.listenPort, config.listenHost, () => {
  log(`Conector em http://${config.listenHost}:${config.listenPort}`);
});
