// Уведомления: загрузка списка, бейдж, панель.

import { apiGet, apiPatch } from "../../api/client.js";
import { elements } from "./shared.js";

let notifications = [];

function unreadCount() {
    return notifications.filter((n) => !n.isRead).length;
}

function renderNotifications() {
    const unread = unreadCount();

    elements.notificationsCount.textContent = unread > 0 ? String(unread) : "";

    if (!notifications.length) {
        elements.notificationsPanel.innerHTML =
            '<p class="notifications-empty">Уведомлений пока нет</p>';
        return;
    }

    elements.notificationsPanel.innerHTML = notifications
        .map((notif) => {
            const time = new Date(notif.createdAt).toLocaleString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
            });

            return `
                <article class="notification-item${notif.isRead ? " read" : ""}">
                    <span class="notification-message">${notif.message}</span>
                    <span class="notification-time">${time}</span>
                    <button type="button" class="notification-read-btn" data-id="${notif.id}">Прочитано</button>
                </article>`;
        })
        .join("");

    elements.notificationsPanel.querySelectorAll(".notification-read-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const id = Number(btn.dataset.id);

            try {
                await apiPatch(`/api/me/notifications/${id}/read`);

                const item = notifications.find((n) => n.id === id);

                if (item) {
                    item.isRead = true;
                }

                renderNotifications();
            } catch (error) {
                console.error("Ошибка пометки уведомления прочитанным:", error);
            }
        });
    });
}

async function loadNotifications() {
    try {
        const data = await apiGet("/api/me/notifications?limit=50");
        notifications = data.notifications || [];
    } catch (error) {
        console.error("Ошибка загрузки уведомлений:", error);
    }

    renderNotifications();
}

export function initNotifications() {
    loadNotifications();

    elements.notificationsToggle?.addEventListener("click", () => {
        elements.notificationsPanel.classList.toggle("visible");
    });
}
