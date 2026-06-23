import { getResendClient } from "@/lib/email/resend";

export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  await getResendClient().emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Verifique sua conta do Agenda Pro",
    html: `<p>Bem-vindo ao Agenda Pro! Clique no link abaixo para verificar seu endereço de e-mail:</p><p><a href="${verificationUrl}">Verificar meu e-mail</a></p><p>Este link expira em 24 horas.</p>`,
  });
}
