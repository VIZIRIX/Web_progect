// Входной скрипт страницы бронирования (поиск комнат, форма, списки).

import { getToken } from "../../api/client.js";
import { getLocalDate } from "../../lib/time.js";
import { elements } from "./shared.js";
import { loadEquipment } from "./equipment.js";
import { loadUsers } from "./participants.js";
import { clearSelectedRoom, handleSearchSubmit } from "./search.js";
import { handleBookingFormSubmit } from "./booking-form.js";

if (!getToken()) {
    window.location.href = "/";
}

elements.dateInput.min = getLocalDate();
elements.dateInput.value = getLocalDate();

// Настройки еженедельного повторения
elements.recurringCheckbox.addEventListener("change", () => {
    elements.recurringOptions.classList.toggle("hidden", !elements.recurringCheckbox.checked);
});

[
    elements.dateInput,
    elements.startInput,
    elements.endInput,
    elements.capacityInput,
    elements.equipmentList,
].forEach((element) => element.addEventListener("change", clearSelectedRoom));

elements.searchForm.addEventListener("submit", handleSearchSubmit);
elements.bookingForm.addEventListener("submit", handleBookingFormSubmit);

loadEquipment();
loadUsers();
