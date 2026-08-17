import { z } from "zod";

export const authSchema = z
  .object({
    action: z.enum(["register", "login"]),
    name: z.string().trim().min(1).max(80),
    password: z.string().min(4).max(200),
    mesa: z.string().trim().min(1).max(20).optional(),
    email: z.string().trim().email().max(120).optional().or(z.literal("")),
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
