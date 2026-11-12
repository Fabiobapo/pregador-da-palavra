// Limitador simples em memória (1 instância). Em produção com várias instâncias, troque por Redis.
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max = 8, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length <= max;
}
