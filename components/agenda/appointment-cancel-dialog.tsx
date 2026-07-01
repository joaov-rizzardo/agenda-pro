"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useCancelAppointment } from "@/hooks/agenda/use-appointments";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AppointmentCancelDialog({
  appointmentId,
  open,
  onOpenChange,
}: {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cancelAppointment = useCancelAppointment();
  const [reason, setReason] = useState("");

  // Clear the reason each time the dialog opens (adjust-state-during-render).
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setReason("");
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  async function handleConfirm() {
    if (!appointmentId) {
      return;
    }
    try {
      const trimmed = reason.trim();
      await cancelAppointment.mutateAsync({
        appointmentId,
        reason: trimmed.length > 0 ? trimmed : null,
      });
      toast.success("Agendamento cancelado.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar o agendamento."
      );
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-display">
            Cancelar agendamento
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação libera o horário para novos agendamentos. Você pode
            registrar um motivo (opcional).
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ex.: cliente remarcou por telefone"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={cancelAppointment.isPending}
            onClick={handleConfirm}
          >
            {cancelAppointment.isPending ? "Cancelando…" : "Cancelar agendamento"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
