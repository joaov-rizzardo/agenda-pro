"use server";

import { redirect } from "next/navigation";

import { auth, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateWorkspaceSchema } from "@/lib/validation/workspace";
import { resolveWorkspaceRoute } from "@/lib/workspace/workspace-service";

export type CreateWorkspaceState =
  | undefined
  | { errors: Partial<Record<"name" | "description", string[]>> }
  | { error: string };

const GENERIC_CREATE_WORKSPACE_ERROR =
  "Não foi possível criar o workspace agora. Tente novamente em alguns instantes.";

function redirectForDecision(
  decision: Awaited<ReturnType<typeof resolveWorkspaceRoute>>
): never {
  if (decision.type === "select-workspace") {
    redirect("/selecionar-workspace");
  }
  redirect("/dashboard");
}

export async function createWorkspace(
  _state: CreateWorkspaceState,
  formData: FormData
): Promise<CreateWorkspaceState> {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const decision = await resolveWorkspaceRoute(
    session.user.id,
    session.user.activeWorkspaceId
  );
  if (decision.type !== "onboarding") {
    redirectForDecision(decision);
  }

  const validatedFields = CreateWorkspaceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, description } = validatedFields.data;

  let workspaceId: string;
  try {
    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: { name, description, createdById: session.user.id },
      });
      await tx.workspaceMembership.create({
        data: {
          userId: session.user.id,
          workspaceId: created.id,
          role: "OWNER",
        },
      });
      return created;
    });
    workspaceId = workspace.id;
  } catch {
    return { error: GENERIC_CREATE_WORKSPACE_ERROR };
  }

  await unstable_update({ user: { activeWorkspaceId: workspaceId } });
  redirect("/dashboard");
}

export async function selectWorkspace(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const workspaceId = formData.get("workspaceId");
  if (typeof workspaceId !== "string" || !workspaceId) {
    redirect("/selecionar-workspace");
  }

  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId } },
  });
  if (!membership || membership.status !== "ACTIVE") {
    redirect("/selecionar-workspace");
  }

  await unstable_update({ user: { activeWorkspaceId: workspaceId } });
  redirect("/dashboard");
}
