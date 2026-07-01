import type { ServiceStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { WorkspaceAuthError } from "@/lib/workspace/authorization";
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from "@/lib/validation/service";

export type ServiceDTO = {
  serviceId: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  defaultPrice: number;
  status: ServiceStatus;
  createdAt: string;
  updatedAt: string;
};

const SERVICE_SELECT = {
  id: true,
  name: true,
  description: true,
  durationMinutes: true,
  defaultPrice: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  defaultPrice: { toNumber(): number };
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
};

function toDTO(row: ServiceRow): ServiceDTO {
  return {
    serviceId: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.durationMinutes,
    // Prisma Decimal → plain JSON number (reais) at the DTO boundary (research §1).
    defaultPrice: row.defaultPrice.toNumber(),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listServices(
  workspaceId: string,
  status?: ServiceStatus
): Promise<ServiceDTO[]> {
  const services = await prisma.service.findMany({
    where: { workspaceId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "asc" },
    select: SERVICE_SELECT,
  });

  return services.map(toDTO);
}

export async function createService(params: {
  workspaceId: string;
  data: CreateServiceInput;
}): Promise<ServiceDTO> {
  const { workspaceId, data } = params;

  const created = await prisma.service.create({
    data: {
      workspaceId,
      name: data.name,
      description: data.description ?? null,
      durationMinutes: data.durationMinutes,
      defaultPrice: data.defaultPrice,
      status: "ACTIVE",
    },
    select: SERVICE_SELECT,
  });

  return toDTO(created);
}

export async function updateService(params: {
  workspaceId: string;
  serviceId: string;
  data: UpdateServiceInput;
}): Promise<ServiceDTO> {
  const { workspaceId, serviceId, data } = params;

  // Tenant guard: a serviceId from another workspace must not resolve here.
  const existing = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, workspaceId: true },
  });

  if (!existing || existing.workspaceId !== workspaceId) {
    throw new WorkspaceAuthError(404, "Serviço não encontrado.");
  }

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined
        ? { description: data.description }
        : {}),
      ...(data.durationMinutes !== undefined
        ? { durationMinutes: data.durationMinutes }
        : {}),
      ...(data.defaultPrice !== undefined
        ? { defaultPrice: data.defaultPrice }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
    select: SERVICE_SELECT,
  });

  return toDTO(updated);
}
