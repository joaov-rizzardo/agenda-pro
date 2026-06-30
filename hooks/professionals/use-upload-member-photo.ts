"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/api-request";
import { MEMBERS_KEY } from "@/hooks/professionals/use-members";

export function useUploadMemberPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      file,
    }: {
      membershipId: string;
      file: File;
    }) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest<{ image: string }>(
        `/api/workspace/members/${membershipId}/photo`,
        { method: "POST", body: formData }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
    },
  });
}
