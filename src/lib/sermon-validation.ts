import { z } from "zod";

export const sermonPointSchema = z.object({
  type: z.string().trim().min(1).max(40),
  text: z.string().trim().max(5000),
  note: z.string().trim().max(5000),
});

export const sermonSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(160),
  type: z.string().trim().min(1).max(60),
  date: z.string().max(10),
  author: z.string().trim().max(100),
  tags: z.string().trim().max(500),
  reference: z.string().trim().max(200),
  verse: z.string().trim().max(10000),
  duration: z.number().int().min(1).max(600),
  status: z.enum(["Rascunho", "Pronto", "Pregado", "Arquivado"]),
  points: z.array(sermonPointSchema).max(100),
  privateNotes: z.string().trim().max(20000),
});

export type SermonInput = z.infer<typeof sermonSchema>;
