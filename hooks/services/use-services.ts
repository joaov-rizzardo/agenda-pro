"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { ServiceDTO } from "@/lib/workspace/service-catalog-service";
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from "@/lib/validation/service";
import { apiRequest } from "@/lib/api-request";

export const SERVICES_KEY = ["services"] as const;

export function useServices(initialData?: ServiceDTO[]) {
  return useQuery({
    queryKey: SERVICES_KEY,
    queryFn: () =>
      apiRequest<{ services: ServiceDTO[] }>("/api/workspace/services").then(
        (data) => data.services
      ),
    initialData,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceInput) =>
      apiRequest<{ service: ServiceDTO }>("/api/workspace/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((result) => result.service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      serviceId,
      data,
    }: {
      serviceId: string;
      data: UpdateServiceInput;
    }) =>
      apiRequest<{ service: ServiceDTO }>(
        `/api/workspace/services/${serviceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ).then((result) => result.service),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
    },
  });
}
