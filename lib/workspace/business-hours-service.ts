import { prisma } from "@/lib/prisma";
import type { UpsertBusinessHoursInput } from "@/lib/validation/business-hours";

export type BusinessHoursDTO = {
  openMinutes: number;
  closeMinutes: number;
  openWeekdays: number[];
  isDefault: boolean;
};

/** Default when no explicit config exists: 08:00–18:00 every day (FR-027). */
const DEFAULT_OPEN_MINUTES = 480;
const DEFAULT_CLOSE_MINUTES = 1080;
const DEFAULT_OPEN_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const BUSINESS_HOURS_SELECT = {
  openMinutes: true,
  closeMinutes: true,
  openWeekdays: true,
} as const;

function sortWeekdays(weekdays: number[]): number[] {
  return [...weekdays].sort((a, b) => a - b);
}

/**
 * The effective business hours for a workspace. Returns the FR-027 default
 * (flagged `isDefault: true`) without persisting a row when none exists.
 */
export async function getBusinessHours(
  workspaceId: string
): Promise<BusinessHoursDTO> {
  const row = await prisma.workspaceBusinessHours.findUnique({
    where: { workspaceId },
    select: BUSINESS_HOURS_SELECT,
  });

  if (!row) {
    return {
      openMinutes: DEFAULT_OPEN_MINUTES,
      closeMinutes: DEFAULT_CLOSE_MINUTES,
      openWeekdays: DEFAULT_OPEN_WEEKDAYS,
      isDefault: true,
    };
  }

  return {
    openMinutes: row.openMinutes,
    closeMinutes: row.closeMinutes,
    openWeekdays: sortWeekdays(row.openWeekdays),
    isDefault: false,
  };
}

/**
 * Creates or updates the single `WorkspaceBusinessHours` row for the workspace
 * (scoped by the unique `workspaceId`, always the session workspace — never
 * client-supplied).
 */
export async function upsertBusinessHours(
  workspaceId: string,
  data: UpsertBusinessHoursInput
): Promise<BusinessHoursDTO> {
  const weekdays = sortWeekdays(data.openWeekdays);

  const row = await prisma.workspaceBusinessHours.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      openMinutes: data.openMinutes,
      closeMinutes: data.closeMinutes,
      openWeekdays: weekdays,
    },
    update: {
      openMinutes: data.openMinutes,
      closeMinutes: data.closeMinutes,
      openWeekdays: weekdays,
    },
    select: BUSINESS_HOURS_SELECT,
  });

  return {
    openMinutes: row.openMinutes,
    closeMinutes: row.closeMinutes,
    openWeekdays: sortWeekdays(row.openWeekdays),
    isDefault: false,
  };
}
