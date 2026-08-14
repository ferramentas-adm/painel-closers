import { z } from "zod";

export const authSchema = z.object({
  action: z.enum(["register", "login"]),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(4).max(200),
});

export const statusUpdateSchema = z.object({
  status: z.enum(["livre", "ocupado"]),
});

export const statusDeleteSchema = z.object({
  all: z.literal(true).optional(),
});
