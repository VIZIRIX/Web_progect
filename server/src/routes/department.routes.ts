import { Router } from "express";
import type { Request, Response } from "express";
import {
    requireRole,
    USER_ROLES,
    verifyToken,
} from "../middleware/auth.middleware.js";
import { sendSuccess } from "../api/response.js";
import {
    createDepartment,
    deleteDepartment,
    listDepartments,
    updateDepartment,
} from "../services/department.service.js";
import {
    parseDepartmentIdParam,
    validateDepartmentCreateInput,
    validateDepartmentUpdateInput,
} from "../validators/department.validators.js";

const router: Router = Router();

// Список всех відділів (только администратор)
router.get(
    "/",
    verifyToken,
    requireRole(USER_ROLES.ADMIN),
    async (_req: Request, res: Response) => {
        const departments = await listDepartments();

        sendSuccess(res, 200, { count: departments.length, departments });
    },
);

// Создание відділу
router.post(
    "/",
    verifyToken,
    requireRole(USER_ROLES.ADMIN),
    async (req: Request, res: Response) => {
        const input = validateDepartmentCreateInput(req.body);
        const department = await createDepartment(input);

        sendSuccess(res, 201, {
            message: "Department created successfully",
            department,
        });
    },
);

// Обновление відділу
router.patch(
    "/:id",
    verifyToken,
    requireRole(USER_ROLES.ADMIN),
    async (req: Request, res: Response) => {
        const id = parseDepartmentIdParam(req.params.id);
        const input = validateDepartmentUpdateInput(req.body);
        const department = await updateDepartment(id, input);

        sendSuccess(res, 200, {
            message: "Department updated successfully",
            department,
        });
    },
);

// Удаление відділу
router.delete(
    "/:id",
    verifyToken,
    requireRole(USER_ROLES.ADMIN),
    async (req: Request, res: Response) => {
        const id = parseDepartmentIdParam(req.params.id);
        await deleteDepartment(id);

        sendSuccess(res, 200, { message: "Department deleted successfully" });
    },
);

export default router;
