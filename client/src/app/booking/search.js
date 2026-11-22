// Поиск свободных комнат: submit, renderRooms, selectRoom, clearSelectedRoom.

import { apiGet } from "../../api/client.js";
import { getBookingDateTime, getLocalDate } from "../../lib/time.js";
import { state, elements } from "./shared.js";

export function getSelectedEquipment() {
    return [...document.querySelectorAll(".equipment-checkbox:checked")].map((item) => item.value);
}

export function clearSelectedRoom() {
    state.selectedRoom = null;
    elements.bookingSection.classList.add("hidden");
}

export function renderRooms(rooms) {
    elements.roomsList.innerHTML = "";

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
        elements.roomsList.appendChild(card);
    });
}

export function selectRoom(room) {
    state.selectedRoom = room;

    elements.selectedRoomElement.textContent = `Выбрана комната: ${room.name}. Вместимость: ${room.capacity} чел.`;

    elements.bookingSection.classList.remove("hidden");
    elements.bookingStatus.textContent = "";

    elements.bookingSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });
}

export async function handleSearchSubmit() {
    const { searchStatus, dateInput, startInput, endInput, capacityInput } = elements;

    searchStatus.textContent = "";
    elements.roomsList.innerHTML = "";
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
}
