import type { SystemSettings } from '@prisma/client';
import { prisma } from '../db.js';
import type { SettingsUpdateInput } from '../validators/settings.validators.js';

/** Дефолты, если настройки ещё не созданы. */
const DEFAULT_SETTINGS: SystemSettings = {
    id: 1,
    workStart: '08:00',
    workEnd: '20:00',
    maxBookingHours: 4
};

export async function getSettings(): Promise<SystemSettings> {
    return (
        (await prisma.systemSettings.findFirst({ where: { id: 1 } })) ??
        DEFAULT_SETTINGS
    );
}

export async function updateSettings(
    input: SettingsUpdateInput
): Promise<SystemSettings> {
    return prisma.systemSettings.upsert({
        where: { id: 1 },
        update: input,
        create: { id: 1, ...input }
    });
}
