import type { Booking } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { AppError } from "../api/errors.js";

vi.mock("@prisma/client", async () => {
    const { vi: _vi } = await import("vitest");

    const instance = {
        booking: {
            findFirst: _vi.fn(),
            findUnique: _vi.fn(),
            findMany: _vi.fn(),
            count: _vi.fn(),
            create: _vi.fn(),
            update: _vi.fn(),
            delete: _vi.fn(),
            deleteMany: _vi.fn(),
        },
        bookingParticipant: {
            deleteMany: _vi.fn(),
        },
        room: {
            findUnique: _vi.fn(),
        },
        user: {
            findMany: _vi.fn(),
        },
        systemSettings: {
            upsert: _vi.fn(),
        },
        $queryRaw: _vi.fn(),
        $transaction: _vi.fn(),
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
import {
    cancelBooking,
    createBooking,
    listBookings,
    rescheduleBooking,
} from "./booking.service.js";

type MockPrismaClient = {
    booking: {
        findFirst: Mock;
        findUnique: Mock;
        findMany: Mock;
        count: Mock;
        create: Mock;
        update: Mock;
        delete: Mock;
        deleteMany: Mock;
    };
    bookingParticipant: {
        deleteMany: Mock;
        findMany: Mock;
    };
    notification: {
        createMany: Mock;
    };
    room: {
        findUnique: Mock;
    };
    user: {
        findMany: Mock;
        findUnique: Mock;
    };
    systemSettings: {
        upsert: Mock;
    };
    $queryRaw: Mock;
    $transaction: Mock;
};

const mockClient = prisma as unknown as MockPrismaClient;

const txMock = {
    $queryRaw: vi.fn(),
    room: { findUnique: vi.fn() },
    systemSettings: { upsert: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    booking: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
    },
    bookingParticipant: {
        deleteMany: vi.fn(),
        findMany: vi.fn(),
    },
    notification: {
        createMany: vi.fn(),
    },
};

const settingsMock = { workStart: "08:00", workEnd: "20:00", maxBookingHours: 4 };

beforeEach(() => {
    vi.clearAllMocks();

    mockClient.$transaction.mockImplementation(
        async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
    );
    txMock.room.findUnique.mockResolvedValue({ isBlocked: false });
    txMock.systemSettings.upsert.mockResolvedValue(settingsMock);
    txMock.user.findMany.mockResolvedValue([{ id: 7 }]);
    txMock.user.findUnique.mockResolvedValue({ name: "Іван Іванов" });
    txMock.booking.findFirst.mockResolvedValue(null);
    txMock.booking.findUnique.mockResolvedValue(null);
    mockClient.booking.findUnique.mockResolvedValue(null);
});

describe("createBooking", () => {
    const input = {
        userId: 42,
        roomId: 1,
        title: "Planning",
        start: new Date("2026-06-02T09:00:00Z"), // Kyiv 12:00
        end: new Date("2026-06-02T10:00:00Z"),
        participantIds: [7],
        isRecurring: false,
        recurrenceCount: 1,
    };

    it("creates a non-recurring booking in transaction with room lock", async () => {
        txMock.booking.create.mockResolvedValue({
            id: 1,
            title: "Planning",
            startTime: input.start,
            endTime: input.end,
            isRecurring: false,
            seriesId: null,
            roomId: 1,
            userId: 42,
        } as Booking);

        const result = await createBooking(input);

        expect(txMock.$queryRaw).toHaveBeenCalledTimes(1);
        expect(txMock.room.findUnique).toHaveBeenCalled();
        expect(txMock.booking.create).toHaveBeenCalledTimes(1);
        expect(result.bookings).toHaveLength(1);
        expect(result.recurring).toBe(false);
    });

    it("creates weekly recurring bookings as separate records", async () => {
        let counter = 0;
        txMock.booking.create.mockImplementation(async () => {
            counter += 1;
            return { id: counter } as Booking;
        });

        const result = await createBooking({
            ...input,
            isRecurring: true,
            recurrenceCount: 3,
        });

        expect(txMock.booking.create).toHaveBeenCalledTimes(3);
        expect(result.recurring).toBe(true);
    });

    it("throws 409 on overlapping booking", async () => {
        txMock.booking.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 99 });
        txMock.booking.create.mockResolvedValue({ id: 1 } as Booking);

        await expect(
            createBooking({ ...input, isRecurring: true, recurrenceCount: 2 }),
        ).rejects.toMatchObject({
            status: 409,
            message: "One of the recurring meetings conflicts with another booking",
        });
    });

    it("throws 404 when room not found and 409 when blocked", async () => {
        txMock.room.findUnique.mockResolvedValue(null);

        await expect(createBooking(input)).rejects.toMatchObject({
            status: 404,
            message: "Room not found",
        });

        txMock.room.findUnique.mockResolvedValue({ isBlocked: true });

        await expect(createBooking(input)).rejects.toMatchObject({
            status: 409,
            message: "Room is blocked",
        });
    });

    it("throws AppError when outside working hours or too long", async () => {
        txMock.systemSettings.upsert.mockResolvedValue({
            ...settingsMock,
            maxBookingHours: 0,
        });

        await expect(createBooking(input)).rejects.toMatchObject({
            status: 400,
        });

        txMock.systemSettings.upsert.mockResolvedValue({
            ...settingsMock,
            workStart: "18:00",
        });

        await expect(createBooking(input)).rejects.toMatchObject({
            status: 400,
            message: "Booking must be within working hours and on the same working day",
        });
    });
});

describe("listBookings", () => {
    it("returns bookings with pagination metadata", async () => {
        const booking = { id: 1, title: "Planning" } as Booking;
        mockClient.booking.findMany.mockResolvedValue([booking]);
        mockClient.booking.count.mockResolvedValue(1);

        const result = await listBookings({ limit: 10, offset: 0 });

        expect(result.bookings).toEqual([booking]);
        expect(result.totalCount).toBe(1);
        expect(mockClient.booking.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 10 }),
        );
    });
});

describe("rescheduleBooking", () => {
    it("updates the booking in a transaction after checks", async () => {
        const existing = { id: 5, userId: 42, roomId: 1, title: "Old" };
        const updated = {
            ...existing,
            startTime: new Date("2026-06-03T09:00:00Z"),
            endTime: new Date("2026-06-03T10:00:00Z"),
        };

        txMock.booking.findUnique.mockResolvedValue(existing);
        txMock.room.findUnique.mockResolvedValue({ isBlocked: false });
        txMock.systemSettings.upsert.mockResolvedValue(settingsMock);
        txMock.booking.update.mockResolvedValue(updated);

        mockClient.$transaction.mockImplementation(
            async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
        );

        const result = await rescheduleBooking(
            5,
            {
                start: new Date("2026-06-03T09:00:00Z"),
                end: new Date("2026-06-03T10:00:00Z"),
            },
            { actorId: 42, isManager: false },
        );

        expect(result).toEqual(updated);
        expect(txMock.booking.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 5 } }),
        );
    });
});

describe("cancelBooking", () => {
    it("deletes booking, participants and creates notifications", async () => {
        txMock.booking.findUnique.mockResolvedValue({
            id: 5,
            userId: 42,
            title: "Old",
            roomId: 1,
            startTime: new Date(2026, 10, 23, 9, 0),
            endTime: new Date(2026, 10, 23, 10, 0),
        });
        txMock.bookingParticipant.findMany.mockResolvedValue([{ userId: 7 }]);
        txMock.room.findUnique.mockResolvedValue({ name: "Комната 1" });
        txMock.notification.createMany.mockResolvedValue({ count: 2 });

        const result = await cancelBooking(5, { actorId: 42, role: "employee" });

        expect(result.notificationsCount).toBe(2);
        expect(txMock.notification.createMany).toHaveBeenCalledWith({
            data: [
                expect.objectContaining({
                    userId: 42,
                    type: "booking_cancelled",
                    message: expect.stringContaining("Old"),
                    bookingId: 5,
                }),
                expect.objectContaining({ userId: 7, bookingId: 5 }),
            ],
            skipDuplicates: true,
        });

        // Повідомлення містить ім'я того, хто скасував, та комнату
        expect(txMock.notification.createMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        message: expect.stringContaining("Іван Іванов"),
                    }),
                    expect.objectContaining({
                        message: expect.stringContaining("Комната 1"),
                    }),
                ]),
            }),
        );
        expect(txMock.bookingParticipant.deleteMany).toHaveBeenCalledWith({
            where: { bookingId: 5 },
        });
        expect(txMock.booking.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    });

    it("rejects when booking not found or not owner/manager", async () => {
        txMock.booking.findUnique.mockResolvedValue(null);
        await expect(cancelBooking(5, { actorId: 42, role: "employee" })).rejects.toBeInstanceOf(
            AppError,
        );
    });
});
