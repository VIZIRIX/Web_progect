import { Router } from "express";
import type { Request, Response } from "express";
import { isManager, verifyToken } from "../middleware/auth.middleware.js";
import { AppError } from "../api/errors.js";
import { sendSuccess } from "../api/response.js";
import {
    cancelBooking,
    createBooking,
    listBookings,
    listUsers,
    rescheduleBooking,
} from "../services/booking.service.js";
import {
    parseBookingsListQuery,
    parseBookingIdParam,
    validateCreateBookingInput,
    validateRescheduleInput,
} from "../validators/booking.validators.js";

const router: Router = Router();

// Получение списка сотрудников для приглашения
router.get("/users", verifyToken, async (_req: Request, res: Response) => {
    const users = await listUsers();

    sendSuccess(res, 200, { users });
});

router.get("/", verifyToken, async (req: Request, res: Response) => {
    const filter = parseBookingsListQuery(req.query);
    const { bookings, totalCount } = await listBookings(filter);

    sendSuccess(res, 200, { count: bookings.length, total: totalCount, bookings });
});

router.post("/", verifyToken, async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
        throw new AppError("Authorization token missing", 401);
    }

    const input = validateCreateBookingInput(req.body, user.userId);
    const result = await createBooking(input);

    sendSuccess(res, 201, {
        message: result.recurring
            ? "Recurring bookings successfully created"
            : "Booking successfully created",
        count: result.bookings.length,
        bookings: result.bookings,
    });
});

router.patch("/:id", verifyToken, async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
        throw new AppError("Authorization token missing", 401);
    }

    const id = parseBookingIdParam(req.params.id);
    const times = validateRescheduleInput(req.body);

    const booking = await rescheduleBooking(id, times, {
        actorId: user.userId,
        isManager: isManager(user.role),
    });

    sendSuccess(res, 200, {
        message: "Booking successfully rescheduled",
        booking,
    });
});

router.delete("/:id", verifyToken, async (req: Request, res: Response) => {
    const user = req.user;

    if (!user) {
        throw new AppError("Authorization token missing", 401);
    }

    const id = parseBookingIdParam(req.params.id);

    await cancelBooking(id, {
        actorId: user.userId,
        role: user.role,
    });

    sendSuccess(res, 200, {
        message: "Booking successfully cancelled",
    });
});

export default router;
