import { Router } from "express";
import type { Request, Response } from "express";
import { requireRole, USER_ROLES, verifyToken } from "../middleware/auth.middleware.js";
import { sendSuccess } from "../api/response.js";
import { getSettings, updateSettings } from "../services/settings.service.js";
import { validateSettingsUpdate } from "../validators/settings.validators.js";

const router: Router = Router();

// Получение настроек системы
router.get("/", verifyToken, async (_req: Request, res: Response) => {
    const settings = await getSettings();

    sendSuccess(res, 200, { settings });
});

// Изменение настроек — только администратор
router.put("/", verifyToken, requireRole(USER_ROLES.ADMIN), async (req: Request, res: Response) => {
    const settings = await updateSettings(validateSettingsUpdate(req.body));

    sendSuccess(res, 200, {
        message: "Settings updated",
        settings,
    });
});

export default router;
