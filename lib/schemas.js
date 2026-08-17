import { z } from "zod";

export const authSchema = z
  .object({
    action: z.enum(["register", "login"]),
    email: z.string().trim().email().max(120),
    password: z.string().min(4).max(200),
    mesa: z.string().trim().min(1).max(20).optional(),
  })
  .refine((data) => data.action !== "register" || !!data.mesa, {
    message: "mesa obrigatoria para cadastro",
    path: ["mesa"],
  });

export const statusUpdateSchema = z.object({
  status: z.enum(["livre", "ocupado"]),
});

export const statusDeleteSchema = z.object({
  all: z.literal(true).optional(),
});

export const alertaSchema = z.object({
  active: z.boolean(),
});

export const alertaClearSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const colaboradorUpdateSchema = z.object({
  id: z.number().int().positive(),
  mesa: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
});

export const colaboradorDeleteSchema = z.object({
  id: z.number().int().positive(),
});

export const resetSenhaSchema = z.object({
  id: z.number().int().positive(),
  novaSenha: z.string().min(4).max(200),
});

export const priorityUpdateSchema = z.object({
  names: z.array(z.string().trim().min(1).max(80)).max(100),
});
