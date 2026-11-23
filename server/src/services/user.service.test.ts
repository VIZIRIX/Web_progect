import type { User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { AppError } from "../api/errors.js";

vi.mock("@prisma/client", async () => {
    const { vi: _vi } = await import("vitest");

    const instance = {
        user: {
            findMany: _vi.fn(),
            findUnique: _vi.fn(),
            update: _vi.fn(),
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
import { listUsersForManagement, setUserRole } from "./user.service.js";

type MockPrismaClient = {
    user: {
        findMany: Mock;
        findUnique: Mock;
        update: Mock;
    };
};

const mockPrisma = prisma as unknown as MockPrismaClient;

beforeEach(() => {
    vi.clearAllMocks();
});

describe("user.service", () => {
    it("listUsersForManagement returns users with departments", async () => {
        const users = [{ id: 1, name: "Ivan", email: "ivan@x", role: "employee", department: { name: "IT" } }];
        mockPrisma.user.findMany.mockResolvedValue(users);

        await expect(listUsersForManagement()).resolves.toBe(users);
    });

    it("setUserRole returns the updated user", async () => {
        const user = { id: 1, role: "admin" };
        mockPrisma.user.findUnique.mockResolvedValue({ id: 1 });
        mockPrisma.user.update.mockResolvedValue(user);

        await expect(setUserRole(1, "admin")).resolves.toBe(user);
        expect(mockPrisma.user.update).toHaveBeenCalledWith({
            where: { id: 1 },
            data: { role: "admin" },
        });
    });

    it("setUserRole maps not found to 404", async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        await expect(setUserRole(99, "admin")).rejects.toMatchObject({ status: 404 });
        expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
});
