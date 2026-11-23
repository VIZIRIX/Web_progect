import type { Department } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { AppError } from "../api/errors.js";

vi.mock("@prisma/client", async () => {
    const { vi: _vi } = await import("vitest");

    const instance = {
        department: {
            findMany: _vi.fn(),
            findUnique: _vi.fn(),
            create: _vi.fn(),
            update: _vi.fn(),
            delete: _vi.fn(),
        },
        user: {
            count: _vi.fn(),
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
import {
    createDepartment,
    deleteDepartment,
    listDepartments,
    updateDepartment,
} from "./department.service.js";

type MockPrismaClient = {
    department: {
        findMany: Mock;
        findUnique: Mock;
        create: Mock;
        update: Mock;
        delete: Mock;
    };
    user: {
        count: Mock;
    };
};

const mockPrisma = prisma as unknown as MockPrismaClient;

const makeDepartment = (overrides: Partial<Department> = {}): Department => ({
    id: 1,
    name: "IT Department",
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
});

describe("department.service", () => {
    it("listDepartments returns departments sorted by name", async () => {
        const departments = [makeDepartment(), makeDepartment({ id: 2, name: "Administration" })];
        mockPrisma.department.findMany.mockResolvedValue(departments);

        await expect(listDepartments()).resolves.toBe(departments);
        expect(mockPrisma.department.findMany).toHaveBeenCalledOnce();
    });

    it("createDepartment creates a department", async () => {
        const department = makeDepartment({ name: "IT" });
        mockPrisma.department.create.mockResolvedValue(department);

        await expect(createDepartment({ name: "IT" })).resolves.toBe(department);
        expect(mockPrisma.department.create).toHaveBeenCalledWith({ data: { name: "IT" } });
    });

    it("createDepartment maps duplicate name to 409", async () => {
        mockPrisma.department.create.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("P2002", {
                code: "P2002",
                clientVersion: "6.19.3",
            }),
        );

        await expect(createDepartment({ name: "IT" })).rejects.toMatchObject({
            status: 409,
        });
    });

    it("updateDepartment returns updated department", async () => {
        const department = makeDepartment({ name: "New Name" });
        mockPrisma.department.findUnique.mockResolvedValue(makeDepartment());
        mockPrisma.department.update.mockResolvedValue(department);

        await expect(updateDepartment(1, { name: "New Name" })).resolves.toBe(department);
    });

    it("updateDepartment maps not found to 404", async () => {
        mockPrisma.department.findUnique.mockResolvedValue(null);

        await expect(updateDepartment(42, { name: "X" })).rejects.toMatchObject({ status: 404 });
    });

    it("deleteDepartment returns not found when missing", async () => {
        mockPrisma.department.findUnique.mockResolvedValue(null);

        await expect(deleteDepartment(42)).rejects.toMatchObject({ status: 404 });
    });

    it("deleteDepartment refuses while users exist", async () => {
        mockPrisma.department.findUnique.mockResolvedValue(makeDepartment());
        mockPrisma.user.count.mockResolvedValue(2);

        await expect(deleteDepartment(1)).rejects.toMatchObject({ status: 409 });
        expect(mockPrisma.department.delete).not.toHaveBeenCalled();
    });

    it("deleteDepartment removes the department when no users", async () => {
        mockPrisma.department.findUnique.mockResolvedValue(makeDepartment());
        mockPrisma.user.count.mockResolvedValue(0);
        mockPrisma.department.delete.mockResolvedValue(makeDepartment());

        await expect(deleteDepartment(1)).resolves.toEqual({ message: "Department deleted" });
    });

    it("updateDepartment maps duplicate name to 409", async () => {
        mockPrisma.department.findUnique.mockResolvedValue(makeDepartment());
        mockPrisma.department.update.mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError("P2002", {
                code: "P2002",
                clientVersion: "6.19.3",
            }),
        );

        await expect(updateDepartment(1, { name: "Duplicate" })).rejects.toMatchObject({
            status: 409,
        });
    });
});
