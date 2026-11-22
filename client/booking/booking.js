import { apiGet, apiPost, getToken } from "../src/lib/api.js";
import { getBookingDateTime, getLocalDate } from "../src/lib/time.js";

if (!getToken()) {
    window.location.href = "/";
}

const searchForm = document.getElementById("search-form");
const bookingForm = document.getElementById("booking-form");

const dateInput = document.getElementById("booking-date");
const startInput = document.getElementById("start-time");
const endInput = document.getElementById("end-time");
const capacityInput = document.getElementById("capacity");

const equipmentList = document.getElementById("equipment-list");
const participantsList = document.getElementById("participants-list");
const roomsList = document.getElementById("rooms-list");

const searchStatus = document.getElementById("search-status");
const bookingSection = document.getElementById("booking-section");
const selectedRoomElement = document.getElementById("selected-room");
const bookingStatus = document.getElementById("booking-status");
const recurringCheckbox = document.getElementById("recurring-booking");
const recurringOptions = document.getElementById("recurring-options");
const recurrenceCountInput = document.getElementById("recurrence-count");

let selectedRoom = null;
// Настройки еженедельного повторения
recurringCheckbox.addEventListener("change", () => {
    recurringOptions.classList.toggle("hidden", !recurringCheckbox.checked);
});

dateInput.min = getLocalDate();
dateInput.value = getLocalDate();

// Получение выбранного оборудования
function getSelectedEquipment() {
    return [...document.querySelectorAll(".equipment-checkbox:checked")].map((item) => item.value);
}

// Получение выбранных участников
function getSelectedParticipants() {
    return [...document.querySelectorAll(".participant-checkbox:checked")].map((item) =>
        Number(item.value),
    );
}

// Сброс выбранной комнаты при изменении параметров
function clearSelectedRoom() {
    selectedRoom = null;
    bookingSection.classList.add("hidden");
}

[dateInput, startInput, endInput, capacityInput, equipmentList].forEach((element) =>
    element.addEventListener("change", clearSelectedRoom),
);

// Загрузка оборудования
async function loadEquipment() {
    try {
        const data = await apiGet("/api/rooms/equipment");

        equipmentList.innerHTML = "";

        data.equipment.forEach((item) => {
            const label = document.createElement("label");
            label.className = "equipment-option";

            label.innerHTML = `
                <input type="checkbox" class="equipment-checkbox" value="${item.id}">
                <span></span>
            `;

            label.querySelector("span").textContent = item.name;
            equipmentList.appendChild(label);
        });

        if (!data.equipment.length) {
            equipmentList.textContent = "Оборудование пока не добавлено.";
        }
    } catch (error) {
        console.error(error);
        equipmentList.textContent = "Не удалось загрузить оборудование.";
    }
}

// Загрузка сотрудников
async function loadUsers() {
    try {
        const data = await apiGet("/api/bookings/users");

        participantsList.innerHTML = "";

        if (!data.users.length) {
            participantsList.textContent = "Сотрудники не найдены.";
            return;
        }

        data.users.forEach((user) => {
            const label = document.createElement("label");
            label.className = "participant-option";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "participant-checkbox";
            checkbox.value = user.id;

            const info = document.createElement("span");
            info.textContent =
                `${user.name} (${user.email})` +
                (user.department?.name ? ` — ${user.department.name}` : "");

            label.append(checkbox, info);
            participantsList.appendChild(label);
        });
    } catch (error) {
        console.error(error);
        participantsList.textContent = "Не удалось загрузить сотрудников.";
    }
}

// Поиск свободных комнат
searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    roomsList.innerHTML = "";
    clearSelectedRoom();

    const date = dateInput.value;
    const startTime = startInput.value;
    const endTime = endInput.value;

    if (!date || !startTime || !endTime) {
        searchStatus.textContent = "Заполните дату и время встречи.";
        return;
    }

    if (date < getLocalDate()) {
        searchStatus.textContent = "Нельзя выбрать прошедшую дату.";
        return;
    }

    if (endTime <= startTime) {
        searchStatus.textContent = "Время окончания должно быть позже начала.";
        return;
    }

    const params = new URLSearchParams({
        startTime: getBookingDateTime(date, startTime),
        endTime: getBookingDateTime(date, endTime),
    });

    if (capacityInput.value) {
        params.set("capacity", capacityInput.value);
    }

    const equipmentIds = getSelectedEquipment();

    if (equipmentIds.length) {
        params.set("equipmentIds", equipmentIds.join(","));
    }

    searchStatus.textContent = "Поиск свободных комнат...";

    try {
        const data = await apiGet(`/api/rooms/available?${params}`);

        if (!data.rooms.length) {
            searchStatus.textContent = "Свободных комнат не найдено.";
            return;
        }

        searchStatus.textContent = `Найдено комнат: ${data.rooms.length}`;
        renderRooms(data.rooms);
    } catch (error) {
        console.error(error);
        searchStatus.textContent = error.message;
    }
});

// Отображение найденных комнат
function renderRooms(rooms) {
    roomsList.innerHTML = "";

    rooms.forEach((room) => {
        const card = document.createElement("div");
        card.className = "room-card";

        const title = document.createElement("h3");
        title.textContent = room.name;

        const capacity = document.createElement("p");
        capacity.textContent = `Вместимость: ${room.capacity} чел.`;

        const equipment = document.createElement("p");
        const names = room.equipment.map((item) => item.equipment.name);
        equipment.textContent = `Оборудование: ${names.join(", ") || "Отсутствует"}`;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "primary-button";
        button.textContent = "Выбрать комнату";
        button.addEventListener("click", () => selectRoom(room));

        card.append(title, capacity, equipment, button);
        roomsList.appendChild(card);
    });
}

// Выбор комнаты
function selectRoom(room) {
    selectedRoom = room;

    selectedRoomElement.textContent = `Выбрана комната: ${room.name}. Вместимость: ${room.capacity} чел.`;

    bookingSection.classList.remove("hidden");
    bookingStatus.textContent = "";

    bookingSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
}

// Создание бронирования
bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!selectedRoom) {
        bookingStatus.textContent = "Сначала выберите комнату.";
        return;
    }

    const title = document.getElementById("meeting-title").value.trim();

    if (!title) {
        bookingStatus.textContent = "Введите название встречи.";
        return;
    }

    if (
        recurringCheckbox.checked &&
        (!Number.isInteger(Number(recurrenceCountInput.value)) ||
            Number(recurrenceCountInput.value) < 2 ||
            Number(recurrenceCountInput.value) > 52)
    ) {
        bookingStatus.textContent = "Количество встреч должно быть от 2 до 52.";
        return;
    }

    const submitButton = bookingForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Сохранение...";

    try {
        await apiPost("/api/bookings", {
            roomId: selectedRoom.id,
            title,
            startTime: getBookingDateTime(dateInput.value, startInput.value),
            endTime: getBookingDateTime(dateInput.value, endInput.value),
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
            searchForm.requestSubmit();
        }
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Забронировать комнату";
    }
});

// Запуск загрузки данных
loadEquipment();
loadUsers();
