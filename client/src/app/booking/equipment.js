// Загрузка списка доступного оборудования.

import { apiGet } from "../../api/client.js";
import { elements } from "./shared.js";

export async function loadEquipment() {
    try {
        const data = await apiGet("/api/rooms/equipment");

        elements.equipmentList.innerHTML = "";

        data.equipment.forEach((item) => {
            const label = document.createElement("label");
            label.className = "equipment-option";

            label.innerHTML = `
                <input type="checkbox" class="equipment-checkbox" value="${item.id}">
                <span></span>
            `;

            label.querySelector("span").textContent = item.name;
            elements.equipmentList.appendChild(label);
        });

        if (!data.equipment.length) {
            elements.equipmentList.textContent = "Оборудование пока не добавлено.";
        }
    } catch (error) {
        console.error(error);
        elements.equipmentList.textContent = "Не удалось загрузить оборудование.";
    }
}
