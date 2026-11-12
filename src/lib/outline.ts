import { AIProviderError, generate } from "@/lib/ai";

const REGRAS = ["REGRAS OBRIGATÓRIAS",
  '- Nunca invente versículos, referências, citações ou fatos históricos. Se não tiver certeza, escreva "VERIFICAR:" antes da informação.',
  "- Cite versículos apenas pela referência (ex.: João 3:16). Não reproduza o texto de traduções protegidas por direitos autorais.",
  "- Separe claramente: EXPLÍCITO NO TEXTO, INFERÊNCIA, INTERPRETAÇÃO, APLICAÇÃO CONTEMPORÂNEA e O QUE EXIGE CONFIRMAÇÃO EM COMENTÁRIOS OU FONTES ACADÊMICAS.",
  "- Quando houver interpretações teológicas diferentes, apresente as principais de forma respeitosa e equilibrada, sem chamar de consenso o que não for.",
  "- Você é uma ferramenta de apoio: não substitui oração, estudo bíblico, liderança pastoral nem fontes teológicas confiáveis.",
  "- Termos em hebraico, aramaico ou grego só quando tiver segurança; caso contrário, marque VERIFICAR."].join("\n");
const ESBOCO = ["Título da mensagem","Tema central","Texto base","Objetivo geral","Objetivos específicos","Introdução","Contextualização do texto","Estrutura com pontos principais","Subpontos","Explicação de cada versículo","Aplicações práticas","Ilustrações sugeridas (marque VERIFICAR em fatos históricos ou citações)","Perguntas para reflexão","Conclusão","Apelo ou convite","Oração final","Referências cruzadas (apenas as que você tiver certeza)","Sugestões de cânticos relacionados","Sugestões de imagens para projeção","Resumo de uma página","Versão curta para célula ou estudo bíblico","Versões para pregação de 15, 30, 45 e 60 minutos"];
const PANORAMA = ["Contexto imediato","Contexto histórico, cultural, geográfico, político e social","Público original, autor, possíveis destinatários e data aproximada","Estrutura e gênero literário","Palavras importantes no hebraico, aramaico ou grego e traduções alternativas (VERIFICAR se não tiver segurança)","Relação com o restante do livro e com outros livros da Bíblia; referências cruzadas","Temas teológicos, promessas, mandamentos, princípios e advertências","Personagens envolvidos","Problema central, ideia principal e progressão do argumento","Aplicações para a igreja, a família, a vida pessoal e a liderança","Possíveis interpretações e diferenças entre tradições teológicas","Riscos de interpretação fora do contexto e erros comuns no uso do texto","Perguntas para estudo e possíveis objeções","Síntese homilética, sugestões de introdução e de conclusão, e esboços possíveis","Quadro final separando: Explícito no texto / Inferência / Interpretação / Aplicação contemporânea / Exige confirmação em fontes"];

export type OutlineInput = { modo: "Esboço" | "Panorama"; ref?: string; tema?: string; titulo?: string; obj?: string; pub?: string; tempo?: string; tipo?: string; trad?: string; prof?: string; estilo?: string; ocasiao?: string };

export function buildPrompt(f: OutlineInput) {
  const rows: [string, string | undefined][] = [["Texto bíblico", f.ref], ["Tema", f.tema], ["Título", f.titulo], ["Objetivo do sermão", f.obj], ["Público-alvo", f.pub], ["Tempo disponível (min)", f.tempo], ["Tipo de mensagem", f.tipo], ["Tradição teológica", f.trad], ["Profundidade", f.prof], ["Estilo de comunicação", f.estilo], ["Data ou ocasião", f.ocasiao]];
  const dados = rows.filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`).join("\n");
  const pan = f.modo === "Panorama";
  const itens = (pan ? PANORAMA : ESBOCO).map((s, i) => `${i + 1}. ${s}`).join("\n");
  return `Você é um assistente de apoio ao preparo de mensagens bíblicas. Responda em português do Brasil, em Markdown, com um título de segundo nível (##) para cada item abaixo.\n\n${REGRAS}\n\nDADOS\n${dados}\n\nPRODUZA (${pan ? "Panorama Completo da passagem" : "esboço de mensagem"})\n${itens}`;
}

export type Block = { k: string; t: string; n: string };

export function kindOf(h: string) {
  const n = h.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /subponto/.test(n) ? "Subponto"
    : /aplic/.test(n) ? "Aplicação"
    : /ilustr/.test(n) ? "Ilustração"
    : /pergunt/.test(n) ? "Pergunta"
    : /conclus/.test(n) ? "Conclusão"
    : /apelo|convite/.test(n) ? "Apelo"
    : /oracao/.test(n) ? "Oração"
    : /versiculo|texto base/.test(n) ? "Versículo"
    : "Ponto";
}

export async function generateOutline(input: {
  topic?: string;
  tone?: string;
  audience?: string;
  notes?: string;
}) {
  const prompt = [
    "Você é um assistente de preparação de mensagens bíblicas.",
    "Produza um esboço claro, em português do Brasil, em formato JSON com campos: title, intro, points, conclusion.",
    `Tema: ${input.topic ?? "Mensagem bíblica"}`,
    `Tom: ${input.tone ?? "equilibrado"}`,
    `Público: ${input.audience ?? "congregação"}`,
    input.notes ? `Observações: ${input.notes}` : "",
  ].filter(Boolean).join("\n");

  const text = await generate(prompt);
  try {
    const parsed: unknown = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Formato de resposta inválido.");
    }
    return parsed;
  } catch (error) {
    console.error("AI provider returned an invalid outline response:", error);
    throw new AIProviderError("A IA respondeu, mas o esboço veio em formato inválido. Tente novamente.", 502);
  }
}

// Converte a resposta em Markdown (títulos #/##) em blocos: título vira texto de projeção, corpo vira nota privada.
export function parseBlocks(md: string) {
  let title = "";
  const blocks: Block[] = [];
  let cur: Block | null = null;

  for (const line of md.split(/\r?\n/)) {
    const m = /^(#{1,3})\s+(.*)$/.exec(line.trim());
    if (m) {
      const h = m[2].replace(/\*+/g, "").trim();
      if (m[1] === "#" && !title) {
        title = h;
        continue;
      }
      cur = { k: kindOf(h), t: h, n: "" };
      blocks.push(cur);
    } else if (cur) {
      cur.n += (cur.n ? "\n" : "") + line;
    }
  }

  blocks.forEach((b) => (b.n = b.n.trim()));
  return { title, blocks: blocks.length ? blocks : [{ k: "Ponto", t: "", n: md.trim() }] };
}
