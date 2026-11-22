// Загрузка списка сотрудников и чтение выбранных участников.

import { apiGet } from "../../api/client.js";
import { elements } from "./shared.js";

export function getSelectedParticipants() {
    return [...document.querySelectorAll(".participant-checkbox:checked")].map((item) =>
        Number(item.value),
    );
}

export async function loadUsers() {
    try {
        const data = await apiGet("/api/bookings/users");

        elements.participantsList.innerHTML = "";

        if (!data.users.length) {
            elements.participantsList.textContent = "Сотрудники не найдены.";
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
            elements.participantsList.appendChild(label);
        });
    } catch (error) {
        console.error(error);
        elements.participantsList.textContent = "Не удалось загрузить сотрудников.";
    }
}
