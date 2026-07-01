"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import type { WorkspaceRole } from "@/generated/prisma/client";
import type { ServiceDTO } from "@/lib/workspace/service-catalog-service";
import { useServices } from "@/hooks/services/use-services";
import { Button } from "@/components/ui/button";
import { ServiceFormDialog } from "@/components/services/service-form-dialog";
import { ServiceListItem } from "@/components/services/service-list-item";

export function ServicesView({
  callerRole,
  initialServices,
}: {
  callerRole: WorkspaceRole;
  initialServices: ServiceDTO[];
}) {
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";
  const { data: services = [] } = useServices(initialServices);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceDTO | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(service: ServiceDTO) {
    setEditing(service);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Catálogo
          </span>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Serviços
          </h1>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus />
            Novo serviço
          </Button>
        )}
      </header>

      {services.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
          {canManage
            ? "Nenhum serviço no catálogo. Cadastre o primeiro serviço do workspace."
            : "Nenhum serviço no catálogo ainda."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((service) => (
            <ServiceListItem
              key={service.serviceId}
              service={service}
              canManage={canManage}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {canManage && (
        <ServiceFormDialog
          service={editing}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
