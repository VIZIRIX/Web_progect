// Общее состояние и DOM-геттеры календаря.

export const months = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
];

export const state = {
    currentDate: new Date(),
    allBookings: [],
    requestNumber: 0,
};

let currentUser = null;

try {
    currentUser = JSON.parse(localStorage.getItem("user"));
} catch (error) {
    console.error("Ошибка чтения пользователя:", error);
}

export const user = currentUser;
export const currentUserId = Number(currentUser?.id ?? currentUser?.userId);
export const currentUserRole = currentUser?.role;

export const elements = {
    monthYear: document.getElementById("month-year"),
    daysContainer: document.getElementById("days-container"),
    prevBtn: document.getElementById("prev-btn"),
    nextBtn: document.getElementById("next-btn"),
    statusElement: document.getElementById("calendar-status"),
    bookingsList: document.getElementById("bookings-list"),
    notificationsToggle: document.getElementById("notifications-toggle"),
    notificationsCount: document.getElementById("notifications-count"),
    notificationsPanel: document.getElementById("notifications-panel"),
};
