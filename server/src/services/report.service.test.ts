import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@prisma/client", async () => {
    const { vi: _vi } = await import("vitest");

    const instance = {
        room: {
            findMany: _vi.fn(),
        },
        booking: {
            findMany: _vi.fn(),
        },
        $disconnect: _vi.fn(),
    };

    class MockPrismaClient {
        constructor() {
            return instance;
        }
    }

    return {
        PrismaClient: MockPrismaClient,
        Prisma: {
            PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
                public readonly code: string;

                constructor(code: string) {
                    super(code);
                    this.code = code;
                }
            },
        },
    };
});

import { prisma } from "../db.js";
import { getRoomUtilization } from "./report.service.js";

type MockPrismaClient = {
    room: {
        findMany: Mock;
    };
    booking: {
        findMany: Mock;
    };
};

const mockPrisma = prisma as unknown as MockPrismaClient;

const MS_PER_MINUTE = 60_000;

const makeRoom = (id: number, name: string) => ({
    id,
    name,
    capacity: id === 1 ? 6 : 4,
    isBlocked: false,
});

const makeBooking = (roomId: number, start: Date, end: Date) => ({
    roomId,
    startTime: start,
    endTime: end,
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe("report.service getRoomUtilization", () => {
    it("returns utilization for every room, sorted by busy time desc", async () => {
        const from = new Date(2026, 10, 16, 0, 0);
        const to = new Date(2026, 10, 18, 0, 0);
        const spanMs = to.getTime() - from.getTime();

        mockPrisma.room.findMany.mockResolvedValue([
            makeRoom(1, "Meeting Room 1"),
            makeRoom(2, "Meeting Room 2"),
        ]);
        mockPrisma.booking.findMany.mockResolvedValue([
            makeBooking(1, new Date(2026, 10, 16, 10, 0), new Date(2026, 10, 16, 12, 0)),
            // Booking crosses the range end: clipped to 18th 00:00
            makeBooking(1, new Date(2026, 10, 17, 23, 0), new Date(2026, 10, 18, 1, 0)),
            // Booking fully outside the range
            makeBooking(2, new Date(2026, 10, 15, 9, 0), new Date(2026, 10, 15, 18, 0)),
        ]);

        const report = await getRoomUtilization({ from, to });

        expect(report).toHaveLength(2);

        const [room1, room2] = report;

        expect(room1).toBeDefined();
        expect(room2).toBeDefined();

        // 120 min + 60 min clipped busy minutes
        expect(room1?.totalBookings).toBe(2);
        expect(room1?.busyMs).toBe(180 * MS_PER_MINUTE);
        expect(room1?.freeMs).toBe(spanMs - 180 * MS_PER_MINUTE);
        expect(room1?.utilizationPercent).toBeGreaterThan(0);

        // Booking fully outside the range
        expect(room2?.totalBookings).toBe(0);
        expect(room2?.busyMs).toBe(0);
        expect(room2?.utilizationPercent).toBe(0);

        // Sorted by utilizationPercent desc: room1 has higher utilization
        expect(report[0]?.utilizationPercent).toBeGreaterThan(report[1]?.utilizationPercent ?? -1);
    });

    it("clips bookings that cross the range boundaries", async () => {
        const from = new Date(2026, 10, 16, 12, 0);
        const to = new Date(2026, 10, 16, 14, 0);

        mockPrisma.room.findMany.mockResolvedValue([makeRoom(1, "Meeting Room 1")]);
        mockPrisma.booking.findMany.mockResolvedValue([
            makeBooking(1, new Date(2026, 10, 16, 10, 0), new Date(2026, 10, 16, 13, 0)),
        ]);

        const report = await getRoomUtilization({ from, to });

        const room = report[0];

        expect(room).toBeDefined();
        expect(room?.totalBookings).toBe(1);
        expect(room?.busyMs).toBe(60 * MS_PER_MINUTE);
        expect(room?.utilizationPercent).toBeGreaterThan(0);
        expect(room?.utilizationPercent).toBeLessThanOrEqual(100);
    });

    it("returns an empty report when the range is empty", async () => {
        const from = new Date(2026, 10, 16, 12, 0);
        const to = new Date(2026, 10, 16, 12, 0);

        await expect(getRoomUtilization({ from, to })).resolves.toEqual([]);
        expect(mockPrisma.booking.findMany).not.toHaveBeenCalled();
    });
});
