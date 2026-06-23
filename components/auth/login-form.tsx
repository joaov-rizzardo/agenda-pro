"use client";

import { useActionState } from "react";

import { logIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ children }: { children?: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(logIn, undefined);

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-4">
        {state?.error && (
          <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-fg">
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? "Entrando…" : "Entrar"}
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
