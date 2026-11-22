// ==============================
// Элементы страницы
// ==============================

const monthYear = document.getElementById("month-year");
const daysContainer = document.getElementById("days-container");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const calendar = document.querySelector(".calendar");
const calendarHeader = document.querySelector(".calendar-header");

import { apiDelete, apiGet, apiPatch, getToken } from "../src/lib/api.js";

let currentUser = null;

try {
    currentUser = JSON.parse(localStorage.getItem("user"));
} catch (error) {
    console.error("Ошибка чтения пользователя:", error);
}

const currentUserId = Number(currentUser?.id ?? currentUser?.userId);
const currentUserRole = currentUser?.role;

if (!getToken() || !currentUser) {
    window.location.href = "/";
}

// ==============================
// Состояние календаря
// ==============================

const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
];

let currentDate = new Date();
let allBookings = [];
let requestNumber = 0;

// ==============================
// Служебные элементы
// ==============================

const statusElement = document.createElement("div");
statusElement.className = "calendar-status";
statusElement.setAttribute("role", "status");

const bookingsList = document.createElement("div");
bookingsList.className = "bookings-list";

if (calendar) {
    calendar.appendChild(bookingsList);

    if (calendarHeader) {
        calendar.insertBefore(statusElement, calendarHeader.nextSibling);
    } else {
        calendar.prepend(statusElement);
    }
}

// ==============================
// Вспомогательные функции
// ==============================

function getDateKey(value) {
    const date = new Date(value);

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function getLocalDateTime(date, time) {
    if (!date || !time) {
        return null;
    }

    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes] = time.split(":").map(Number);

    const result = new Date(year, month - 1, day, hours, minutes);

    if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day ||
        result.getHours() !== hours ||
        result.getMinutes() !== minutes
    ) {
        return null;
    }

    return result;
}

function getDateInputValue(value) {
    const date = new Date(value);
    return getDateKey(date);
}

function getTimeInputValue(value) {
    const date = new Date(value);

    return [
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0"),
    ].join(":");
}

// ==============================
// Загрузка бронирований
// ==============================

async function loadBookings() {
    const currentRequest = ++requestNumber;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();

    statusElement.textContent = "Загрузка бронирований...";

    try {
        const data = await apiGet(
            `/api/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        );

        if (!Array.isArray(data.bookings)) {
            throw new Error("Сервер вернул некорректный список бронирований");
        }

        if (currentRequest !== requestNumber) {
            return;
        }

        allBookings = data.bookings;

        const bookingsByDay = new Map();

        allBookings.forEach((booking) => {
            const dayKey = getDateKey(booking.startTime);

            bookingsByDay.set(dayKey, (bookingsByDay.get(dayKey) || 0) + 1);
        });

        renderCalendar(bookingsByDay);

        statusElement.textContent = `Бронирований в этом месяце: ${allBookings.length}`;
    } catch (error) {
        if (currentRequest !== requestNumber) return;

        console.error("Ошибка загрузки:", error);
        statusElement.textContent = error.message;
    }
}

// ==============================
// Просмотр встреч за день
// ==============================

function showDayBookings(dayKey) {
    bookingsList.innerHTML = "";

    const heading = document.createElement("h2");
    heading.textContent = `Встречи за ${dayKey}`;
    bookingsList.appendChild(heading);

    const dayBookings = allBookings
        .filter((booking) => getDateKey(booking.startTime) === dayKey)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    if (dayBookings.length === 0) {
        const message = document.createElement("p");
        message.textContent = "На этот день бронирований нет.";
        bookingsList.appendChild(message);
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

        // Перенос собственной встречи
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

        // Отмена встречи
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

        bookingsList.appendChild(card);
    });
}

// ==============================
// Перенос бронирования
// ==============================

function showRescheduleForm(booking, card) {
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
            currentDate = new Date(start.getFullYear(), start.getMonth(), 1);

            await loadBookings();

            // Показываем встречи уже за новую дату
            showDayBookings(getDateKey(start));

            statusElement.textContent = "Бронирование успешно перенесено.";
        } catch (error) {
            console.error("Ошибка переноса:", error);
            alert(error.message);

            saveButton.disabled = false;
            saveButton.textContent = "Сохранить";
        }
    });

    card.appendChild(form);
}

// ==============================
// Отмена бронирования
// ==============================

async function cancelBooking(booking, button) {
    const confirmed = confirm(`Вы действительно хотите отменить встречу "${booking.title}"?`);

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Отмена...";

    try {
        await apiDelete(`/api/bookings/${booking.id}`);

        await loadBookings();

        statusElement.textContent = "Бронирование успешно отменено.";

        bookingsList.innerHTML = "";
    } catch (error) {
        console.error("Ошибка отмены:", error);
        alert(error.message);

        button.disabled = false;
        button.textContent = "Отменить бронирование";
    }
}

// ==============================
// Отображение календаря
// ==============================

function renderCalendar(bookingsByDay = new Map()) {
    if (!monthYear || !daysContainer) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYear.textContent = `${months[month]} ${year}`;
    daysContainer.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const emptyDays = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < emptyDays; i++) {
        const empty = document.createElement("div");
        empty.className = "day empty";
        daysContainer.appendChild(empty);
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

        daysContainer.appendChild(dayElement);
    }
}

// ==============================
// Переключение месяцев
// ==============================

prevBtn?.addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);

    bookingsList.innerHTML = "";
    loadBookings();
});

nextBtn?.addEventListener("click", () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

    bookingsList.innerHTML = "";
    loadBookings();
});

// ==============================
// Запуск
// ==============================

if (getToken() && currentUser) {
    loadBookings();
}
