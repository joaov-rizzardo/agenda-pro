"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { ServiceDTO } from "@/lib/workspace/service-catalog-service";
import {
  useCreateService,
  useUpdateService,
} from "@/hooks/services/use-services";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseBRLPrice } from "@/components/services/service-price";

type FieldErrors = {
  name?: string;
  durationMinutes?: string;
  defaultPrice?: string;
};

export function ServiceFormDialog({
  service,
  open,
  onOpenChange,
}: {
  service: ServiceDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = service !== null;
  const createService = useCreateService();
  const updateService = useUpdateService();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  // Reset the form to the target service each time the dialog opens, using the
  // "adjust state during render" pattern (no effect — React docs).
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    setWasOpen(true);
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setDuration(service ? String(service.durationMinutes) : "");
    setPrice(service ? service.defaultPrice.toFixed(2).replace(".", ",") : "");
    setErrors({});
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const isPending = createService.isPending || updateService.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};

    const trimmedName = name.trim();
    if (trimmedName === "") {
      nextErrors.name = "Informe o nome do serviço.";
    }

    const durationMinutes = Number(duration);
    if (
      duration.trim() === "" ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes <= 0
    ) {
      nextErrors.durationMinutes = "Informe uma duração em minutos maior que zero.";
    }

    const defaultPrice = parseBRLPrice(price);
    if (defaultPrice === null) {
      nextErrors.defaultPrice = "Informe um preço válido (ex.: 45,00).";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const trimmedDescription = description.trim();
    const payload = {
      name: trimmedName,
      description: trimmedDescription === "" ? null : trimmedDescription,
      durationMinutes,
      defaultPrice: defaultPrice as number,
    };

    try {
      if (isEdit) {
        await updateService.mutateAsync({
          serviceId: service.serviceId,
          data: payload,
        });
        toast.success("Serviço atualizado.");
      } else {
        await createService.mutateAsync(payload);
        toast.success("Serviço criado.");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o serviço."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Editar serviço" : "Novo serviço"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do serviço do catálogo."
              : "Cadastre um serviço no catálogo do workspace."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-name">Nome</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && (
              <p className="text-xs text-danger-fg">{errors.name}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="service-description">Descrição (opcional)</Label>
            <Input
              id="service-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="service-duration">Duração (minutos)</Label>
              <Input
                id="service-duration"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                aria-invalid={errors.durationMinutes ? true : undefined}
              />
              {errors.durationMinutes && (
                <p className="text-xs text-danger-fg">
                  {errors.durationMinutes}
                </p>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="service-price">Preço padrão (R$)</Label>
              <Input
                id="service-price"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                aria-invalid={errors.defaultPrice ? true : undefined}
              />
              {errors.defaultPrice && (
                <p className="text-xs text-danger-fg">{errors.defaultPrice}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Salvando…"
                : isEdit
                  ? "Salvar alterações"
                  : "Criar serviço"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
