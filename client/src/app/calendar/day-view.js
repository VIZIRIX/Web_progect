// Просмотр встреч за день: список, перенос и отмена собственных встреч.

import { getDateKey } from "../../lib/time.js";
import { state, elements, currentUserId, currentUserRole } from "./shared.js";
import { showRescheduleForm } from "./reschedule.js";
import { cancelBooking } from "./cancel.js";

export function showDayBookings(dayKey) {
    elements.bookingsList.innerHTML = "";

    const heading = document.createElement("h2");
    heading.textContent = `Встречи за ${dayKey}`;
    elements.bookingsList.appendChild(heading);

    const dayBookings = state.allBookings
        .filter((booking) => getDateKey(booking.startTime) === dayKey)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    if (dayBookings.length === 0) {
        const message = document.createElement("p");
        message.textContent = "На этот день бронирований нет.";
        elements.bookingsList.appendChild(message);
        return;
    }

    dayBookings.forEach((booking) => {
        const card = document.createElement("div");
        card.className = "booking-card";

        const title = document.createElement("h3");
        title.textContent = booking.title;

        const time = document.createElement("p");
        time.textContent = `${new Date(booking.startTime).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
        })} – ${new Date(booking.endTime).toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
        })}`;

        const room = document.createElement("p");
        room.textContent = `Комната: ${booking.room?.name || "Не указана"}`;

        const organizer = document.createElement("p");
        organizer.textContent = `Организатор: ${booking.user?.name || "Неизвестен"}`;

        card.append(title, time, room, organizer);

        const isOwner = Number(booking.userId) === currentUserId;
        const isManager = currentUserRole === "office_manager" || currentUserRole === "admin";

        if (isOwner) {
            const rescheduleButton = document.createElement("button");
            rescheduleButton.type = "button";
            rescheduleButton.className = "reschedule-button";
            rescheduleButton.textContent = "Перенести";
            rescheduleButton.addEventListener("click", () => {
                showRescheduleForm(booking, card);
            });
            card.appendChild(rescheduleButton);
        }

        if (isOwner || isManager) {
            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "cancel-booking-button";
            cancelButton.textContent = "Отменить бронирование";
            cancelButton.addEventListener("click", () => {
                cancelBooking(booking, cancelButton);
            });
            card.appendChild(cancelButton);
        }

        elements.bookingsList.appendChild(card);
    });
}
