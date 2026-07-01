"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  AppointmentDTO,
  AppointmentEventDTO,
  ListAppointmentsResult,
} from "@/lib/workspace/appointment-service";
import type {
  CreateAppointmentInput,
  RescheduleAppointmentInput,
} from "@/lib/validation/appointment";
import { apiRequest } from "@/lib/api-request";

const APPOINTMENT_DETAIL_ROOT_KEY = ["appointment"] as const;

export const APPOINTMENTS_ROOT_KEY = ["appointments"] as const;

export function appointmentsKey(
  professionalId: string | undefined,
  date: string,
  includeCancelled: boolean
) {
  return [
    "appointments",
    professionalId ?? "self",
    date,
    includeCancelled,
  ] as const;
}

export function appointmentDetailKey(appointmentId: string | null) {
  return ["appointment", appointmentId] as const;
}

export function useAppointments(
  params: {
    professionalId?: string;
    date: string;
    includeCancelled?: boolean;
  },
  initialData?: ListAppointmentsResult
) {
  const { professionalId, date, includeCancelled = false } = params;

  return useQuery({
    queryKey: appointmentsKey(professionalId, date, includeCancelled),
    queryFn: () => {
      const search = new URLSearchParams();
      if (professionalId) {
        search.set("professionalId", professionalId);
      }
      search.set("date", date);
      if (includeCancelled) {
        search.set("includeCancelled", "true");
      }
      return apiRequest<ListAppointmentsResult>(
        `/api/workspace/appointments?${search.toString()}`
      );
    },
    initialData,
  });
}

export function useAppointmentDetail(appointmentId: string | null) {
  return useQuery({
    queryKey: appointmentDetailKey(appointmentId),
    queryFn: () =>
      apiRequest<{ appointment: AppointmentDTO; events: AppointmentEventDTO[] }>(
        `/api/workspace/appointments/${appointmentId}`
      ),
    enabled: appointmentId !== null,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentInput) =>
      apiRequest<{ appointment: AppointmentDTO }>(
        "/api/workspace/appointments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ).then((result) => result.appointment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_ROOT_KEY });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      data,
    }: {
      appointmentId: string;
      data: RescheduleAppointmentInput;
    }) =>
      apiRequest<{ appointment: AppointmentDTO }>(
        `/api/workspace/appointments/${appointmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ).then((result) => result.appointment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_ROOT_KEY });
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_DETAIL_ROOT_KEY });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      reason,
    }: {
      appointmentId: string;
      reason?: string | null;
    }) =>
      apiRequest<{ appointment: AppointmentDTO }>(
        `/api/workspace/appointments/${appointmentId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason ?? null }),
        }
      ).then((result) => result.appointment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_ROOT_KEY });
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_DETAIL_ROOT_KEY });
    },
  });
}

export function useSetAppointmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      appointmentId,
      status,
    }: {
      appointmentId: string;
      status: "COMPLETED" | "NO_SHOW";
    }) =>
      apiRequest<{ appointment: AppointmentDTO }>(
        `/api/workspace/appointments/${appointmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      ).then((result) => result.appointment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPOINTMENTS_ROOT_KEY });
      queryClient.invalidateQueries({ queryKey: APPOINTMENT_DETAIL_ROOT_KEY });
    },
  });
}
