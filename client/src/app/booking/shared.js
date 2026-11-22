// Общее состояние и DOM-геттеры страницы бронирования.

export const state = {
    selectedRoom: null,
};

export const elements = {
    searchForm: document.getElementById("search-form"),
    bookingForm: document.getElementById("booking-form"),
    dateInput: document.getElementById("booking-date"),
    startInput: document.getElementById("start-time"),
    endInput: document.getElementById("end-time"),
    capacityInput: document.getElementById("capacity"),
    equipmentList: document.getElementById("equipment-list"),
    participantsList: document.getElementById("participants-list"),
    roomsList: document.getElementById("rooms-list"),
    searchStatus: document.getElementById("search-status"),
    bookingSection: document.getElementById("booking-section"),
    selectedRoomElement: document.getElementById("selected-room"),
    bookingStatus: document.getElementById("booking-status"),
    recurringCheckbox: document.getElementById("recurring-booking"),
    recurringOptions: document.getElementById("recurring-options"),
    recurrenceCountInput: document.getElementById("recurrence-count"),
    meetingTitleInput: document.getElementById("meeting-title"),
};
