"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { MemberDTO } from "@/lib/workspace/member-service";
import type { UpdateMemberInput } from "@/lib/validation/professional";
import { apiRequest } from "@/lib/api-request";

export const MEMBERS_KEY = ["members"] as const;

export function useMembers(initialData?: MemberDTO[]) {
  return useQuery({
    queryKey: MEMBERS_KEY,
    queryFn: () =>
      apiRequest<{ members: MemberDTO[] }>("/api/workspace/members").then(
        (data) => data.members
      ),
    initialData,
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      data,
    }: {
      membershipId: string;
      data: UpdateMemberInput;
    }) =>
      apiRequest<{ member: MemberDTO }>(
        `/api/workspace/members/${membershipId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ).then((result) => result.member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    },
  });
}
