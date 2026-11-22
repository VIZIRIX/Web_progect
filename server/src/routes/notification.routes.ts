import { Router } from 'express';
import type { Request, Response } from 'express';
import { AppError } from '../api/errors.js';
import { sendSuccess } from '../api/response.js';
import { verifyToken } from '../middleware/auth.middleware.js';
import { listNotifications, markAsRead } from '../services/notification.service.js';
import {
    parseNotificationIdParam,
    parseNotificationListQuery
} from '../validators/notification.validators.js';

const router: Router = Router();

// Список уведомлений текущего пользователя (новые первыми)
router.get('/', verifyToken, async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
        throw new AppError('Authorization token missing', 401);
    }

    const { limit, offset } = parseNotificationListQuery(req.query);
    const notifications = await listNotifications(user.userId, { limit, offset });

    sendSuccess(res, 200, { notifications });
});

// Пометить уведомление как прочитанное (только для владельца)
router.patch('/:id/read', verifyToken, async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
        throw new AppError('Authorization token missing', 401);
    }

    const notificationId = parseNotificationIdParam(req.params.id);
    const result = await markAsRead(user.userId, notificationId);

    if (result.count === 0) {
        throw new AppError('Notification not found', 404);
    }

    sendSuccess(res, 200, { message: 'Notification marked as read' });
});

export default router;
