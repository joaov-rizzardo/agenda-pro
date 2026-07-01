import type { Prisma, ServiceStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { WorkspaceAuthError } from "@/lib/workspace/authorization";
import { resolveEffectivePrice } from "@/lib/pricing/effective-price";
import type { SetCustomPriceInput } from "@/lib/validation/service";

export type AssociatedServiceDTO = {
  associationId: string;
  serviceId: string;
  name: string;
  durationMinutes: number;
  defaultPrice: number;
  useCustomPrice: boolean;
  customPrice: number | null;
  effectivePrice: number;
  serviceStatus: ServiceStatus;
};

const ASSOCIATION_SELECT = {
  id: true,
  serviceId: true,
  useCustomPrice: true,
  customPrice: true,
  service: {
    select: {
      name: true,
      durationMinutes: true,
      defaultPrice: true,
      status: true,
    },
  },
} satisfies Prisma.ProfessionalServiceSelect;

type AssociationRow = {
  id: string;
  serviceId: string;
  useCustomPrice: boolean;
  customPrice: { toNumber(): number } | null;
  service: {
    name: string;
    durationMinutes: number;
    defaultPrice: { toNumber(): number };
    status: ServiceStatus;
  };
};

function toDTO(row: AssociationRow): AssociatedServiceDTO {
  // Money: Prisma Decimal → plain JSON number (reais) at the boundary (research §1).
  const defaultPrice = row.service.defaultPrice.toNumber();
  const customPrice = row.customPrice != null ? row.customPrice.toNumber() : null;

  return {
    associationId: row.id,
    serviceId: row.serviceId,
    name: row.service.name,
    durationMinutes: row.service.durationMinutes,
    defaultPrice,
    useCustomPrice: row.useCustomPrice,
    customPrice,
    effectivePrice: resolveEffectivePrice({
      useCustomPrice: row.useCustomPrice,
      customPrice,
      defaultPrice,
    }),
    serviceStatus: row.service.status,
  };
}

/** Tenant guard: the membership must belong to the session workspace, else 404. */
async function assertMembershipInWorkspace(
  workspaceId: string,
  membershipId: string
): Promise<void> {
  const membership = await prisma.workspaceMembership.findUnique({
    where: { id: membershipId },
    select: { workspaceId: true },
  });

  if (!membership || membership.workspaceId !== workspaceId) {
    throw new WorkspaceAuthError(404, "Profissional não encontrado.");
  }
}

/** Tenant guard: the service must belong to the session workspace, else 404. */
async function requireServiceInWorkspace(
  workspaceId: string,
  serviceId: string
): Promise<{ status: ServiceStatus }> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { workspaceId: true, status: true },
  });

  if (!service || service.workspaceId !== workspaceId) {
    throw new WorkspaceAuthError(404, "Serviço não encontrado.");
  }

  return { status: service.status };
}

export async function listAssociatedServices(params: {
  workspaceId: string;
  membershipId: string;
}): Promise<AssociatedServiceDTO[]> {
  const { workspaceId, membershipId } = params;

  await assertMembershipInWorkspace(workspaceId, membershipId);

  // Reads do NOT filter by service status — deactivated-but-associated services
  // stay listed, flagged via serviceStatus (FR-014).
  const associations = await prisma.professionalService.findMany({
    where: { membershipId },
    orderBy: { createdAt: "asc" },
    select: ASSOCIATION_SELECT,
  });

  return associations.map(toDTO);
}

export async function associateService(params: {
  workspaceId: string;
  membershipId: string;
  serviceId: string;
}): Promise<AssociatedServiceDTO> {
  const { workspaceId, membershipId, serviceId } = params;

  await assertMembershipInWorkspace(workspaceId, membershipId);
  const { status } = await requireServiceInWorkspace(workspaceId, serviceId);

  // Only ACTIVE services may be newly associated (FR-011).
  if (status === "INACTIVE") {
    throw new WorkspaceAuthError(
      400,
      "Serviço inativo não pode ser associado."
    );
  }

  const existing = await prisma.professionalService.findUnique({
    where: { membershipId_serviceId: { membershipId, serviceId } },
    select: { id: true },
  });

  if (existing) {
    throw new WorkspaceAuthError(
      409,
      "Serviço já associado a este profissional."
    );
  }

  const created = await prisma.professionalService.create({
    data: { membershipId, serviceId, useCustomPrice: false, customPrice: null },
    select: ASSOCIATION_SELECT,
  });

  return toDTO(created);
}

export async function unassociateService(params: {
  workspaceId: string;
  membershipId: string;
  serviceId: string;
}): Promise<void> {
  const { workspaceId, membershipId, serviceId } = params;

  await assertMembershipInWorkspace(workspaceId, membershipId);

  // Works even for an INACTIVE service — lets the user clean up (FR-014).
  const association = await prisma.professionalService.findUnique({
    where: { membershipId_serviceId: { membershipId, serviceId } },
    select: { id: true },
  });

  if (!association) {
    throw new WorkspaceAuthError(404, "Associação não encontrada.");
  }

  await prisma.professionalService.delete({ where: { id: association.id } });
}

export async function setCustomPrice(params: {
  workspaceId: string;
  membershipId: string;
  serviceId: string;
  data: SetCustomPriceInput;
}): Promise<AssociatedServiceDTO> {
  const { workspaceId, membershipId, serviceId, data } = params;

  await assertMembershipInWorkspace(workspaceId, membershipId);
  await requireServiceInWorkspace(workspaceId, serviceId);

  const association = await prisma.professionalService.findUnique({
    where: { membershipId_serviceId: { membershipId, serviceId } },
    select: { id: true },
  });

  if (!association) {
    throw new WorkspaceAuthError(404, "Associação não encontrada.");
  }

  // Enabling stores customPrice (accepted even when equal to defaultPrice —
  // the flag decides, FR-015/FR-016); reverting nulls it out (FR-017, research §4).
  const updated = await prisma.professionalService.update({
    where: { id: association.id },
    data: data.useCustomPrice
      ? { useCustomPrice: true, customPrice: data.customPrice }
      : { useCustomPrice: false, customPrice: null },
    select: ASSOCIATION_SELECT,
  });

  return toDTO(updated);
}
