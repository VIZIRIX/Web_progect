import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import type { Request, Response } from 'express';

const router: Router = Router();

router.post('/', verifyToken, async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { roomId, startTime, endTime } = req.body;

    try {
        return res.status(201).json({ 
            status: 'success', 
            message: 'Booking successfully created!',
            userId 
        });
    } catch (error) {
        console.error('Error creating booking:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;