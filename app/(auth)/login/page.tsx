import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>;
}) {
  const { verified } = await searchParams;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden p-6 py-12">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-48 bg-[image:var(--gradient-primary)]"
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-lg ring-1 ring-border">
        <div className="h-1.5 w-full bg-[image:var(--gradient-primary)]" />
        <Card className="rounded-none border-0 ring-0">
          <CardHeader className="px-8 pt-8">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Agenda Pro para empresas
            </span>
            <CardTitle className="font-display text-2xl">Entrar</CardTitle>
            <CardDescription>
              Bem-vindo de volta. Entre para gerenciar seus agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-8 pb-8">
            {verified === "success" && (
              <div className="rounded-lg bg-success-bg px-3 py-2 text-sm text-success-fg">
                Seu e-mail foi verificado. Entre para continuar.
              </div>
            )}
            {verified === "error" && (
              <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-fg">
                Esse link de verificação é inválido ou expirou.
              </div>
            )}
            <LoginForm>
              <GoogleSignInButton />
            </LoginForm>
          </CardContent>
        </Card>
      </div>

      <p className="relative z-10 text-sm text-muted-foreground">
        Não tem uma conta?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>
    </main>
  );
}
