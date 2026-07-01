"use client";

import { useProfessionalServices } from "@/hooks/services/use-professional-services";
import { ProfessionalServiceItem } from "@/components/professionals/professional-service-item";
import { ProfessionalServiceSelector } from "@/components/professionals/professional-service-selector";

export function ProfessionalServicesSection({
  membershipId,
  canManage,
}: {
  membershipId: string;
  canManage: boolean;
}) {
  const { data: services = [] } = useProfessionalServices(membershipId);

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Serviços
        </span>
        {canManage && <ProfessionalServiceSelector membershipId={membershipId} />}
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum serviço configurado.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((service) => (
            <ProfessionalServiceItem
              key={service.associationId}
              membershipId={membershipId}
              service={service}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </section>
  );
}
