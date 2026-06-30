import { randomBytes, createHash } from "crypto";

import type { InviteStatus, WorkspaceRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email/send-invite-email";
import { WorkspaceAuthError } from "@/lib/workspace/authorization";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InviteDTO = {
  id: string;
  email: string;
  name: string | null;
  role: WorkspaceRole;
  jobTitle: string | null;
  status: InviteStatus;
  expiresAt: string;
  createdAt: string;
};

type InviteRow = {
  id: string;
  email: string;
  name: string | null;
  role: WorkspaceRole;
  jobTitle: string | null;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function toDTO(invite: InviteRow): InviteDTO {
  return {
    id: invite.id,
    email: invite.email,
    name: invite.name,
    role: invite.role,
    jobTitle: invite.jobTitle,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    createdAt: invite.createdAt.toISOString(),
  };
}

const INVITE_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  jobTitle: true,
  status: true,
  expiresAt: true,
  createdAt: true,
} as const;

async function hasActiveMembership(
  workspaceId: string,
  email: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return false;

  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
    select: { status: true },
  });

  return membership?.status === "ACTIVE";
}

/**
 * Flips any PENDING invite past its expiry to EXPIRED for the workspace. Lazy
 * expiry — no background job (research.md §1).
 */
async function expireStaleInvites(workspaceId: string): Promise<void> {
  await prisma.workspaceInvite.updateMany({
    where: { workspaceId, status: "PENDING", expiresAt: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}

export async function listInvites(
  workspaceId: string,
  statuses: readonly InviteStatus[] = ["PENDING", "EXPIRED"]
): Promise<InviteDTO[]> {
  await expireStaleInvites(workspaceId);

  const invites = await prisma.workspaceInvite.findMany({
    where: { workspaceId, status: { in: [...statuses] } },
    orderBy: { createdAt: "desc" },
    select: INVITE_SELECT,
  });

  return invites.map(toDTO);
}

async function createInviteRow(params: {
  workspaceId: string;
  invitedById: string;
  email: string;
  name: string | null;
  role: WorkspaceRole;
  jobTitle: string | null;
}): Promise<InviteRow> {
  // Cancel any prior active invite for this (workspace, email) so only one
  // PENDING/EXPIRED invite is ever live (FR-005, re-invite edge case).
  await prisma.workspaceInvite.updateMany({
    where: {
      workspaceId: params.workspaceId,
      email: params.email,
      status: { in: ["PENDING", "EXPIRED"] },
    },
    data: { status: "CANCELLED" },
  });

  const rawToken = randomBytes(32).toString("hex");
  const invite = await prisma.workspaceInvite.create({
    data: {
      workspaceId: params.workspaceId,
      email: params.email,
      name: params.name,
      role: params.role,
      jobTitle: params.jobTitle,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedById: params.invitedById,
    },
    select: INVITE_SELECT,
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    select: { name: true },
  });

  await sendInviteEmail({
    email: params.email,
    workspaceName: workspace?.name ?? "Agenda Pro",
    role: params.role,
    jobTitle: params.jobTitle,
    token: rawToken,
  });

  return invite;
}

export async function createInvite(params: {
  workspaceId: string;
  invitedById: string;
  email: string;
  name?: string;
  role: WorkspaceRole;
  jobTitle?: string;
}): Promise<InviteDTO> {
  if (await hasActiveMembership(params.workspaceId, params.email)) {
    throw new WorkspaceAuthError(
      409,
      "Este e-mail já é membro do workspace."
    );
  }

  const invite = await createInviteRow({
    workspaceId: params.workspaceId,
    invitedById: params.invitedById,
    email: params.email,
    name: params.name ?? null,
    role: params.role,
    jobTitle: params.jobTitle ?? null,
  });

  return toDTO(invite);
}

async function findInviteInWorkspace(workspaceId: string, inviteId: string) {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { id: inviteId },
    select: {
      ...INVITE_SELECT,
      workspaceId: true,
      invitedById: true,
    },
  });

  if (!invite || invite.workspaceId !== workspaceId) {
    throw new WorkspaceAuthError(404, "Convite não encontrado.");
  }

  return invite;
}

export async function resendInvite(params: {
  workspaceId: string;
  inviteId: string;
  invitedById: string;
  callerRole: WorkspaceRole;
}): Promise<InviteDTO> {
  const { workspaceId, inviteId, invitedById, callerRole } = params;
  const existing = await findInviteInWorkspace(workspaceId, inviteId);

  // Only an OWNER may (re)send an ADMIN/OWNER invite (FR-009 parity).
  if (
    (existing.role === "OWNER" || existing.role === "ADMIN") &&
    callerRole !== "OWNER"
  ) {
    throw new WorkspaceAuthError(
      403,
      "Apenas o proprietário pode reenviar convites de administrador ou proprietário."
    );
  }

  const invite = await createInviteRow({
    workspaceId,
    invitedById,
    email: existing.email,
    name: existing.name,
    role: existing.role,
    jobTitle: existing.jobTitle,
  });

  return toDTO(invite);
}

export async function cancelInvite(
  workspaceId: string,
  inviteId: string
): Promise<void> {
  await findInviteInWorkspace(workspaceId, inviteId);

  await prisma.workspaceInvite.update({
    where: { id: inviteId },
    data: { status: "CANCELLED" },
  });
}

export type InviteContext = {
  id: string;
  email: string;
  name: string | null;
  role: WorkspaceRole;
  jobTitle: string | null;
  workspaceId: string;
  workspaceName: string;
  status: InviteStatus;
  isValid: boolean;
};

/**
 * Resolves an invite from its raw token for the accept screen. Applies lazy
 * expiry (flips an expired PENDING invite to EXPIRED). Returns null when the
 * token matches no invite. `isValid` means PENDING and not expired.
 */
export async function getInviteByToken(
  rawToken: string
): Promise<InviteContext | null> {
  const invite = await prisma.workspaceInvite.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      jobTitle: true,
      status: true,
      expiresAt: true,
      workspaceId: true,
      workspace: { select: { name: true } },
    },
  });

  if (!invite) return null;

  let status = invite.status;
  if (status === "PENDING" && invite.expiresAt < new Date()) {
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    status = "EXPIRED";
  }

  return {
    id: invite.id,
    email: invite.email,
    name: invite.name,
    role: invite.role,
    jobTitle: invite.jobTitle,
    workspaceId: invite.workspaceId,
    workspaceName: invite.workspace.name,
    status,
    isValid: status === "PENDING",
  };
}

/**
 * Accepts an invite for the given user. Idempotent: find-or-create an ACTIVE
 * membership with the invited role + jobTitle, mark the invite ACCEPTED, and
 * (when `markEmailVerified`) set the user's emailVerified — the tokenized link
 * is itself proof of e-mail ownership (research.md §2). Returns the workspaceId.
 */
export async function acceptInvite(params: {
  userId: string;
  rawToken: string;
}): Promise<{ workspaceId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, emailVerified: true },
  });
  if (!user) {
    throw new WorkspaceAuthError(401, "Sessão inválida.");
  }

  const invite = await prisma.workspaceInvite.findUnique({
    where: { tokenHash: hashToken(params.rawToken) },
  });

  if (!invite) {
    throw new WorkspaceAuthError(404, "Convite não encontrado.");
  }

  const isExpired =
    invite.status === "EXPIRED" ||
    (invite.status === "PENDING" && invite.expiresAt < new Date());

  if (invite.status !== "PENDING" || isExpired) {
    throw new WorkspaceAuthError(
      410,
      "Este convite não é mais válido."
    );
  }

  if (invite.email !== user.email) {
    throw new WorkspaceAuthError(
      403,
      "Este convite foi enviado para outro e-mail. Entre com a conta convidada."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMembership.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: invite.workspaceId,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: invite.role,
        jobTitle: invite.jobTitle,
        status: "ACTIVE",
      },
    });

    if (!user.emailVerified) {
      await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    await tx.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
  });

  return { workspaceId: invite.workspaceId };
}
