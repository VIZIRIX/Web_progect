// Перенос бронирования (форма "Новая дата/время" + PATCH).

import { apiPatch } from "../../api/client.js";
import {
    getDateKey,
    getDateInputValue,
    getTimeInputValue,
    getLocalDateTime,
} from "../../lib/time.js";
import { state, elements } from "./shared.js";
import { loadBookings } from "./load-bookings.js";
import { showDayBookings } from "./day-view.js";

export function showRescheduleForm(booking, card) {
    if (card.querySelector(".reschedule-form")) {
        return;
    }

    const form = document.createElement("form");
    form.className = "reschedule-form";

    const dateLabel = document.createElement("label");
    dateLabel.textContent = "Новая дата";

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.required = true;
    dateInput.value = getDateInputValue(booking.startTime);

    const startLabel = document.createElement("label");
    startLabel.textContent = "Начало встречи";

    const startInput = document.createElement("input");
    startInput.type = "time";
    startInput.required = true;
    startInput.value = getTimeInputValue(booking.startTime);

    const endLabel = document.createElement("label");
    endLabel.textContent = "Окончание встречи";

    const endInput = document.createElement("input");
    endInput.type = "time";
    endInput.required = true;
    endInput.value = getTimeInputValue(booking.endTime);

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = "Сохранить";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Закрыть";

    closeButton.addEventListener("click", () => form.remove());

    form.append(
        dateLabel,
        dateInput,
        startLabel,
        startInput,
        endLabel,
        endInput,
        saveButton,
        closeButton,
    );

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const start = getLocalDateTime(dateInput.value, startInput.value);
        const end = getLocalDateTime(dateInput.value, endInput.value);

        if (!start || !end) {
            alert("Укажите корректную дату и время.");
            return;
        }

        if (end <= start) {
            alert("Время окончания должно быть позже времени начала.");
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Сохранение...";

        try {
            await apiPatch(`/api/bookings/${booking.id}`, {
                startTime: start.toISOString(),
                endTime: end.toISOString(),
            });

            // Переключаем календарь на месяц новой даты
            state.currentDate = new Date(start.getFullYear(), start.getMonth(), 1);

            await loadBookings();

            // Показываем встречи уже за новую дату
            showDayBookings(getDateKey(start));

            elements.statusElement.textContent = "Бронирование успешно перенесено.";
        } catch (error) {
            console.error("Ошибка переноса:", error);
            alert(error.message);

            saveButton.disabled = false;
            saveButton.textContent = "Сохранить";
        }
    });

    card.appendChild(form);
}
