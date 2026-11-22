// Загрузка бронирований за месяц.

import { apiGet } from "../../api/client.js";
import { getDateKey } from "../../lib/time.js";
import { state, elements } from "./shared.js";
import { renderCalendar } from "./render-calendar.js";

export async function loadBookings() {
    const currentRequest = ++state.requestNumber;

    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();

    elements.statusElement.textContent = "Загрузка бронирований...";

    try {
        const data = await apiGet(
            `/api/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );

        if (!Array.isArray(data.bookings)) {
            throw new Error("Сервер вернул некорректный список бронирований");
        }

        if (currentRequest !== state.requestNumber) {
            return;
        }

        state.allBookings = data.bookings;

        const bookingsByDay = new Map();

        state.allBookings.forEach((booking) => {
            const dayKey = getDateKey(booking.startTime);
            bookingsByDay.set(dayKey, (bookingsByDay.get(dayKey) || 0) + 1);
        });

        renderCalendar(bookingsByDay);

        elements.statusElement.textContent = `Бронирований в этом месяце: ${state.allBookings.length}`;
    } catch (error) {
        if (currentRequest !== state.requestNumber) return;

        console.error("Ошибка загрузки:", error);
        elements.statusElement.textContent = error.message;
    }
}
