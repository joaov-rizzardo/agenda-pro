"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useServices } from "@/hooks/services/use-services";
import {
  useAssociateService,
  useProfessionalServices,
} from "@/hooks/services/use-professional-services";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProfessionalServiceSelector({
  membershipId,
}: {
  membershipId: string;
}) {
  const { data: catalog = [] } = useServices();
  const { data: associated = [] } = useProfessionalServices(membershipId);
  const associate = useAssociateService(membershipId);
  const [value, setValue] = useState("");

  // Only ACTIVE catalog services not already associated to this professional.
  const available = useMemo(() => {
    const taken = new Set(associated.map((item) => item.serviceId));
    return catalog.filter(
      (service) => service.status === "ACTIVE" && !taken.has(service.serviceId)
    );
  }, [catalog, associated]);

  async function handleSelect(serviceId: string) {
    setValue(serviceId);
    try {
      await associate.mutateAsync(serviceId);
      toast.success("Serviço associado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível associar."
      );
    } finally {
      // Reset so the trigger returns to the placeholder for the next add.
      setValue("");
    }
  }

  return (
    <Select
      value={value}
      onValueChange={handleSelect}
      disabled={available.length === 0 || associate.isPending}
    >
      <SelectTrigger className="w-full sm:w-64" size="sm">
        <SelectValue
          placeholder={
            available.length === 0
              ? "Nenhum serviço disponível"
              : "Adicionar serviço"
          }
        />
      </SelectTrigger>
      <SelectContent>
        {available.map((service) => (
          <SelectItem key={service.serviceId} value={service.serviceId}>
            {service.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
