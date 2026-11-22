// Отрисовка сетки календаря на месяц.

import { state, elements, months } from "./shared.js";
import { showDayBookings } from "./day-view.js";

export function renderCalendar(bookingsByDay = new Map()) {
    if (!elements.monthYear || !elements.daysContainer) return;

    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();

    elements.monthYear.textContent = `${months[month]} ${year}`;
    elements.daysContainer.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const emptyDays = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < emptyDays; i++) {
        const empty = document.createElement("div");
        empty.className = "day empty";
        elements.daysContainer.appendChild(empty);
    }

    const today = new Date();

    for (let day = 1; day <= lastDay; day++) {
        const dayElement = document.createElement("div");
        dayElement.className = "day";

        const dayKey = [
            year,
            String(month + 1).padStart(2, "0"),
            String(day).padStart(2, "0"),
        ].join("-");

        dayElement.textContent = day;

        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayElement.classList.add("today");
        }

        const count = bookingsByDay.get(dayKey) || 0;

        if (count > 0) {
            dayElement.classList.add("has-bookings");

            const badge = document.createElement("span");
            badge.className = "booking-count";
            badge.textContent = count;

            dayElement.appendChild(badge);
            dayElement.title = `Бронирований: ${count}`;
        }

        dayElement.addEventListener("click", () => {
            showDayBookings(dayKey);
        });

        elements.daysContainer.appendChild(dayElement);
    }
}
