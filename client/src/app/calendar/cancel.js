// Отмена бронирования (DELETE + перезагрузка списка).

import { apiDelete } from "../../api/client.js";
import { elements } from "./shared.js";
import { loadBookings } from "./load-bookings.js";

export async function cancelBooking(booking, button) {
    const confirmed = confirm(`Вы действительно хотите отменить встречу "${booking.title}"?`);

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Отмена...";

    try {
        await apiDelete(`/api/bookings/${booking.id}`);

        await loadBookings();

        elements.statusElement.textContent = "Бронирование успешно отменено.";

        elements.bookingsList.innerHTML = "";
    } catch (error) {
        console.error("Ошибка отмены:", error);
        alert(error.message);

        button.disabled = false;
        button.textContent = "Отменить бронирование";
    }
}
