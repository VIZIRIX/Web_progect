// Входной скрипт календаря (запуск модулей).

import { getToken } from "../../api/client.js";
import { user } from "./shared.js";
import { loadBookings } from "./load-bookings.js";
import { initMonthNav } from "./month-nav.js";
import { initNotifications } from "./notifications.js";

initNotifications();
initMonthNav();
renderManagerNav();

if (getToken() && user) {
    loadBookings();
}

// Посилання на стронки офіс-менеджера та адміністратора (залежно від ролі)
function renderManagerNav() {
    const nav = document.getElementById("manager-nav");

    if (!nav) {
        return;
    }

    const role = user?.role;
    nav.innerHTML = "";

    if (role === "office_manager" || role === "admin") {
        const managerLink = document.createElement("a");
        managerLink.className = "nav-link";
        managerLink.href = "/manager/manager.html";
        managerLink.textContent = "Кабінет офіс-менеджера";
        nav.appendChild(managerLink);
    }

    if (role === "admin") {
        const adminLink = document.createElement("a");
        adminLink.className = "nav-link";
        adminLink.href = "/admin/admin.html";
        adminLink.textContent = "Адміністрування";
        nav.appendChild(adminLink);
    }
}
