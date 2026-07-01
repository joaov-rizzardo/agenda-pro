"use client";

import { Clock, Pencil } from "lucide-react";

import type { ServiceDTO } from "@/lib/workspace/service-catalog-service";
import { SERVICE_STATUS_LABELS } from "@/lib/workspace/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServicePrice } from "@/components/services/service-price";
import { ServiceStatusToggle } from "@/components/services/service-status-toggle";

function StatusBadge({ service }: { service: ServiceDTO }) {
  return (
    <Badge
      className={
        service.status === "ACTIVE"
          ? "border-success-fg/20 bg-success-bg text-success-fg"
          : "border-border bg-muted text-muted-foreground"
      }
    >
      {SERVICE_STATUS_LABELS[service.status]}
    </Badge>
  );
}

export function ServiceListItem({
  service,
  canManage,
  onEdit,
}: {
  service: ServiceDTO;
  canManage: boolean;
  onEdit: (service: ServiceDTO) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-display font-semibold text-foreground">
              {service.name}
            </span>
            {service.description && (
              <span className="truncate text-sm text-muted-foreground">
                {service.description}
              </span>
            )}
          </div>
          {/* Status badge shows inline on mobile; controls move to the action row. */}
          {!canManage && (
            <div className="md:hidden">
              <StatusBadge service={service} />
            </div>
          )}
        </div>

        {/* Data strip — mono treatment reads the catalog like a price list. */}
        <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {service.durationMinutes} min
          </span>
          <span aria-hidden>·</span>
          <ServicePrice
            value={service.defaultPrice}
            className="text-sm font-semibold text-foreground"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        {canManage ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(service)}
            >
              <Pencil />
              Editar
            </Button>
            <ServiceStatusToggle service={service} />
          </>
        ) : (
          <div className="hidden md:block">
            <StatusBadge service={service} />
          </div>
        )}
      </div>
    </div>
  );
}
