// Кабінет офіс-менеджера: кімнати (створення, редагування місткості/обладнання,
// блокування — на прибирання / ремонт), примусове скасування броней,
// звіт завантаженості кімнат (з списками: розгорнуття + пошук по названі).

import { apiGet, apiPatch, apiPost } from "../../api/client.js";
import { createExpandableList } from "../expandable-list.js";

const elements = {
    roomsList: document.getElementById("rooms-list"),
    roomsStatus: document.getElementById("rooms-status"),
    roomsSearch: document.getElementById("rooms-search"),
    roomCreateForm: document.getElementById("room-create-form"),
    roomCreateName: document.getElementById("room-create-name"),
    roomCreateCapacity: document.getElementById("room-create-capacity"),
    equipmentList: document.getElementById("room-create-equipment"),
    periodSelect: document.getElementById("period-select"),
    reportRefresh: document.getElementById("report-refresh"),
    reportSearch: document.getElementById("report-search"),
    utilizationBody: document.getElementById("utilization-body"),
    utilizationNote: document.getElementById("utilization-note"),
    adminLink: document.getElementById("admin-link"),
};

let equipment = [];

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
}

// Гейт по ролях: офіс-менеджер (адмін додатково через посилання в хедері)
const user = getUser();

if (!user.role || (user.role !== "office_manager" && user.role !== "admin")) {
    window.location.href = "/calendar/booking.html";
}

if (user.role === "admin") {
    elements.adminLink.hidden = false;
}

function fmtTime(ms) {
    const minutes = Math.round(ms / 60000);

    if (minutes <= 0) {
        return "0 м";
    }

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    if (hours && rest) {
        return `${hours} г ${rest} м`;
    }

    return hours ? `${hours} г` : `${rest} м`;
}

/* ---------- Обладнання ---------- */

async function loadEquipment() {
    try {
        const data = await apiGet("/api/rooms/equipment");
        equipment = data.equipment || [];

        elements.equipmentList.innerHTML = "";

        equipment.forEach((item) => {
            const label = document.createElement("label");
            label.className = "equipment-option";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "equipment-checkbox";
            checkbox.value = String(item.id);

            label.append(checkbox, document.createTextNode(item.name));
            elements.equipmentList.appendChild(label);
        });

        if (!equipment.length) {
            elements.equipmentList.textContent = "Оборудование пока не добавлено.";
        }
    } catch (error) {
        console.error(error);
        elements.equipmentList.textContent = "Не удалось загрузить оборудование.";
    }
}

/* ---------- Кімнати ---------- */

function createRoomEditForm(room) {
    const form = document.createElement("form");
    form.className = "room-edit-form";
    form.hidden = true;

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "room-edit-name";
    nameInput.value = room.name;

    const capacityInput = document.createElement("input");
    capacityInput.type = "number";
    capacityInput.className = "room-edit-capacity";
    capacityInput.min = "1";
    capacityInput.value = room.capacity;

    const equipmentRow = document.createElement("div");
    equipmentRow.className = "room-edit-equipment-row";

    equipment.forEach((item) => {
        const label = document.createElement("label");
        label.className = "equipment-option";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "room-edit-equipment";
        checkbox.value = String(item.id);
        checkbox.checked = room.equipment.some((link) => link.equipmentId === item.id);

        label.append(checkbox, document.createTextNode(item.name));
        equipmentRow.appendChild(label);
    });

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "primary-button";
    saveButton.textContent = "Зберегти";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "ghost-button";
    cancelButton.textContent = "Скасувати";

    form.append(nameInput, capacityInput, equipmentRow, saveButton, cancelButton);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const equipmentIds = [
            ...form.querySelectorAll(".room-edit-equipment:checked"),
        ].map((checkbox) => Number(checkbox.value));

        const name = nameInput.value.trim();
        const capacity = Number(capacityInput.value);

        if (!name || !Number.isSafeInteger(capacity) || capacity < 1) {
            alert("Укажите название комнаты и вмісткість не менше 1.");
            return;
        }

        try {
            await apiPatch(`/api/rooms/${room.id}`, { name, capacity, equipmentIds });
            await loadRooms();
        } catch (error) {
            alert(error.message);
        }
    });

    cancelButton.addEventListener("click", () => {
        form.hidden = true;
    });

    return form;
}

function createRoomCard(room) {
    const card = document.createElement("article");
    card.className = "room-card" + (room.isBlocked ? " blocked" : "");

    const head = document.createElement("header");

    const title = document.createElement("h3");
    title.textContent = room.name;

    if (room.isBlocked) {
        const badge = document.createElement("span");
        badge.className = "badge-blocked";
        badge.textContent = "Заблокована";
        title.appendChild(badge);
    }

    const actions = document.createElement("div");
    actions.className = "room-actions";

    const blockButton = document.createElement("button");
    blockButton.type = "button";
    blockButton.className = "ghost-button";
    blockButton.textContent = room.isBlocked ? "Розблокувати" : "Блокувати";
    blockButton.dataset.roomId = String(room.id);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost-button";
    editButton.textContent = "Редагувати";
    editButton.dataset.roomId = String(room.id);

    actions.append(blockButton, editButton);
    head.append(title, actions);

    const meta = document.createElement("p");
    meta.className = "room-meta";
    meta.textContent = `Вмісткість: ${room.capacity} чол.`;

    const equipmentLine = document.createElement("p");
    equipmentLine.className = "room-equipment-line";
    equipmentLine.innerHTML = room.equipment
        .map((link) => `<span class="room-equipment-tag">${link.equipment.name}</span>`)
        .join("");

    const editForm = createRoomEditForm(room);

    card.append(head, meta, equipmentLine, editForm);

    blockButton.addEventListener("click", async () => {
        try {
            await apiPatch(`/api/rooms/${room.id}/block`, { isBlocked: !room.isBlocked });
            await loadRooms();
        } catch (error) {
            alert(error.message);
        }
    });

    editButton.addEventListener("click", () => {
        editForm.hidden = false;
    });

    return card;
}

async function loadRooms() {
    try {
        const data = await apiGet("/api/rooms/management");

        const list = createExpandableList({
            container: elements.roomsList,
            rows: data.rooms,
            renderRow: (room) => createRoomCard(room),
            filterFn: (room, query) => room.name.toLowerCase().includes(query.toLowerCase()),
            initialVisibleCount: 2,
            searchInput: elements.roomsSearch,
        });

        elements.roomsList.scrollTop = 0;
        elements.roomsStatus.textContent = data.rooms.length ? `Кімнат: ${data.rooms.length}` : "Комнаты не найдены.";
        list.render();
    } catch (error) {
        console.error(error);
        elements.roomsStatus.textContent = "Не удалось загрузить комнаты.";
    }
}

elements.roomCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = elements.roomCreateName.value.trim();
    const capacity = Number(elements.roomCreateCapacity.value);
    const equipmentIds = [
        ...elements.equipmentList.querySelectorAll(".equipment-checkbox:checked"),
    ].map((checkbox) => Number(checkbox.value));

    if (!name || !Number.isSafeInteger(capacity) || capacity < 1) {
        alert("Укажите название и вмісткість комнаты.");
        return;
    }

    try {
        await apiPost("/api/rooms", { name, capacity, equipmentIds });
        elements.roomCreateForm.reset();
        await loadRooms();
        elements.roomsList.scrollTop = 0;
    } catch (error) {
        alert(error.message);
    }
});

/* ---------- Звіт завантаженості кімнат ---------- */

function getPeriodRange(period) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (period === "week") {
        const shift = now.getDay() === 0 ? 6 : now.getDay() - 1;
        const from = new Date(year, month, now.getDate() - shift);
        return { from, to: new Date(year, month, now.getDate() - shift + 7) };
    }

    if (period === "quarter") {
        const qStart = Math.floor(month / 3) * 3;
        return { from: new Date(year, qStart, 1), to: new Date(year, qStart + 3, 1) };
    }

    if (period === "year") {
        return { from: new Date(year, 0, 1), to: new Date(year + 1, 0, 1) };
    }

    return { from: new Date(year, month, 1), to: new Date(year, month + 1, 1) };
}

function createUtilizationRow(room) {
    const tr = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = room.roomName + (room.isBlocked ? " (заблокована)" : "");

    const capacityCell = document.createElement("td");
    capacityCell.textContent = `${room.capacity} чол.`;

    const busyCell = document.createElement("td");
    busyCell.textContent = `${fmtTime(room.busyMs)} (${room.totalBookings})`;

    const freeCell = document.createElement("td");
    freeCell.textContent = fmtTime(room.freeMs);

    const utilCell = document.createElement("td");
    const fill = document.createElement("div");
    fill.className = "util-fill";
    fill.style.width = `${Math.min(100, Math.max(0, room.utilizationPercent))}%`;
    const bar = document.createElement("div");
    bar.className = "util-bar";
    bar.appendChild(fill);
    utilCell.textContent = `${Math.round(room.utilizationPercent)}% `;
    utilCell.appendChild(bar);

    tr.append(nameCell, capacityCell, busyCell, freeCell, utilCell);

    return tr;
}

async function loadUtilization() {
    const { from, to } = getPeriodRange(elements.periodSelect.value);

    try {
        const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
        const data = await apiGet(`/api/rooms/utilization?${params}`);

        createExpandableList({
            container: elements.utilizationBody,
            rows: data.rooms,
            renderRow: (room) => createUtilizationRow(room),
            filterFn: (room, query) => room.roomName.toLowerCase().includes(query.toLowerCase()),
            initialVisibleCount: 8,
            searchInput: elements.reportSearch,
        }).render();

        elements.utilizationNote.textContent =
            data.rooms.length
                ? `За ${from.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} – ${to.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`
                : "Нет данных о бронированиях за указанный период.";
    } catch (error) {
        console.error(error);
        elements.utilizationNote.textContent = error.message;
    }
}

/* ---------- Підключення ---------- */

loadEquipment();
loadRooms();
loadUtilization();

elements.reportRefresh.addEventListener("click", () => {
    elements.reportSearch.value = "";
    loadUtilization();
});

elements.periodSelect.addEventListener("change", () => {
    elements.reportSearch.value = "";
    loadUtilization();
});
