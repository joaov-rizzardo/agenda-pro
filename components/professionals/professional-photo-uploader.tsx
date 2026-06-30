"use client";

import { useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { MemberDTO } from "@/lib/workspace/member-service";
import { useUploadMemberPhoto } from "@/hooks/professionals/use-upload-member-photo";
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
} from "@/lib/validation/professional";
import { ProfessionalAvatar } from "@/components/professionals/professional-avatar";

export function ProfessionalPhotoUploader({ member }: { member: MemberDTO }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadMemberPhoto();

  function handlePick() {
    inputRef.current?.click();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    // Client-side pre-validation for immediate feedback (server re-validates).
    if (
      !ALLOWED_AVATAR_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number]
      )
    ) {
      toast.error("Formato inválido. Envie uma imagem JPEG ou PNG.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("A imagem deve ter no máximo 5 MB.");
      return;
    }

    try {
      await uploadPhoto.mutateAsync({
        membershipId: member.membershipId,
        file,
      });
      toast.success("Foto atualizada.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível enviar a foto."
      );
    }
  }

  return (
    <button
      type="button"
      onClick={handlePick}
      disabled={uploadPhoto.isPending}
      className="group relative size-10 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      aria-label={`Alterar foto de ${member.firstName} ${member.lastName}`}
    >
      <ProfessionalAvatar
        firstName={member.firstName}
        lastName={member.lastName}
        image={member.image}
      />
      {uploadPhoto.isPending ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 text-background">
          <Loader2 className="size-4 animate-spin" />
        </span>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/50 text-background opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="size-4" />
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleChange}
      />
    </button>
  );
}
