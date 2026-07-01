"use client";

import { X } from "lucide-react";
import { toast } from "sonner";

import type { AssociatedServiceDTO } from "@/lib/workspace/professional-service-service";
import { useUnassociateService } from "@/hooks/services/use-professional-services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServicePrice } from "@/components/services/service-price";
import { ProfessionalCustomPriceControl } from "@/components/professionals/professional-custom-price-control";

export function ProfessionalServiceItem({
  membershipId,
  service,
  canManage,
}: {
  membershipId: string;
  service: AssociatedServiceDTO;
  canManage: boolean;
}) {
  const unassociate = useUnassociateService(membershipId);

  async function handleRemove() {
    try {
      await unassociate.mutateAsync(service.serviceId);
      toast.success("Serviço removido.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível remover."
      );
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-background p-3 ring-1 ring-border">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {service.name}
          </span>
          {service.serviceStatus === "INACTIVE" && (
            <Badge className="border-border bg-muted text-muted-foreground">
              Inativo
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ServicePrice
            value={service.effectivePrice}
            className="font-mono text-sm font-semibold text-foreground"
          />
          {canManage && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={handleRemove}
              disabled={unassociate.isPending}
              aria-label={`Remover ${service.name}`}
            >
              <X />
            </Button>
          )}
        </div>
      </div>

      {canManage && (
        <ProfessionalCustomPriceControl
          membershipId={membershipId}
          service={service}
        />
      )}
    </div>
  );
}
