// Отправка формы бронирования (POST /api/bookings) + валидация recurrenceCount.

import { apiPost } from "../../api/client.js";
import { getBookingDateTime } from "../../lib/time.js";
import { elements, state } from "./shared.js";
import { getSelectedParticipants } from "./participants.js";

function validateRecurrenceCount() {
    const checked = elements.recurringCheckbox.checked;
    const value = Number(elements.recurrenceCountInput.value);

    return checked ? Number.isInteger(value) && value >= 2 && value <= 52 : true;
}

export async function handleBookingFormSubmit() {
    const { bookingStatus, recurringCheckbox, recurrenceCountInput, bookingForm } = elements;

    if (!state.selectedRoom) {
        bookingStatus.textContent = "Сначала выберите комнату.";
        return;
    }

    const title = elements.meetingTitleInput.value.trim();

    if (!title) {
        bookingStatus.textContent = "Введите название встречи.";
        return;
    }

    if (!validateRecurrenceCount()) {
        bookingStatus.textContent = "Количество встреч должно быть от 2 до 52.";
        return;
    }

    const submitButton = bookingForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Сохранение...";

    try {
        await apiPost("/api/bookings", {
            roomId: state.selectedRoom.id,
            title,
            startTime: getBookingDateTime(elements.dateInput.value, elements.startInput.value),
            endTime: getBookingDateTime(elements.dateInput.value, elements.endInput.value),
            participantIds: getSelectedParticipants(),
            isRecurring: recurringCheckbox.checked,
            recurrenceCount: recurringCheckbox.checked ? Number(recurrenceCountInput.value) : 1,
        });

        bookingStatus.textContent = "Бронирование успешно создано!";

        setTimeout(() => {
            window.location.href = "/calendar/booking.html";
        }, 1200);
    } catch (error) {
        console.error(error);
        bookingStatus.textContent = error.message;

        if (error.message.includes("already booked") || error.message.includes("blocked")) {
            elements.searchForm.requestSubmit();
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Забронировать комнату";
    }
}
