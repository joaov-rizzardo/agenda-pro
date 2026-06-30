"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import type { WorkspaceRole } from "@/generated/prisma/client";
import { useCreateInvite } from "@/hooks/professionals/use-invites";
import { ROLE_LABELS } from "@/lib/workspace/labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InviteProfessionalDialog({
  callerRole,
}: {
  callerRole: WorkspaceRole;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<WorkspaceRole>("MEMBER");
  const createInvite = useCreateInvite();

  const canInviteElevated = callerRole === "OWNER";

  async function handleSubmit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const jobTitle = String(formData.get("jobTitle") ?? "").trim();

    try {
      await createInvite.mutateAsync({
        email,
        role,
        name: name || undefined,
        jobTitle: jobTitle || undefined,
      });
      toast.success("Convite enviado.");
      setOpen(false);
      setRole("MEMBER");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível enviar o convite."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Convidar profissional
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Convidar profissional
          </DialogTitle>
          <DialogDescription>
            Enviaremos um convite por e-mail para entrar no workspace.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-name">Nome (opcional)</Label>
            <Input id="invite-name" name="name" autoComplete="off" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              autoComplete="off"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-job-title">Cargo (opcional)</Label>
            <Input id="invite-job-title" name="jobTitle" autoComplete="off" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Nível de acesso</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as WorkspaceRole)}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MEMBER">{ROLE_LABELS.MEMBER}</SelectItem>
                <SelectItem value="ADMIN" disabled={!canInviteElevated}>
                  {ROLE_LABELS.ADMIN}
                </SelectItem>
                <SelectItem value="OWNER" disabled={!canInviteElevated}>
                  {ROLE_LABELS.OWNER}
                </SelectItem>
              </SelectContent>
            </Select>
            {!canInviteElevated && (
              <p className="text-xs text-muted-foreground">
                Apenas o proprietário pode convidar administradores ou
                proprietários.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createInvite.isPending}>
              {createInvite.isPending ? "Enviando…" : "Enviar convite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
