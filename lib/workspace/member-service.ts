import type {
  MembershipStatus,
  WorkspaceRole,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { WorkspaceAuthError } from "@/lib/workspace/authorization";
import type { UpdateMemberInput } from "@/lib/validation/professional";

export type MemberDTO = {
  membershipId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
  role: WorkspaceRole;
  status: MembershipStatus;
  jobTitle: string | null;
  createdAt: string;
};

const MEMBER_SELECT = {
  id: true,
  userId: true,
  role: true,
  status: true,
  jobTitle: true,
  createdAt: true,
  user: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      image: true,
    },
  },
} as const;

type MemberRow = {
  id: string;
  userId: string;
  role: WorkspaceRole;
  status: MembershipStatus;
  jobTitle: string | null;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    image: string | null;
  };
};

function toDTO(row: MemberRow): MemberDTO {
  return {
    membershipId: row.id,
    userId: row.userId,
    firstName: row.user.firstName,
    lastName: row.user.lastName,
    email: row.user.email,
    image: row.user.image,
    role: row.role,
    status: row.status,
    jobTitle: row.jobTitle,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMembers(workspaceId: string): Promise<MemberDTO[]> {
  const members = await prisma.workspaceMembership.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: MEMBER_SELECT,
  });

  return members.map(toDTO);
}

export async function updateMember(params: {
  workspaceId: string;
  membershipId: string;
  callerRole: WorkspaceRole;
  data: UpdateMemberInput;
}): Promise<MemberDTO> {
  const { workspaceId, membershipId, callerRole, data } = params;

  const target = await prisma.workspaceMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, workspaceId: true, role: true, status: true },
  });

  if (!target || target.workspaceId !== workspaceId) {
    throw new WorkspaceAuthError(404, "Profissional não encontrado.");
  }

  // An ADMIN may not modify an OWNER membership (FR-010/FR-014).
  if (target.role === "OWNER" && callerRole !== "OWNER") {
    throw new WorkspaceAuthError(
      403,
      "Você não tem permissão para alterar um proprietário."
    );
  }

  // Only an OWNER may promote someone to ADMIN or OWNER (FR-009 parity).
  if (
    (data.role === "OWNER" || data.role === "ADMIN") &&
    callerRole !== "OWNER"
  ) {
    throw new WorkspaceAuthError(
      403,
      "Apenas o proprietário pode definir administradores ou proprietários."
    );
  }

  // The last ACTIVE OWNER cannot be demoted or deactivated (FR-011).
  const demotesOwner = target.role === "OWNER" && data.role && data.role !== "OWNER";
  const deactivatesOwner =
    target.role === "OWNER" &&
    target.status === "ACTIVE" &&
    data.status === "INACTIVE";

  if (demotesOwner || deactivatesOwner) {
    const activeOwners = await prisma.workspaceMembership.count({
      where: { workspaceId, role: "OWNER", status: "ACTIVE" },
    });
    if (activeOwners <= 1) {
      throw new WorkspaceAuthError(
        403,
        "O workspace precisa de pelo menos um proprietário ativo."
      );
    }
  }

  const updated = await prisma.workspaceMembership.update({
    where: { id: membershipId },
    data: {
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.jobTitle !== undefined ? { jobTitle: data.jobTitle } : {}),
    },
    select: MEMBER_SELECT,
  });

  return toDTO(updated);
}
