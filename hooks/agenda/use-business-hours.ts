"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { BusinessHoursDTO } from "@/lib/workspace/business-hours-service";
import type { UpsertBusinessHoursInput } from "@/lib/validation/business-hours";
import { apiRequest } from "@/lib/api-request";

export const BUSINESS_HOURS_KEY = ["business-hours"] as const;

export function useBusinessHours(initialData?: BusinessHoursDTO) {
  return useQuery({
    queryKey: BUSINESS_HOURS_KEY,
    queryFn: () =>
      apiRequest<{ businessHours: BusinessHoursDTO }>(
        "/api/workspace/business-hours"
      ).then((data) => data.businessHours),
    initialData,
  });
}

export function useUpdateBusinessHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertBusinessHoursInput) =>
      apiRequest<{ businessHours: BusinessHoursDTO }>(
        "/api/workspace/business-hours",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ).then((result) => result.businessHours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_HOURS_KEY });
    },
  });
}
