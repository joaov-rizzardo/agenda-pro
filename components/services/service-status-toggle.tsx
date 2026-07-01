"use client";

import { toast } from "sonner";

import type { ServiceDTO } from "@/lib/workspace/service-catalog-service";
import { useUpdateService } from "@/hooks/services/use-services";
import { SERVICE_STATUS_LABELS } from "@/lib/workspace/labels";
import { Switch } from "@/components/ui/switch";

export function ServiceStatusToggle({ service }: { service: ServiceDTO }) {
  const updateService = useUpdateService();
  const isActive = service.status === "ACTIVE";

  async function handleChange(checked: boolean) {
    try {
      await updateService.mutateAsync({
        serviceId: service.serviceId,
        data: { status: checked ? "ACTIVE" : "INACTIVE" },
      });
      toast.success(checked ? "Serviço ativado." : "Serviço desativado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível atualizar."
      );
    }
  }

  return (
    <label className="flex items-center gap-2">
      <Switch
        checked={isActive}
        onCheckedChange={handleChange}
        disabled={updateService.isPending}
        aria-label={`Status do serviço: ${SERVICE_STATUS_LABELS[service.status]}`}
      />
      <span className="text-sm text-muted-foreground">
        {SERVICE_STATUS_LABELS[service.status]}
      </span>
    </label>
  );
}
