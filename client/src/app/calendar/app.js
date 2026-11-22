// Входной скрипт календаря (запуск модулей).

import { getToken } from "../../api/client.js";
import { user } from "./shared.js";
import { loadBookings } from "./load-bookings.js";
import { initMonthNav } from "./month-nav.js";
import { initNotifications } from "./notifications.js";

initNotifications();
initMonthNav();

if (getToken() && user) {
    loadBookings();
}
