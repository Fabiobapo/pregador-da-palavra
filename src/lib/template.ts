// Monta o corpo de uma ação do Holyrics a partir de um modelo JSON com o marcador {{text}}.
export function fillTemplate(t: unknown, text: string): unknown {
  if (typeof t === "string") return t.split("{{text}}").join(text);
  if (Array.isArray(t)) return t.map((x) => fillTemplate(x, text));
  if (t && typeof t === "object") {
    return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, fillTemplate(v, text)]));
  }
  return t;
}
