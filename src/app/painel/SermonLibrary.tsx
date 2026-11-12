"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseJsonResponse } from "@/lib/response";

type Point = { type: string; text: string; note: string };
type Sermon = {
  id: string;
  title: string;
  type: string;
  date: string;
  author: string;
  tags: string;
  reference: string;
  verse: string;
  duration: number;
  status: "Rascunho" | "Pronto" | "Pregado" | "Arquivado";
  points: Point[];
  privateNotes: string;
  updatedAt: string;
};
type Draft = Omit<Sermon, "id" | "updatedAt">;
type Bible = {
  meta: { name: string; license: string; source: string };
  books: { name: string; chapters: (string | null)[][] }[];
};
type BibleMark = { favorite?: boolean; color?: number; note?: string };

const pointTypes = ["Ponto", "Subponto", "Versículo", "Ilustração", "Aplicação", "Pergunta", "Conclusão", "Apelo", "Oração"];
const sermonTypes = ["Sermão", "Esboço", "Estudo", "Devocional", "Estudo de célula", "Aula", "Anotação", "Série", "Roteiro de culto"];
const statuses: Sermon["status"][] = ["Rascunho", "Pronto", "Pregado", "Arquivado"];
const bibleNames = "Gênesis,Êxodo,Levítico,Números,Deuteronômio,Josué,Juízes,Rute,1 Samuel,2 Samuel,1 Reis,2 Reis,1 Crônicas,2 Crônicas,Esdras,Neemias,Ester,Jó,Salmos,Provérbios,Eclesiastes,Cantares,Isaías,Jeremias,Lamentações,Ezequiel,Daniel,Oseias,Joel,Amós,Obadias,Jonas,Miqueias,Naum,Habacuque,Sofonias,Ageu,Zacarias,Malaquias,Mateus,Marcos,Lucas,João,Atos,Romanos,1 Coríntios,2 Coríntios,Gálatas,Efésios,Filipenses,Colossenses,1 Tessalonicenses,2 Tessalonicenses,1 Timóteo,2 Timóteo,Tito,Filemom,Hebreus,Tiago,1 Pedro,2 Pedro,1 João,2 João,3 João,Judas,Apocalipse".split(",");
const bibleCodes = "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split(" ");
const inputClass = "w-full rounded border border-line bg-surface px-3 py-2";
const buttonClass = "min-h-11 rounded border border-line bg-surface px-3 py-2";

function emptyDraft(): Draft {
  return {
    title: "",
    type: "Sermão",
    date: new Date().toISOString().slice(0, 10),
    author: "",
    tags: "",
    reference: "",
    verse: "",
    duration: 30,
    status: "Rascunho",
    points: [{ type: "Ponto", text: "", note: "" }],
    privateNotes: "",
  };
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function formatOutline(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A IA retornou uma resposta fora do formato esperado.");
  }
  const outline = value as Record<string, unknown>;
  const lines: string[] = [];
  const addSection = (heading: string, content: unknown) => {
    if (typeof content === "string" && content.trim()) lines.push(`## ${heading}\n${content.trim()}`);
  };
  addSection("Introdução", outline.intro);
  if (Array.isArray(outline.points)) {
    const points = outline.points.map((point) => {
      if (typeof point === "string") return point;
      if (!point || typeof point !== "object" || Array.isArray(point)) return "";
      const item = point as Record<string, unknown>;
      const title = typeof item.title === "string" ? item.title : typeof item.text === "string" ? item.text : "";
      const detail = typeof item.detail === "string" ? item.detail : typeof item.description === "string" ? item.description : "";
      return [title, detail].filter(Boolean).join("\n");
    }).filter(Boolean);
    if (points.length) lines.push(`## Pontos principais\n${points.map((point, index) => `${index + 1}. ${point}`).join("\n\n")}`);
  }
  addSection("Conclusão", outline.conclusion);
  const title = typeof outline.title === "string" ? outline.title.trim() : "";
  if (title) lines.unshift(`# ${title}`);
  if (!lines.length) throw new Error("A IA retornou um esboço vazio. Tente novamente.");
  return lines.join("\n\n");
}

function openBibleStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const opening = indexedDB.open("pregador-da-palavra", 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore("data");
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const database = opening.result;
      const transaction = database.transaction("data", mode);
      const request = action(transaction.objectStore("data"));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

function parseBible(text: string, fileName: string): Bible {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    raw = null;
  }

  if (raw !== null) {
    const root = raw as { nome?: unknown; name?: unknown; licenca?: unknown; license?: unknown; fonte?: unknown; source?: unknown; livros?: unknown; books?: unknown } | unknown[];
    const books = Array.isArray(root) ? root : root.livros ?? root.books;
    if (!Array.isArray(books)) throw new Error("O JSON não contém uma lista de livros.");
    const parsedBooks = books.map((book) => {
      if (!book || typeof book !== "object") throw new Error("Livro inválido no arquivo.");
      const item = book as { nome?: unknown; name?: unknown; capitulos?: unknown; chapters?: unknown };
      const chapters = item.capitulos ?? item.chapters;
      if (typeof (item.nome ?? item.name) !== "string" || !Array.isArray(chapters)) {
        throw new Error("Cada livro precisa ter nome e capítulos.");
      }
      return {
        name: (item.nome ?? item.name) as string,
        chapters: chapters.map((chapter) => {
          if (!Array.isArray(chapter)) throw new Error("Capítulo inválido no arquivo.");
          return chapter.map((verse) => typeof verse === "string" ? verse : null);
        }),
      };
    });
    if (!parsedBooks.length) throw new Error("O arquivo não contém livros.");
    const metadata = Array.isArray(root) ? {} : root;
    return {
      meta: {
        name: String(metadata.nome ?? metadata.name ?? fileName),
        license: String(metadata.licenca ?? metadata.license ?? ""),
        source: String(metadata.fonte ?? metadata.source ?? ""),
      },
      books: parsedBooks,
    };
  }

  const grouped = new Map<number, (string | null)[][]>();
  for (const line of text.split(/\r?\n/)) {
    const match = /^(\w{3})\s+(\d+):(\d+)\s+(.*)$/.exec(line.trim());
    if (!match) continue;
    const bookIndex = bibleCodes.indexOf(match[1].toUpperCase());
    if (bookIndex < 0) continue;
    const chapterIndex = Number(match[2]) - 1;
    const verseIndex = Number(match[3]) - 1;
    if (chapterIndex < 0 || chapterIndex > 299 || verseIndex < 0 || verseIndex > 299) continue;
    const chapters = grouped.get(bookIndex) ?? [];
    const verses = chapters[chapterIndex] ?? [];
    verses[verseIndex] = match[4];
    chapters[chapterIndex] = verses;
    grouped.set(bookIndex, chapters);
  }
  const books = [...grouped.entries()].sort(([a], [b]) => a - b).map(([index, chapters]) => ({
    name: bibleNames[index],
    chapters,
  }));
  if (!books.length) throw new Error("Não encontrei versículos. Use JSON ou linhas como “JHN 3:16 texto”.");
  return { meta: { name: fileName, license: "", source: "" }, books };
}

export default function SermonLibrary() {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"list" | "edit" | "bible" | "assistant" | "holyrics">("list");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [bible, setBible] = useState<Bible | null>(null);
  const [bookIndex, setBookIndex] = useState(0);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [bibleQuery, setBibleQuery] = useState("");
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [marks, setMarks] = useState<Record<string, BibleMark>>({});
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantReply, setAssistantReply] = useState("");
  const assistantFormRef = useRef<HTMLFormElement>(null);
  const [aiConsent, setAiConsent] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [holyricsConfig, setHolyricsConfig] = useState({
    mode: "direct" as "direct" | "connector",
    host: "127.0.0.1",
    port: 8091,
    pathPrefix: "/api/",
    connectorUrl: "http://127.0.0.1:3939",
    secret: "",
    enabled: true,
    hasSecret: false,
  });
  const [holyricsBusy, setHolyricsBusy] = useState(false);
  const [holyricsMessage, setHolyricsMessage] = useState("");
  const [presentation, setPresentation] = useState(false);
  const [slide, setSlide] = useState(0);
  const [showPrivateNotes, setShowPrivateNotes] = useState(false);
  const [blankScreen, setBlankScreen] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const slideCount = 1 + (draft.verse ? 1 : 0) + draft.points.length;

  const refreshSermons = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sermons", { cache: "no-store" });
      if (!response.ok) {
        const result = await parseJsonResponse<{ error?: string }>(response);
        throw new Error(result.error ?? "Não foi possível carregar os sermões.");
      }
      setSermons(await parseJsonResponse<Sermon[]>(response));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar os sermões.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDefaultBible = useCallback(async () => {
    try {
      const response = await fetch("/biblia/arc.json", { cache: "force-cache" });
      if (!response.ok) return;
      const parsed = parseBible(await response.text(), "ARC");
      await openBibleStore<IDBValidKey>("readwrite", (store) => store.put(parsed, "bible"));
      setBible(parsed);
      setBookIndex(0);
      setChapterIndex(0);
      setSelectedVerses([]);
    } catch (reason) {
      console.warn("Default Bible could not be loaded:", reason);
    }
  }, []);

  useEffect(() => {
    void refreshSermons();
    void fetch("/api/ai/consent", { cache: "no-store" })
      .then(async (response) => response.ok ? parseJsonResponse<{ consent: boolean }>(response) : null)
      .then((result) => { if (result) setAiConsent(result.consent); })
      .catch(() => setError("Não foi possível verificar o consentimento de IA."));
    void fetch("/api/holyrics/config", { cache: "no-store" })
      .then(async (response) => response.ok ? parseJsonResponse<{ config: Partial<typeof holyricsConfig> | null }>(response) : null)
      .then((result) => {
        if (result?.config) setHolyricsConfig((current) => ({ ...current, ...result.config, secret: "" }));
      })
      .catch(() => setError("Não foi possível carregar a configuração do Holyrics."));
    try {
      const savedMarks = localStorage.getItem("pdp-bible-marks");
      if (savedMarks) setMarks(JSON.parse(savedMarks) as Record<string, BibleMark>);
    } catch {
      setError("Não foi possível ler as anotações bíblicas salvas neste aparelho.");
    }
    openBibleStore<Bible | undefined>("readonly", (store) => store.get("bible"))
      .then((savedBible) => {
        if (savedBible) setBible(savedBible);
        else void loadDefaultBible();
      })
      .catch(() => {
        void loadDefaultBible();
      });
  }, [loadDefaultBible, refreshSermons]);

  useEffect(() => {
    if (!presentation) return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        setSlide((value) => Math.min(slideCount - 1, value + 1));
      }
      if (event.key === "ArrowLeft") setSlide((value) => Math.max(0, value - 1));
      if (event.key === "Escape") setPresentation(false);
      if (event.key.toLowerCase() === "b") setBlankScreen((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [presentation, startedAt, slideCount]);

  const currentSermon = editingId ? sermons.find((sermon) => sermon.id === editingId) : undefined;
  const visibleSermons = useMemo(() => {
    const term = normalize(query);
    return sermons.filter((sermon) => !term || normalize([
      sermon.title, sermon.reference, sermon.tags, sermon.type, sermon.status,
    ].join(" ")).includes(term));
  }, [query, sermons]);
  const slides = useMemo(() => [
    { heading: draft.title || "Sem título", subtitle: `${draft.reference}${draft.duration ? ` · ${draft.duration} min` : ""}`, note: draft.privateNotes },
    ...(draft.verse ? [{ heading: draft.verse, subtitle: draft.reference, note: "" }] : []),
    ...draft.points.map((point) => ({ heading: point.text || "…", subtitle: point.type, note: point.note })),
  ], [draft]);
  const chapter = bible?.books[bookIndex]?.chapters[chapterIndex] ?? [];
  const selectedText = selectedVerses.map((index) => chapter[index]).filter((verse): verse is string => typeof verse === "string").join(" ");
  const selectedReference = bible && selectedVerses.length
    ? `${bible.books[bookIndex].name} ${chapterIndex + 1}:${selectedVerses.map((index) => index + 1).join(",")}`
    : "";

  function startNewSermon() {
    setEditingId(null);
    setDraft(emptyDraft());
    setMode("edit");
  }

  function editSermon(sermon: Sermon) {
    const { id, updatedAt, ...data } = sermon;
    void id;
    void updatedAt;
    setEditingId(sermon.id);
    setDraft(data);
    setMode("edit");
  }

  function changeDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveSermon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const url = editingId ? `/api/sermons/${encodeURIComponent(editingId)}` : "/api/sermons";
    try {
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await parseJsonResponse<Sermon & { error?: string }>(response);
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar o sermão.");
      const saved = result as Sermon;
      setSermons((current) => [saved, ...current.filter((sermon) => sermon.id !== saved.id)]);
      setEditingId(saved.id);
      setMode("edit");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o sermão.");
    }
  }

  async function deleteSermon() {
    if (!editingId || !window.confirm("Excluir este sermão permanentemente?")) return;
    try {
      const response = await fetch(`/api/sermons/${encodeURIComponent(editingId)}`, { method: "DELETE" });
      const result = await parseJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error ?? "Não foi possível excluir o sermão.");
      setSermons((current) => current.filter((sermon) => sermon.id !== editingId));
      setMode("list");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir o sermão.");
    }
  }

  async function duplicateSermon() {
    try {
      const response = await fetch("/api/sermons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, title: `${draft.title} (cópia)`, status: "Rascunho" }),
      });
      const result = await parseJsonResponse<Sermon & { error?: string }>(response);
      if (!response.ok) {
        setError(result.error ?? "Não foi possível duplicar o sermão.");
        return;
      }
      const saved = result as Sermon;
      setSermons((current) => [saved, ...current]);
      editSermon(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível duplicar o sermão.");
    }
  }

  async function importBible(file: File | undefined) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("O arquivo da Bíblia deve ter no máximo 25 MB.");
      return;
    }
    try {
      const parsed = parseBible(await file.text(), file.name.replace(/\.\w+$/, ""));
      if (!parsed.meta.license) parsed.meta.license = window.prompt("Informe a licença desta tradução:") ?? "";
      if (!parsed.meta.source) parsed.meta.source = window.prompt("Informe a fonte desta tradução:") ?? "";
      await openBibleStore<IDBValidKey>("readwrite", (store) => store.put(parsed, "bible"));
      setBible(parsed);
      setBookIndex(0);
      setChapterIndex(0);
      setSelectedVerses([]);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não consegui importar esse arquivo.");
    }
  }

  function setMark(index: number, patch: BibleMark) {
    const key = `${bookIndex}|${chapterIndex}|${index}`;
    const next = { ...marks, [key]: { ...marks[key], ...patch } };
    setMarks(next);
    try {
      localStorage.setItem("pdp-bible-marks", JSON.stringify(next));
    } catch {
      setError("Não foi possível salvar a anotação bíblica neste aparelho.");
    }
  }

  function useSelectedVerses() {
    const reference = selectedReference;
    const verse = selectedText;
    if (!reference || !verse) {
      setError("Selecione ao menos um versículo.");
      return;
    }
    setDraft((current) => ({ ...current, reference, verse }));
    setEditingId(null);
    setMode("edit");
  }

  function findBibleReference() {
    if (!bible) return;
    const match = /^(.+?)\s+(\d+)(?::(\d+))?$/.exec(bibleQuery.trim());
    if (match) {
      const book = normalize(match[1]);
      const foundBook = bible.books.findIndex((item) => normalize(item.name).startsWith(book));
      const nextChapter = Number(match[2]) - 1;
      if (foundBook >= 0 && bible.books[foundBook].chapters[nextChapter]) {
        setBookIndex(foundBook);
        setChapterIndex(nextChapter);
        setSelectedVerses(match[3] ? [Number(match[3]) - 1] : []);
        return;
      }
    }
    const term = normalize(bibleQuery);
    if (term.length < 2) return;
    const found: { book: number; chapter: number; verse: number }[] = [];
    bible.books.some((item, book) => item.chapters.some((verses, chapter) => verses.some((verse, index) => {
      if (verse && normalize(verse).includes(term) && found.length < 1) {
        found.push({ book, chapter, verse: index });
        return true;
      }
      return false;
    })));
    if (found[0]) {
      setBookIndex(found[0].book);
      setChapterIndex(found[0].chapter);
      setSelectedVerses([found[0].verse]);
    } else {
      setError("Nenhum versículo encontrado nessa tradução.");
    }
  }

  function generateAssistantPrompt(form: FormData) {
    const fields = [
      ["Texto bíblico", form.get("reference")],
      ["Tema", form.get("theme")],
      ["Público-alvo", form.get("audience")],
      ["Tempo disponível", form.get("duration")],
    ].filter((entry): entry is [string, FormDataEntryValue] => typeof entry[1] === "string" && Boolean(entry[1]));
    const prompt = [
      "Prepare uma proposta de estudo ou mensagem bíblica em português do Brasil.",
      "Não invente versículos, referências ou fatos. Marque informações incertas com VERIFICAR.",
      "Diferencie o que é explícito no texto, inferência, interpretação e aplicação contemporânea.",
      "Respeite diferenças de interpretação teológica e não reproduza textos de traduções protegidas.",
      "",
      "Dados fornecidos:",
      ...fields.map(([label, value]) => `- ${label}: ${value}`),
      "",
      "Organize a resposta em Markdown com título, contexto, ideia central, pontos, aplicações, conclusão e perguntas para reflexão.",
    ].join("\n");
    setAssistantPrompt(prompt);
    setAssistantReply("");
  }

  async function updateAIConsent(consent: boolean) {
    setError("");
    try {
      const response = await fetch("/api/ai/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
      const result = await parseJsonResponse<{ error?: string; consent: boolean }>(response);
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar o consentimento.");
      setAiConsent(result.consent);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar o consentimento.");
    }
  }

  async function generateConfiguredOutline(form: FormData) {
    if (!aiConsent) {
      setError("Leia e aceite o envio dos dados ao provedor de IA antes de gerar.");
      return;
    }
    const reference = String(form.get("reference") ?? "").trim();
    const topic = String(form.get("theme") ?? "").trim() || reference;
    if (topic.length < 3) {
      setError("Informe um tema ou texto bíblico para gerar o esboço.");
      return;
    }

    setAiBusy(true);
    setError("");
    try {
      const response = await fetch("/api/ai/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          audience: String(form.get("audience") ?? "").trim() || undefined,
          tone: "bíblico, cuidadoso e pastoral",
          notes: [
            reference ? `Texto bíblico: ${reference}` : "",
            form.get("duration") ? `Duração: ${form.get("duration")} minutos` : "",
          ].filter(Boolean).join("\n"),
        }),
      });
      const result = await parseJsonResponse<{ error?: string; outline: unknown }>(response);
      if (!response.ok) throw new Error(result.error ?? "Não foi possível gerar o esboço.");
      setAssistantReply(formatOutline(result.outline));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível gerar o esboço.");
    } finally {
      setAiBusy(false);
    }
  }

  async function saveHolyricsConfig(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHolyricsBusy(true);
    setHolyricsMessage("");
    setError("");
    try {
      const { secret, ...config } = holyricsConfig;
      const response = await fetch("/api/holyrics/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, secret: secret || undefined }),
      });
      const result = await parseJsonResponse<{ error?: string; config: Partial<typeof holyricsConfig> }>(response);
      if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar a configuração.");
      setHolyricsConfig((current) => ({ ...current, ...result.config, secret: "" }));
      setHolyricsMessage("Configuração salva.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar a configuração.");
    } finally {
      setHolyricsBusy(false);
    }
  }

  async function runHolyricsAction(action: "test" | "present") {
    setHolyricsBusy(true);
    setHolyricsMessage("");
    setError("");
    try {
      const body = action === "test"
        ? {}
        : {
            title: draft.title,
            text: [
              draft.reference ? `Texto: ${draft.reference}` : "",
              draft.verse,
              ...draft.points.map((point) => point.text).filter(Boolean),
            ].filter(Boolean).join("\n\n"),
          };
      const response = await fetch(`/api/holyrics/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await parseJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(result.error ?? "A operação do Holyrics falhou.");
      setHolyricsMessage(action === "test" ? "Conexão com Holyrics testada com sucesso." : "Conteúdo enviado ao Holyrics.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A operação do Holyrics falhou.");
    } finally {
      setHolyricsBusy(false);
    }
  }

  async function importAssistantReply() {
    if (!assistantReply.trim()) {
      setError("Cole a resposta do assistente antes de importar.");
      return;
    }
    const headings = assistantReply.split(/\r?\n/);
    const points: Point[] = [];
    let active: Point | undefined;
    for (const line of headings) {
      const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
      if (heading) {
        active = { type: points.length ? "Ponto" : "Introdução", text: heading[2].replace(/\*+/g, "").trim(), note: "" };
        points.push(active);
      } else if (active && line.trim()) {
        active.note += `${active.note ? "\n" : ""}${line.trim()}`;
      }
    }
    setDraft({
      ...emptyDraft(),
      title: points[0]?.text ?? "Esboço com apoio de IA",
      type: "Esboço",
      reference: "",
      points: points.length ? points : [{ type: "Ponto", text: "Revisar resposta importada", note: assistantReply.trim() }],
      privateNotes: "Rascunho criado a partir de uma resposta externa. Verifique cuidadosamente referências bíblicas e informações antes de usar.",
    });
    setEditingId(null);
    setMode("edit");
  }

  function exportBackup() {
    const data = new Blob([JSON.stringify({ version: 1, sermons }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(data);
    link.download = "pregador-da-palavra-backup.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function restoreBackup(file: File | undefined) {
    if (!file) return;
    try {
      const backup: unknown = JSON.parse(await file.text());
      if (!backup || typeof backup !== "object" || !("sermons" in backup) || !Array.isArray(backup.sermons)) {
        throw new Error("O arquivo não contém uma lista de sermões.");
      }
      for (const item of backup.sermons) {
        if (!item || typeof item !== "object") throw new Error("Registro de sermão inválido.");
        const { id: ignoredId, updatedAt: ignoredTime, ...payload } = item as Sermon;
        void ignoredId;
        void ignoredTime;
        const response = await fetch("/api/sermons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const result = await parseJsonResponse<{ error?: string }>(response);
          throw new Error(result.error ?? "Falha ao restaurar um sermão.");
        }
      }
      await refreshSermons();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível restaurar o backup.");
    }
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text).then(
      () => setError("Texto copiado."),
      () => setError("Não foi possível copiar. Selecione e copie o texto manualmente."),
    );
  }

  function exportText() {
    const text = [
      `# ${draft.title}`,
      `\n**Texto:** ${draft.reference}`,
      draft.verse ? `\n> ${draft.verse}` : "",
      ...draft.points.map((point, index) => `\n## ${index + 1}. ${point.type}: ${point.text}${point.note ? `\n${point.note}` : ""}`),
      draft.privateNotes ? `\n\n**Notas privadas:**\n${draft.privateNotes}` : "",
    ].join("");
    copyText(text);
  }

  return (
    <>
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded border border-danger p-3 text-danger">
          <span>{error}</span>
          <button className={buttonClass} onClick={() => setError("")}>Fechar</button>
        </div>
      )}

      {mode === "list" && (
        <section>
          <div className="mb-4 flex flex-wrap gap-2">
            <button className="rounded bg-accent px-4 py-2 font-medium text-white" onClick={startNewSermon}>Novo sermão</button>
            <button className={buttonClass} onClick={exportBackup}>Baixar backup</button>
            <label className={`${buttonClass} cursor-pointer`}>Restaurar backup<input className="sr-only" type="file" accept=".json,application/json" onChange={(event) => void restoreBackup(event.target.files?.[0])} /></label>
            <button className={buttonClass} onClick={() => setMode("bible")}>Bíblia</button>
            <button className={buttonClass} onClick={() => setMode("assistant")}>Preparar pedido para IA</button>
            <button className={buttonClass} onClick={() => setMode("holyrics")}>Configurar Holyrics</button>
          </div>
          <label htmlFor="sermon-search" className="sr-only">Buscar sermões</label>
          <input id="sermon-search" className={inputClass} placeholder="Buscar por título, tag, status ou texto bíblico" value={query} onChange={(event) => setQuery(event.target.value)} />
          {loading && <p className="mt-4">Carregando sermões…</p>}
          {!loading && !visibleSermons.length && <div className="mt-4 rounded border border-line bg-surface p-4">Nenhum sermão encontrado. Crie um para começar.</div>}
          <ul className="mt-3 space-y-2">
            {visibleSermons.map((sermon) => (
              <li key={sermon.id}>
                <button className={`${buttonClass} w-full text-left`} onClick={() => editSermon(sermon)}>
                  <strong className="block">{sermon.title}</strong>
                  <span className="text-sm opacity-80">{sermon.type} · {sermon.reference || "Sem texto bíblico"} · {sermon.status} · {sermon.duration} min{sermon.tags ? ` · ${sermon.tags}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mode === "edit" && (
        <form className="space-y-3 print:space-y-2" onSubmit={(event) => void saveSermon(event)}>
          <div className="mb-4 flex flex-wrap gap-2 print:hidden">
            <button type="button" className={buttonClass} onClick={() => { setMode("list"); setError(""); }}>Voltar</button>
            <button type="submit" className="rounded bg-accent px-4 py-2 font-medium text-white">Salvar sermão</button>
            <button type="button" className={buttonClass} onClick={() => { setSlide(0); setStartedAt(Date.now()); setPresentation(true); }}>Apresentar</button>
            <button type="button" className={buttonClass} disabled={holyricsBusy} onClick={() => void runHolyricsAction("present")}>Enviar ao Holyrics</button>
            <button type="button" className={buttonClass} onClick={exportText}>Copiar texto</button>
            <button type="button" className={buttonClass} onClick={() => window.print()}>Imprimir / PDF</button>
            {editingId && <button type="button" className={buttonClass} onClick={() => void duplicateSermon()}>Duplicar</button>}
            {editingId && <button type="button" className={`${buttonClass} text-danger`} onClick={() => void deleteSermon()}>Excluir</button>}
          </div>
          <h2 className="font-serif text-2xl">{editingId ? "Editar sermão" : "Novo sermão"}</h2>
          <label className="block">Título<input className={inputClass} maxLength={160} required value={draft.title} onChange={(event) => changeDraft("title", event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">Tipo<select className={inputClass} value={draft.type} onChange={(event) => changeDraft("type", event.target.value)}>{sermonTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label className="block">Data<input className={inputClass} type="date" value={draft.date} onChange={(event) => changeDraft("date", event.target.value)} /></label>
            <label className="block">Autor<input className={inputClass} maxLength={100} value={draft.author} onChange={(event) => changeDraft("author", event.target.value)} /></label>
            <label className="block">Tags (separadas por vírgula)<input className={inputClass} maxLength={500} value={draft.tags} onChange={(event) => changeDraft("tags", event.target.value)} /></label>
          </div>
          <label className="block">Texto bíblico<input className={inputClass} placeholder="Ex.: João 3:16-21" value={draft.reference} onChange={(event) => changeDraft("reference", event.target.value)} /></label>
          <label className="block">Texto do versículo (projeção)<textarea className={inputClass} rows={4} value={draft.verse} onChange={(event) => changeDraft("verse", event.target.value)} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">Tempo (min)<input className={inputClass} type="number" min={1} max={600} value={draft.duration} onChange={(event) => changeDraft("duration", Number(event.target.value))} /></label>
            <label className="block">Status<select className={inputClass} value={draft.status} onChange={(event) => changeDraft("status", event.target.value as Sermon["status"])}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3">
            <h3 className="font-serif text-xl">Pontos do sermão</h3>
            <button type="button" className={buttonClass} onClick={() => changeDraft("points", [...draft.points, { type: "Ponto", text: "", note: "" }])}>Adicionar ponto</button>
          </div>
          {draft.points.map((point, index) => (
            <fieldset key={index} className="space-y-2 rounded border border-line bg-surface p-3">
              <legend className="px-1 font-medium">Ponto {index + 1}</legend>
              <label className="block">Tipo de bloco<select className={inputClass} value={point.type} onChange={(event) => changeDraft("points", draft.points.map((item, i) => i === index ? { ...item, type: event.target.value } : item))}>{pointTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label className="block">Texto na projeção<textarea className={inputClass} rows={2} value={point.text} onChange={(event) => changeDraft("points", draft.points.map((item, i) => i === index ? { ...item, text: event.target.value } : item))} /></label>
              <label className="block">Nota privada (não aparece na projeção)<textarea className={inputClass} rows={2} value={point.note} onChange={(event) => changeDraft("points", draft.points.map((item, i) => i === index ? { ...item, note: event.target.value } : item))} /></label>
              <div className="flex gap-2">
                <button type="button" className={buttonClass} disabled={index === 0} onClick={() => changeDraft("points", draft.points.map((item, i, all) => i === index ? all[index - 1] : i === index - 1 ? all[index] : item))}>Subir</button>
                <button type="button" className={buttonClass} disabled={index === draft.points.length - 1} onClick={() => changeDraft("points", draft.points.map((item, i, all) => i === index ? all[index + 1] : i === index + 1 ? all[index] : item))}>Descer</button>
                <button type="button" className={`${buttonClass} ml-auto text-danger`} onClick={() => changeDraft("points", draft.points.filter((_, i) => i !== index))}>Remover</button>
              </div>
            </fieldset>
          ))}
          <label className="block">Observações privadas<textarea className={inputClass} rows={4} value={draft.privateNotes} onChange={(event) => changeDraft("privateNotes", event.target.value)} /></label>
          {currentSermon && <p className="text-sm opacity-70">Última atualização: {new Date(currentSermon.updatedAt).toLocaleString("pt-BR")}</p>}
        </form>
      )}

      {mode === "bible" && (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass} onClick={() => setMode("list")}>Voltar</button>
            <label className={`${buttonClass} cursor-pointer`}>Importar tradução<input className="sr-only" type="file" accept=".json,.txt,application/json,text/plain" onChange={(event) => void importBible(event.target.files?.[0])} /></label>
            {bible && <><button className={buttonClass} onClick={() => setBookIndex((value) => Math.max(0, value - 1))}>Livro anterior</button><button className={buttonClass} onClick={() => setBookIndex((value) => Math.min(bible.books.length - 1, value + 1))}>Próximo livro</button></>}
          </div>
          {!bible && <div className="rounded border border-line bg-surface p-4">Importe um arquivo .json ou .txt de uma tradução bíblica cujo uso seja permitido. O conteúdo fica salvo somente neste navegador. Não há texto bíblico pré-carregado.</div>}
          {bible && <>
            <p className="text-sm opacity-80">Tradução: {bible.meta.name} · Licença: {bible.meta.license || "não informada"} · Fonte: {bible.meta.source || "não informada"}</p>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Livro" className={`${inputClass} min-w-48 flex-1`} value={bookIndex} onChange={(event) => { setBookIndex(Number(event.target.value)); setChapterIndex(0); setSelectedVerses([]); }}>
                {bible.books.map((book, index) => <option key={`${book.name}-${index}`} value={index}>{book.name}</option>)}
              </select>
              <select aria-label="Capítulo" className={inputClass} value={chapterIndex} onChange={(event) => { setChapterIndex(Number(event.target.value)); setSelectedVerses([]); }}>
                {bible.books[bookIndex].chapters.map((_, index) => <option key={index} value={index}>{index + 1}</option>)}
              </select>
            </div>
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); findBibleReference(); }}>
              <input className={inputClass} placeholder="João 3:16 ou palavra" value={bibleQuery} onChange={(event) => setBibleQuery(event.target.value)} />
              <button className="rounded bg-accent px-4 py-2 text-white">Buscar</button>
            </form>
            <div className="flex flex-wrap gap-2">
              <button className={buttonClass} disabled={!selectedVerses.length} onClick={() => useSelectedVerses()}>Usar no sermão</button>
              <button className={buttonClass} disabled={!selectedVerses.length} onClick={() => copyText(`${selectedText} (${selectedReference})`)}>Copiar seleção</button>
            </div>
            <h2 className="font-serif text-2xl">{bible.books[bookIndex].name} {chapterIndex + 1}</h2>
            <div className="space-y-1">
              {chapter.map((verse, index) => {
                if (!verse) return null;
                const key = `${bookIndex}|${chapterIndex}|${index}`;
                const mark = marks[key] ?? {};
                const selected = selectedVerses.includes(index);
                return (
                  <div key={index} className={`rounded border p-2 ${selected ? "border-accent" : "border-transparent"} ${mark.color === 1 ? "bg-amber-100 text-slate-900" : mark.color === 2 ? "bg-green-100 text-slate-900" : mark.color === 3 ? "bg-blue-100 text-slate-900" : ""}`}>
                    <button className="text-left" onClick={() => setSelectedVerses((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index].sort((a, b) => a - b))}>
                      <sup className="mr-2 opacity-70">{index + 1}</sup>{verse}{mark.favorite ? " ★" : ""}
                    </button>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <button className={buttonClass} onClick={() => setMark(index, { favorite: !mark.favorite })}>{mark.favorite ? "Desfavoritar" : "Favoritar"}</button>
                      <button className={buttonClass} onClick={() => setMark(index, { color: ((mark.color ?? 0) + 1) % 4 })}>Cor</button>
                      <button className={buttonClass} onClick={() => { const note = window.prompt("Nota para este versículo:", mark.note ?? ""); if (note !== null) setMark(index, { note }); }}>Nota</button>
                    </div>
                    {mark.note && <p className="mt-1 text-sm">Nota: {mark.note}</p>}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button className={buttonClass} disabled={chapterIndex === 0 && bookIndex === 0} onClick={() => {
                if (chapterIndex > 0) setChapterIndex(chapterIndex - 1);
                else if (bookIndex > 0) { const nextBook = bookIndex - 1; setBookIndex(nextBook); setChapterIndex(bible.books[nextBook].chapters.length - 1); }
                setSelectedVerses([]);
              }}>Capítulo anterior</button>
              <button className={buttonClass} disabled={chapterIndex === bible.books[bookIndex].chapters.length - 1 && bookIndex === bible.books.length - 1} onClick={() => {
                if (chapterIndex < bible.books[bookIndex].chapters.length - 1) setChapterIndex(chapterIndex + 1);
                else if (bookIndex < bible.books.length - 1) { setBookIndex(bookIndex + 1); setChapterIndex(0); }
                setSelectedVerses([]);
              }}>Próximo capítulo</button>
            </div>
          </>}
        </section>
      )}

      {mode === "assistant" && (
        <section className="space-y-3">
          <button className={buttonClass} onClick={() => setMode("list")}>Voltar</button>
          <h2 className="font-serif text-2xl">Assistente de esboço</h2>
          <p className="rounded border border-line bg-surface p-3 text-sm">A geração envia o tema, o público e as observações ao provedor de IA configurado no servidor. Não inclua dados pessoais ou confidenciais. Confira referências e informações antes de usar.</p>
          <label className="flex items-start gap-2 rounded border border-line bg-surface p-3 text-sm">
            <input type="checkbox" className="mt-1" checked={aiConsent} onChange={(event) => void updateAIConsent(event.target.checked)} />
            <span>Concordo em enviar os dados deste pedido ao provedor de IA configurado. Posso retirar o consentimento a qualquer momento.</span>
          </label>
          <form ref={assistantFormRef} className="space-y-3" onSubmit={(event) => { event.preventDefault(); generateAssistantPrompt(new FormData(event.currentTarget)); }}>
            <label className="block">Texto bíblico<input name="reference" className={inputClass} /></label>
            <label className="block">Tema<input name="theme" className={inputClass} /></label>
            <label className="block">Público-alvo<input name="audience" className={inputClass} /></label>
            <label className="block">Tempo disponível (minutos)<input name="duration" type="number" className={inputClass} min={1} max={600} defaultValue={30} /></label>
            <div className="flex flex-wrap gap-2">
              <button className="rounded bg-accent px-4 py-2 text-white">Preparar pedido externo</button>
              <button type="button" disabled={!aiConsent || aiBusy} className="rounded bg-accent px-4 py-2 text-white disabled:opacity-60" onClick={() => {
                if (assistantFormRef.current?.reportValidity()) void generateConfiguredOutline(new FormData(assistantFormRef.current));
              }}>{aiBusy ? "Gerando..." : "Gerar com IA configurada"}</button>
            </div>
          </form>
          {assistantPrompt && <label className="block">Pedido pronto<textarea className={inputClass} rows={12} readOnly value={assistantPrompt} /><button type="button" className={`${buttonClass} mt-2`} onClick={() => copyText(assistantPrompt)}>Copiar pedido</button></label>}
          <label className="block">Cole aqui a resposta externa<textarea className={inputClass} rows={10} value={assistantReply} onChange={(event) => setAssistantReply(event.target.value)} /></label>
          <button type="button" className="rounded bg-accent px-4 py-2 text-white" onClick={() => void importAssistantReply()}>Importar esboço como sermão</button>
        </section>
      )}

      {mode === "holyrics" && (
        <section className="space-y-3">
          <button type="button" className={buttonClass} onClick={() => setMode("list")}>Voltar</button>
          <h2 className="font-serif text-2xl">Integração com Holyrics</h2>
          <p className="rounded border border-line bg-surface p-3 text-sm">O token/chave fica criptografado no servidor e nunca é devolvido à interface. Para uso com o conector local, informe o endereço do conector e a chave configurada nele.</p>
          <form className="space-y-3" onSubmit={(event) => void saveHolyricsConfig(event)}>
            <label className="block">Modo de conexão
              <select className={inputClass} value={holyricsConfig.mode} onChange={(event) => setHolyricsConfig((current) => ({ ...current, mode: event.target.value as "direct" | "connector" }))}>
                <option value="direct">Direto para a API Holyrics</option>
                <option value="connector">Conector local (recomendado)</option>
              </select>
            </label>
            {holyricsConfig.mode === "direct" ? <>
              <label className="block">Host ou endereço IP<input className={inputClass} required maxLength={255} value={holyricsConfig.host} onChange={(event) => setHolyricsConfig((current) => ({ ...current, host: event.target.value }))} placeholder="127.0.0.1" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">Porta<input className={inputClass} required type="number" min={1} max={65535} value={holyricsConfig.port} onChange={(event) => setHolyricsConfig((current) => ({ ...current, port: Number(event.target.value) }))} /></label>
                <label className="block">Caminho da API<input className={inputClass} required maxLength={200} value={holyricsConfig.pathPrefix} onChange={(event) => setHolyricsConfig((current) => ({ ...current, pathPrefix: event.target.value }))} /></label>
              </div>
            </> : <label className="block">URL do conector<input className={inputClass} required type="url" maxLength={500} value={holyricsConfig.connectorUrl} onChange={(event) => setHolyricsConfig((current) => ({ ...current, connectorUrl: event.target.value }))} placeholder="http://127.0.0.1:3939" /></label>}
            <label className="block">{holyricsConfig.mode === "direct" ? "Token da API Holyrics" : "Chave do conector"}
              <input className={inputClass} type="password" autoComplete="new-password" minLength={holyricsConfig.mode === "connector" ? 16 : 1} value={holyricsConfig.secret} onChange={(event) => setHolyricsConfig((current) => ({ ...current, secret: event.target.value }))} placeholder={holyricsConfig.hasSecret ? "Configurado; deixe vazio para manter" : "Obrigatório"} />
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={holyricsConfig.enabled} onChange={(event) => setHolyricsConfig((current) => ({ ...current, enabled: event.target.checked }))} /> Integração ativa</label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={holyricsBusy} className="rounded bg-accent px-4 py-2 text-white disabled:opacity-60">{holyricsBusy ? "Salvando..." : "Salvar configuração"}</button>
              <button type="button" disabled={holyricsBusy || !holyricsConfig.hasSecret} className={buttonClass} onClick={() => void runHolyricsAction("test")}>Testar conexão</button>
            </div>
          </form>
          {holyricsMessage && <p role="status" className="text-sm">{holyricsMessage}</p>}
        </section>
      )}

      {presentation && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black p-3 text-white sm:p-6" role="dialog" aria-modal="true" aria-label="Apresentação do sermão">
          <div className="flex flex-1 flex-col items-center justify-center overflow-auto text-center">
            {!blankScreen && <>
              <div className="max-w-5xl whitespace-pre-wrap font-serif text-3xl font-semibold leading-snug sm:text-5xl">{slides[slide]?.heading}</div>
              <p className="mt-4 text-xl opacity-80">{slides[slide]?.subtitle}</p>
              {showPrivateNotes && slides[slide]?.note && <p className="mt-6 max-w-3xl rounded border border-amber-300 p-4 text-lg text-amber-200">{slides[slide].note}</p>}
            </>}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/20 pt-3">
            <button className={buttonClass} onClick={() => setSlide((value) => Math.max(0, value - 1))}>Anterior</button>
            <button className={buttonClass} onClick={() => setSlide((value) => Math.min(slideCount - 1, value + 1))}>Próximo</button>
            <button className={buttonClass} onClick={() => setBlankScreen((value) => !value)}>{blankScreen ? "Mostrar" : "Ocultar tela"}</button>
            <button className={buttonClass} onClick={() => setShowPrivateNotes((value) => !value)}>{showPrivateNotes ? "Ocultar notas" : "Mostrar notas privadas"}</button>
            <span className="px-2">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} · {slide + 1}/{slideCount}</span>
            <button className={buttonClass} onClick={() => setPresentation(false)}>Sair</button>
          </div>
        </div>
      )}
    </>
  );
}
