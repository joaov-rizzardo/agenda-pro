import type {
  MembershipStatus,
  WorkspaceRole,
} from "@/generated/prisma/client";

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
};

export const STATUS_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
};
