import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@prisma/client", async () => {
    const { vi: _vi } = await import("vitest");

    class MockPrismaClient {
        constructor() {
            return instance;
        }
    }

    const instance = {
        notification: {
            createMany: _vi.fn(),
            findMany: _vi.fn(),
            updateMany: _vi.fn(),
        },
    };

    return { PrismaClient: MockPrismaClient };
});

import { prisma } from "../db.js";
import {
    listNotifications,
    markAsRead,
    notifyBookingCancelled,
} from "./notification.service.js";

type MockPrismaClient = {
    notification: {
        createMany: Mock;
        findMany: Mock;
        updateMany: Mock;
    };
};

const mockClient = prisma as unknown as MockPrismaClient;

const txMock = { notification: mockClient.notification };

beforeEach(() => {
    vi.clearAllMocks();
});

describe("notifyBookingCancelled", () => {
    it("creates notifications for all recipients with skipDuplicates", async () => {
        mockClient.notification.createMany.mockResolvedValue({ count: 3 });

        const count = await notifyBookingCancelled(
            txMock as never,
            { id: 10, title: "Совещание", roomName: "Комната 1" },
            [1, 2, 3],
        );

        expect(count).toBe(3);
        expect(mockClient.notification.createMany).toHaveBeenCalledWith({
            data: [
                expect.objectContaining({
                    userId: 1,
                    type: "booking_cancelled",
                    message: expect.stringContaining("Совещание"),
                    bookingId: 10,
                }),
                expect.objectContaining({ userId: 2, bookingId: 10 }),
                expect.objectContaining({ userId: 3, bookingId: 10 }),
            ],
            skipDuplicates: true,
        });
    });

    it("returns 0 when there are no recipients", async () => {
        const count = await notifyBookingCancelled(
            txMock as never,
            { id: 1, title: "t", roomName: "" },
            [],
        );

        expect(count).toBe(0);
        expect(mockClient.notification.createMany).not.toHaveBeenCalled();
    });
});

describe("listNotifications", () => {
    it("returns notifications ordered desc for the user with pagination", async () => {
        const notifications = [{ id: 2 }, { id: 1 }];
        mockClient.notification.findMany.mockResolvedValue(notifications);

        const result = await listNotifications(42, { limit: 10, offset: 0 });

        expect(result).toEqual(notifications);
        expect(mockClient.notification.findMany).toHaveBeenCalledWith({
            where: { userId: 42 },
            orderBy: { createdAt: "desc" },
            take: 10,
            skip: 0,
        });
    });

    it("omits take/skip when not set", async () => {
        mockClient.notification.findMany.mockResolvedValue([]);

        await listNotifications(42);

        expect(mockClient.notification.findMany).toHaveBeenCalledWith({
            where: { userId: 42 },
            orderBy: { createdAt: "desc" },
        });
    });
});

describe("markAsRead", () => {
    it("marks read only for own notification (userId filter)", async () => {
        mockClient.notification.updateMany.mockResolvedValue({ count: 1 });

        const result = await markAsRead(42, 7);

        expect(result.count).toBe(1);
        expect(mockClient.notification.updateMany).toHaveBeenCalledWith({
            where: { id: 7, userId: 42 },
            data: { isRead: true },
        });
    });
});
