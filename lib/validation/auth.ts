import * as z from "zod";

export const SignUpSchema = z.object({
  firstName: z.string().trim().min(1, { error: "O nome é obrigatório." }),
  lastName: z.string().trim().min(1, { error: "O sobrenome é obrigatório." }),
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  password: z
    .string()
    .min(8, { error: "A senha deve ter pelo menos 8 caracteres." })
    .regex(/[a-zA-Z]/, { error: "A senha deve conter pelo menos uma letra." })
    .regex(/[0-9]/, { error: "A senha deve conter pelo menos um número." }),
});

export const LoginSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  password: z.string().min(1, { error: "A senha é obrigatória." }),
});
