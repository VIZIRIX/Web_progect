const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/';
}

const searchForm = document.getElementById('search-form');
const bookingForm = document.getElementById('booking-form');

const dateInput = document.getElementById('booking-date');
const startInput = document.getElementById('start-time');
const endInput = document.getElementById('end-time');
const capacityInput = document.getElementById('capacity');

const equipmentList = document.getElementById('equipment-list');
const roomsList = document.getElementById('rooms-list');

const searchStatus = document.getElementById('search-status');
const bookingSection = document.getElementById('booking-section');
const selectedRoomElement = document.getElementById('selected-room');
const bookingStatus = document.getElementById('booking-status');

let selectedRoom = null;

function clearSelectedRoom() {
    selectedRoom = null;
    bookingSection.classList.add('hidden');
}

[dateInput, startInput, endInput, capacityInput, equipmentList]
    .forEach(element => {
        element.addEventListener('change', clearSelectedRoom);
    });

// Получаем сегодняшнюю дату в локальном часовом поясе
function getLocalDate() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

dateInput.min = getLocalDate();
dateInput.value = getLocalDate();

// Универсальная функция запроса к API
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
        throw new Error('Необходимо войти в систему заново');
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Ошибка сервера');
    }

    return data;
}

// Получение списка оборудования
async function loadEquipment() {
    try {
        const data = await apiRequest('/api/rooms/equipment');

        equipmentList.innerHTML = '';

        data.equipment.forEach(item => {
            const label = document.createElement('label');
            label.className = 'equipment-option';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item.id;
            checkbox.className = 'equipment-checkbox';

            const name = document.createElement('span');
            name.textContent = item.name;

            label.appendChild(checkbox);
            label.appendChild(name);

            equipmentList.appendChild(label);
        });

        if (data.equipment.length === 0) {
            equipmentList.textContent = 'Оборудование пока не добавлено.';
        }

    } catch (error) {
        console.error(error);
        equipmentList.textContent = 'Не удалось загрузить оборудование.';
    }
}

// Получение выбранного оборудования
function getSelectedEquipment() {
    const checkboxes = document.querySelectorAll('.equipment-checkbox');

    return Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
}

// Преобразование локальной даты и времени в ISO для сервера
function getBookingDateTime(date, time) {
    return new Date(`${date}T${time}`).toISOString();
}

// Поиск свободных комнат
searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    roomsList.innerHTML = '';
    bookingSection.classList.add('hidden');
    selectedRoom = null;

    const date = dateInput.value;
    const startTime = startInput.value;
    const endTime = endInput.value;

    if (!date || !startTime || !endTime) {
        searchStatus.textContent = 'Заполните дату и время встречи.';
        return;
    }

    if (date < getLocalDate()) {
        searchStatus.textContent = 'Нельзя выбрать прошедшую дату.';
        return;
    }

    if (endTime <= startTime) {
        searchStatus.textContent = 'Время окончания должно быть позже времени начала.';
        return;
    }

    const start = getBookingDateTime(date, startTime);
    const end = getBookingDateTime(date, endTime);

    const capacity = capacityInput.value;
    const equipmentIds = getSelectedEquipment();

    const params = new URLSearchParams({
        startTime: start,
        endTime: end
    });

    if (capacity) {
        params.set('capacity', capacity);
    }

    if (equipmentIds.length > 0) {
        params.set('equipmentIds', equipmentIds.join(','));
    }

    searchStatus.textContent = 'Поиск свободных комнат...';

    try {
        const data = await apiRequest(
            `/api/rooms/available?${params.toString()}`
        );

        if (data.rooms.length === 0) {
            searchStatus.textContent =
                'Свободных комнат с такими параметрами не найдено.';

            return;
        }

        searchStatus.textContent =
            `Найдено свободных комнат: ${data.rooms.length}`;

        renderRooms(data.rooms);

    } catch (error) {
        console.error(error);
        searchStatus.textContent = error.message;
    }
});

// Отображение найденных комнат
function renderRooms(rooms) {
    roomsList.innerHTML = '';

    rooms.forEach(room => {
        const card = document.createElement('div');
        card.className = 'room-card';

        const title = document.createElement('h3');
        title.textContent = room.name;

        const capacity = document.createElement('p');
        capacity.textContent = `Вместимость: ${room.capacity} чел.`;

        const equipmentTitle = document.createElement('p');
        equipmentTitle.className = 'room-equipment';
        equipmentTitle.textContent = 'Оборудование:';

        const equipmentNames = room.equipment.map(item => {
            return item.equipment.name;
        });

        const equipment = document.createElement('p');
        equipment.textContent = equipmentNames.length > 0
            ? equipmentNames.join(', ')
            : 'Отсутствует';

        const selectButton = document.createElement('button');
        selectButton.type = 'button';
        selectButton.className = 'primary-button';
        selectButton.textContent = 'Выбрать комнату';

        selectButton.addEventListener('click', () => {
            selectRoom(room);
        });

        card.appendChild(title);
        card.appendChild(capacity);
        card.appendChild(equipmentTitle);
        card.appendChild(equipment);
        card.appendChild(selectButton);

        roomsList.appendChild(card);
    });
}

// Выбор комнаты
function selectRoom(room) {
    selectedRoom = room;

    selectedRoomElement.textContent =
        `Выбрана комната: ${room.name}. Вместимость: ${room.capacity} чел.`;

    bookingSection.classList.remove('hidden');

    bookingStatus.textContent = '';

    bookingSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// Создание бронирования
bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!selectedRoom) {
        bookingStatus.textContent = 'Сначала выберите комнату.';
        return;
    }

    const title = document.getElementById('meeting-title').value.trim();

    if (!title) {
        bookingStatus.textContent = 'Введите название встречи.';
        return;
    }

    const date = dateInput.value;
    const startTime = startInput.value;
    const endTime = endInput.value;

    const start = getBookingDateTime(date, startTime);
    const end = getBookingDateTime(date, endTime);

    const submitButton = bookingForm.querySelector('button[type="submit"]');

    submitButton.disabled = true;
    submitButton.textContent = 'Сохранение...';

    bookingStatus.textContent = '';

    try {
        await apiRequest('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId: selectedRoom.id,
                title: title,
                startTime: start,
                endTime: end
            })
        });

        bookingStatus.textContent =
            'Бронирование успешно создано! Возвращаемся к календарю...';

        setTimeout(() => {
            window.location.href = '/calendar/booking.html';
        }, 1200);

    } catch (error) {
        console.error(error);

        bookingStatus.textContent = error.message;

        // Если комната уже занята, обновим результаты поиска
        if (error.message.includes('already booked') ||
            error.message.includes('blocked')) {
            searchForm.requestSubmit();
        }

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Забронировать комнату';
    }
});

// Загружаем оборудование при открытии страницы
loadEquipment();