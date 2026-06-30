"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { InviteDTO } from "@/lib/workspace/invite-service";
import type { CreateInviteInput } from "@/lib/validation/professional";
import { apiRequest } from "@/lib/api-request";

export const INVITES_KEY = ["invites"] as const;

export function useInvites(initialData?: InviteDTO[]) {
  return useQuery({
    queryKey: INVITES_KEY,
    queryFn: () =>
      apiRequest<{ invites: InviteDTO[] }>("/api/workspace/invites").then(
        (data) => data.invites
      ),
    initialData,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInviteInput) =>
      apiRequest<{ invite: InviteDTO }>("/api/workspace/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }).then((data) => data.invite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVITES_KEY });
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      apiRequest<{ invite: InviteDTO }>(
        `/api/workspace/invites/${inviteId}`,
        { method: "POST" }
      ).then((data) => data.invite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVITES_KEY });
    },
  });
}

export function useCancelInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteId: string) =>
      apiRequest<{ ok: true }>(`/api/workspace/invites/${inviteId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVITES_KEY });
    },
  });
}
