import { NextRequest, NextResponse } from "next/server";

import { requireWorkspaceRole } from "@/lib/workspace/authorization";
import { errorResponse, resolveTenant } from "@/lib/workspace/api-context";
import { prisma } from "@/lib/prisma";
import { uploadAvatar } from "@/lib/supabase/storage";
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_BYTES,
} from "@/lib/validation/professional";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { membershipId } = await params;
    const { userId, workspaceId } = await resolveTenant();
    const caller = await requireWorkspaceRole(userId, workspaceId, [
      "OWNER",
      "ADMIN",
      "MEMBER",
    ]);

    // Re-scope the target membership to the active workspace (Constitution I).
    const target = await prisma.workspaceMembership.findUnique({
      where: { id: membershipId },
      select: { userId: true, workspaceId: true },
    });

    if (!target || target.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Profissional não encontrado." },
        { status: 404 }
      );
    }

    const isSelf = target.userId === userId;
    const isManager = caller.role === "OWNER" || caller.role === "ADMIN";
    if (!isSelf && !isManager) {
      return NextResponse.json(
        { error: "Você não tem permissão para alterar esta foto." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Selecione um arquivo de imagem." },
        { status: 422 }
      );
    }

    if (
      !ALLOWED_AVATAR_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_AVATAR_MIME_TYPES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Formato inválido. Envie uma imagem JPEG ou PNG." },
        { status: 422 }
      );
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "A imagem deve ter no máximo 5 MB." },
        { status: 422 }
      );
    }

    const image = await uploadAvatar(target.userId, file);

    await prisma.user.update({
      where: { id: target.userId },
      data: { image },
    });

    return NextResponse.json({ image });
  } catch (error) {
    return errorResponse(error);
  }
}
