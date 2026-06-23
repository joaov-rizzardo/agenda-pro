"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";

import { signUp } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm({ children }: { children?: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(signUp, undefined);

  if (state && "success" in state) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-success-bg">
          <Mail className="size-6 text-success-fg" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Verifique seu e-mail
        </h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de verificação para confirmar seu endereço. Clique
          nele para ativar sua conta e depois volte para entrar.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <a href="/login">Voltar para o login</a>
        </Button>
      </div>
    );
  }

  const errors = state && "errors" in state ? state.errors : undefined;

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">Nome</Label>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              aria-invalid={!!errors?.firstName}
              required
            />
            {errors?.firstName && (
              <p className="text-xs text-destructive">
                {errors.firstName[0]}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Sobrenome</Label>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              aria-invalid={!!errors?.lastName}
              required
            />
            {errors?.lastName && (
              <p className="text-xs text-destructive">{errors.lastName[0]}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors?.email}
            required
          />
          {errors?.email && (
            <p className="text-xs text-destructive">{errors.email[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors?.password}
            required
          />
          {errors?.password && (
            <p className="text-xs text-destructive">{errors.password[0]}</p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>

      {children && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {children}
        </>
      )}
    </div>
  );
}
