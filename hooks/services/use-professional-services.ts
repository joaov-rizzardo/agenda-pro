"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { AssociatedServiceDTO } from "@/lib/workspace/professional-service-service";
import type { SetCustomPriceInput } from "@/lib/validation/service";
import { apiRequest } from "@/lib/api-request";

export const professionalServicesKey = (membershipId: string) =>
  ["professional-services", membershipId] as const;

export function useProfessionalServices(
  membershipId: string,
  initialData?: AssociatedServiceDTO[]
) {
  return useQuery({
    queryKey: professionalServicesKey(membershipId),
    queryFn: () =>
      apiRequest<{ services: AssociatedServiceDTO[] }>(
        `/api/workspace/members/${membershipId}/services`
      ).then((data) => data.services),
    initialData,
  });
}

export function useAssociateService(membershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: string) =>
      apiRequest<{ service: AssociatedServiceDTO }>(
        `/api/workspace/members/${membershipId}/services`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceId }),
        }
      ).then((result) => result.service),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: professionalServicesKey(membershipId),
      });
    },
  });
}

export function useUnassociateService(membershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId: string) =>
      apiRequest<{ success: true }>(
        `/api/workspace/members/${membershipId}/services/${serviceId}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: professionalServicesKey(membershipId),
      });
    },
  });
}

export function useSetCustomPrice(membershipId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      data,
    }: {
      serviceId: string;
      data: SetCustomPriceInput;
    }) =>
      apiRequest<{ service: AssociatedServiceDTO }>(
        `/api/workspace/members/${membershipId}/services/${serviceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ).then((result) => result.service),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: professionalServicesKey(membershipId),
      });
    },
  });
}
