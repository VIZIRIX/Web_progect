import { Router } from "express";
import type { Request, Response } from "express";
import {
    requireRole,
    USER_ROLES,
    verifyToken,
} from "../middleware/auth.middleware.js";
import { sendSuccess } from "../api/response.js";
import { listUsersForManagement, setUserRole } from "../services/user.service.js";
import { parseUserIdParam, validateRoleInput } from "../validators/user.validators.js";

const router: Router = Router();

// Список сотрудников с ролями и відділами (только администратор)
router.get(
    "/",
    verifyToken,
    requireRole(USER_ROLES.ADMIN),
    async (_req: Request, res: Response) => {
        const users = await listUsersForManagement();

        sendSuccess(res, 200, { count: users.length, users });
    },
);

// Зміна ролі сотрудника (только администратор)
router.patch(
    "/:id/role",
    verifyToken,
    requireRole(USER_ROLES.ADMIN),
    async (req: Request, res: Response) => {
        const userId = parseUserIdParam(req.params.id);
        const role = validateRoleInput(req.body);

        const user = await setUserRole(userId, role);

        sendSuccess(res, 200, {
            message: "User role updated",
            user: { id: user.id, role: user.role },
        });
    },
);

export default router;
