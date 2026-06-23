import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { SignupForm } from "@/components/auth/signup-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
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
            <CardTitle className="font-display text-2xl">
              Crie sua conta
            </CardTitle>
            <CardDescription>
              Configure seu negócio e comece a receber agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <SignupForm>
              <GoogleSignInButton />
            </SignupForm>
          </CardContent>
        </Card>
      </div>

      <p className="relative z-10 text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
