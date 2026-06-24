"use client";

import { useActionState, useState } from "react";

import { createWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState(
    createWorkspace,
    undefined
  );
  const [name, setName] = useState("");

  const errors = state && "errors" in state ? state.errors : undefined;
  const error = state && "error" in state ? state.error : undefined;
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="flex items-center gap-3 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary-cta)] font-display text-sm font-semibold text-primary-foreground">
          {initial || "?"}
        </span>
        <div className="flex flex-col overflow-hidden">
          <span className="text-xs text-muted-foreground">
            Assim seu workspace vai aparecer
          </span>
          <span className="truncate font-display text-sm font-semibold text-foreground">
            {name.trim() || "Sua empresa"}
          </span>
        </div>
      </GlassPanel>

      <form action={formAction} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger-fg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nome do workspace</Label>
          <Input
            id="name"
            name="name"
            placeholder="Ex: Studio Bella, Clínica Vitalis"
            autoComplete="organization"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!errors?.name}
            required
          />
          {errors?.name && (
            <p className="text-xs text-destructive">{errors.name[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Input
            id="description"
            name="description"
            placeholder="O que esse workspace organiza"
            aria-invalid={!!errors?.description}
          />
          {errors?.description && (
            <p className="text-xs text-destructive">
              {errors.description[0]}
            </p>
          )}
        </div>

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? "Criando…" : "Criar workspace"}
        </Button>
      </form>
    </div>
  );
}
