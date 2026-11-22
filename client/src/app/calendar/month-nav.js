// Переключение месяцев (« Май 2026 »).

import { state, elements } from "./shared.js";
import { loadBookings } from "./load-bookings.js";

export function initMonthNav() {
    elements.prevBtn?.addEventListener("click", () => {
        state.currentDate = new Date(
            state.currentDate.getFullYear(),
            state.currentDate.getMonth() - 1,
            1,
        );

        elements.bookingsList.innerHTML = "";
        loadBookings();
    });

    elements.nextBtn?.addEventListener("click", () => {
        state.currentDate = new Date(
            state.currentDate.getFullYear(),
            state.currentDate.getMonth() + 1,
            1,
        );

        elements.bookingsList.innerHTML = "";
        loadBookings();
    });
}
