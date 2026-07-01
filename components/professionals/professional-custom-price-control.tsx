"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { AssociatedServiceDTO } from "@/lib/workspace/professional-service-service";
import { useSetCustomPrice } from "@/hooks/services/use-professional-services";
import { formatBRL, parseBRLPrice } from "@/components/services/service-price";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

function toInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

export function ProfessionalCustomPriceControl({
  membershipId,
  service,
}: {
  membershipId: string;
  service: AssociatedServiceDTO;
}) {
  const setCustomPrice = useSetCustomPrice(membershipId);
  const [value, setValue] = useState(
    service.customPrice != null ? toInput(service.customPrice) : ""
  );

  // Keep the input in sync with the server value (incl. revert clearing it),
  // using the "adjust state during render" pattern (no effect — React docs).
  const [prevCustom, setPrevCustom] = useState(service.customPrice);
  if (service.customPrice !== prevCustom) {
    setPrevCustom(service.customPrice);
    setValue(service.customPrice != null ? toInput(service.customPrice) : "");
  }

  async function handleToggle(checked: boolean) {
    try {
      if (checked) {
        // Enable starting from the current effective price.
        await setCustomPrice.mutateAsync({
          serviceId: service.serviceId,
          data: {
            useCustomPrice: true,
            customPrice: service.customPrice ?? service.defaultPrice,
          },
        });
        toast.success("Preço personalizado ativado.");
      } else {
        await setCustomPrice.mutateAsync({
          serviceId: service.serviceId,
          data: { useCustomPrice: false },
        });
        toast.success("Preço padrão restaurado.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar."
      );
    }
  }

  async function commitValue() {
    const parsed = parseBRLPrice(value);
    if (parsed === null) {
      toast.error("Informe um preço válido (ex.: 45,00).");
      setValue(service.customPrice != null ? toInput(service.customPrice) : "");
      return;
    }
    if (parsed === service.customPrice) return;

    try {
      await setCustomPrice.mutateAsync({
        serviceId: service.serviceId,
        data: { useCustomPrice: true, customPrice: parsed },
      });
      toast.success("Preço atualizado.");
    } catch (error) {
      setValue(service.customPrice != null ? toInput(service.customPrice) : "");
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar."
      );
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-2">
      <label className="flex items-center gap-2">
        <Switch
          checked={service.useCustomPrice}
          onCheckedChange={handleToggle}
          disabled={setCustomPrice.isPending}
          aria-label="Usar preço personalizado"
        />
        <span className="text-xs text-muted-foreground">
          Preço personalizado
        </span>
      </label>

      {service.useCustomPrice ? (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-muted-foreground">R$</span>
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={commitValue}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Preço personalizado"
            className="h-7 w-24"
          />
        </div>
      ) : (
        <span className="font-mono text-xs text-muted-foreground">
          Padrão: {formatBRL(service.defaultPrice)}
        </span>
      )}
    </div>
  );
}
