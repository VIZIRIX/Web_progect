// Адміністрування (лише для ролі admin):
// - налаштування системи (робочі години, макс. тривалість бронювання);
// - відділи (список з пошуком/розгорненням + додавання/редагування/видалення);
// - сотрудники та права (список з пошуком/розгорненням + зміна ролі).

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../../api/client.js";
import { createExpandableList } from "../expandable-list.js";

const elements = {
    settingsForm: document.getElementById("settings-form"),
    settingsWorkStart: document.getElementById("settings-work-start"),
    settingsWorkEnd: document.getElementById("settings-work-end"),
    settingsMaxHours: document.getElementById("settings-max-hours"),
    settingsStatus: document.getElementById("settings-status"),
    departmentForm: document.getElementById("department-form"),
    departmentName: document.getElementById("department-name"),
    departmentsList: document.getElementById("departments-list"),
    departmentsStatus: document.getElementById("departments-status"),
    departmentsSearch: document.getElementById("departments-search"),
    usersTable: document.getElementById("users-table"),
    usersSearch: document.getElementById("users-search"),
    usersStatus: document.getElementById("users-status"),
};

const ROLE_LABELS = {
    employee: "employee",
    office_manager: "office_manager",
    admin: "admin",
};

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
}

// Гейт по ролях: лише адміністратор
const user = getUser();

if (!user.role || user.role !== "admin") {
    window.location.href = "/calendar/booking.html";
}

/* ---------- Налаштування системи ---------- */

async function loadSettings() {
    try {
        const data = await apiGet("/api/settings");
        const settings = data.settings;

        elements.settingsWorkStart.value = settings.workStart;
        elements.settingsWorkEnd.value = settings.workEnd;
        elements.settingsMaxHours.value = settings.maxBookingHours;
    } catch (error) {
        console.error(error);
        elements.settingsStatus.textContent = error.message;
    }
}

elements.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const workStart = elements.settingsWorkStart.value;
    const workEnd = elements.settingsWorkEnd.value;
    const maxBookingHours = Number(elements.settingsMaxHours.value);

    if (!workStart || !workEnd) {
        elements.settingsStatus.textContent = "Заповніть робочий час.";
        return;
    }

    try {
        await apiPut("/api/settings", { workStart, workEnd, maxBookingHours });
        elements.settingsStatus.textContent = "Налаштування збережено.";
    } catch (error) {
        elements.settingsStatus.textContent = error.message;
    }
});

/* ---------- Відділи ---------- */

function createDepartmentItem(department) {
    const item = document.createElement("div");
    item.className = "admin-list-item";

    const nameDisplay = document.createElement("span");
    nameDisplay.className = "admin-list-item-name";
    nameDisplay.textContent = department.name;

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = department.name;
    nameInput.className = "admin-list-item-input";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost-button";
    editButton.textContent = "Редагувати";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "ghost-button";
    saveButton.textContent = "Зберегти";
    saveButton.hidden = true;

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "ghost-button";
    cancelButton.textContent = "Скасувати";
    cancelButton.hidden = true;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost-button ghost-button-danger";
    deleteButton.textContent = "Видалити";

    item.append(nameDisplay, nameInput, editButton, saveButton, cancelButton, deleteButton);

    function showEditing() {
        nameDisplay.hidden = true;
        nameInput.hidden = false;
        editButton.hidden = true;
        saveButton.hidden = false;
        cancelButton.hidden = false;
    }

    function showEditable() {
        nameDisplay.hidden = false;
        nameInput.hidden = true;
        editButton.hidden = false;
        saveButton.hidden = true;
        cancelButton.hidden = true;
    }

    editButton.addEventListener("click", () => showEditing());
    cancelButton.addEventListener("click", () => showEditable());

    saveButton.addEventListener("click", async () => {
        const name = nameInput.value.trim();

        if (!name) {
            alert("Название не може бути порожнім.");
            return;
        }

        try {
            await apiPatch(`/api/departments/${department.id}`, { name });
            await loadDepartments();
        } catch (error) {
            alert(error.message);
        }
    });

    deleteButton.addEventListener("click", async () => {
        if (!confirm(`Видалити відділ «${department.name}»?`)) {
            return;
        }

        try {
            await apiDelete(`/api/departments/${department.id}`);
            await loadDepartments();
        } catch (error) {
            alert(error.message);
        }
    });

    return item;
}

async function loadDepartments() {
    try {
        const data = await apiGet("/api/departments");

        createExpandableList({
            container: elements.departmentsList,
            rows: data.departments,
            renderRow: (department) => createDepartmentItem(department),
            filterFn: (department, query) => department.name.toLowerCase().includes(query.toLowerCase()),
            initialVisibleCount: 6,
            searchInput: elements.departmentsSearch,
        }).render();

        elements.departmentsStatus.textContent = data.departments.length
            ? `Відділів: ${data.departments.length}`
            : "Нет відділів.";
    } catch (error) {
        console.error(error);
        elements.departmentsStatus.textContent = error.message;
    }
}

elements.departmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = elements.departmentName.value.trim();

    if (!name) {
        alert("Введіть назву відділу.");
        return;
    }

    try {
        await apiPost("/api/departments", { name });
        elements.departmentName.value = "";
        await loadDepartments();
    } catch (error) {
        alert(error.message);
    }
});

/* ---------- Сотрудники та права ---------- */

function createUserRow(userRecord) {
    const tr = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = userRecord.name;

    const emailCell = document.createElement("td");
    emailCell.textContent = userRecord.email;

    const roleCell = document.createElement("td");
    const roleSelect = document.createElement("select");

    ["employee", "office_manager", "admin"].forEach((role) => {
        const option = document.createElement("option");
        option.value = role;
        option.textContent = ROLE_LABELS[role];

        if (role === userRecord.role) {
            option.selected = true;
        }

        roleSelect.appendChild(option);
    });

    const departmentCell = document.createElement("td");
    departmentCell.textContent = userRecord.department?.name ?? "—";

    const actionsCell = document.createElement("td");
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "primary-button";
    saveButton.style.padding = "8px 12px";
    saveButton.style.fontSize = "13px";
    saveButton.textContent = "Зберегти";

    saveButton.addEventListener("click", async () => {
        try {
            await apiPatch(`/api/users/${userRecord.id}/role`, { role: roleSelect.value });
            await loadUsers();
        } catch (error) {
            alert(error.message);
        }
    });

    actionsCell.appendChild(saveButton);
    tr.append(nameCell, emailCell, roleCell, departmentCell, actionsCell);

    return tr;
}

async function loadUsers() {
    try {
        const data = await apiGet("/api/users");

        const table = document.createElement("table");
        table.className = "admin-table";

        const thead = document.createElement("thead");
        thead.innerHTML =
            "<tr><th>Ім'я</th><th>Електронна пошта</th><th>Роль</th><th>Відділ</th><th></th></tr>";

        const tbody = document.createElement("tbody");

        createExpandableList({
            container: tbody,
            rows: data.users,
            renderRow: (userRecord) => createUserRow(userRecord),
            filterFn: (userRecord, query) =>
                userRecord.name.toLowerCase().includes(query.toLowerCase()) ||
                userRecord.email.toLowerCase().includes(query.toLowerCase()),
            initialVisibleCount: 10,
            searchInput: elements.usersSearch,
        }).render();

        table.append(thead, tbody);
        elements.usersTable.innerHTML = "";
        elements.usersTable.appendChild(table);
        elements.usersStatus.textContent = `Сотрудників: ${data.users.length}`;
    } catch (error) {
        console.error(error);
        elements.usersTable.innerHTML = "";
        elements.usersStatus.textContent = error.message;
    }
}

/* ---------- Підключення ---------- */

loadSettings();
loadDepartments();
loadUsers();
