import { z } from "zod";
// Mesmas regras usadas no frontend e no backend.
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(10, "A senha precisa ter ao menos 10 caracteres.").max(128),
  churchName: z.string().trim().min(2, "Informe o nome da igreja.").max(100),
});
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});
