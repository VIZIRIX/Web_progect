
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
const participantsList = document.getElementById('participants-list');
const roomsList = document.getElementById('rooms-list');

const searchStatus = document.getElementById('search-status');
const bookingSection = document.getElementById('booking-section');
const selectedRoomElement = document.getElementById('selected-room');
const bookingStatus = document.getElementById('booking-status');

let selectedRoom = null;

// Выход из аккаунта
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Запросы к серверу
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Необходимо войти в систему заново');
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Ошибка сервера');
    }

    return data;
}

// Сегодняшняя дата
function getLocalDate() {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');
}

dateInput.min = getLocalDate();
dateInput.value = getLocalDate();

// Преобразование даты и времени
function getBookingDateTime(date, time) {
    return new Date(`${date}T${time}`).toISOString();
}

// Получение выбранного оборудования
function getSelectedEquipment() {
    return [...document.querySelectorAll('.equipment-checkbox:checked')]
        .map(item => item.value);
}

// Получение выбранных участников
function getSelectedParticipants() {
    return [...document.querySelectorAll('.participant-checkbox:checked')]
        .map(item => Number(item.value));
}

// Сброс выбранной комнаты при изменении параметров
function clearSelectedRoom() {
    selectedRoom = null;
    bookingSection.classList.add('hidden');
}

[dateInput, startInput, endInput, capacityInput, equipmentList]
    .forEach(element => element.addEventListener('change', clearSelectedRoom));

// Загрузка оборудования
async function loadEquipment() {
    try {
        const data = await apiRequest('/api/rooms/equipment');

        equipmentList.innerHTML = '';

        data.equipment.forEach(item => {
            const label = document.createElement('label');
            label.className = 'equipment-option';

            label.innerHTML = `
                <input type="checkbox" class="equipment-checkbox" value="${item.id}">
                <span></span>
            `;

            label.querySelector('span').textContent = item.name;
            equipmentList.appendChild(label);
        });

        if (!data.equipment.length) {
            equipmentList.textContent = 'Оборудование пока не добавлено.';
        }

    } catch (error) {
        console.error(error);
        equipmentList.textContent = 'Не удалось загрузить оборудование.';
    }
}

// Загрузка сотрудников
async function loadUsers() {
    try {
        const data = await apiRequest('/api/bookings/users');

        participantsList.innerHTML = '';

        if (!data.users.length) {
            participantsList.textContent = 'Сотрудники не найдены.';
            return;
        }

        data.users.forEach(user => {
            const label = document.createElement('label');
            label.className = 'participant-option';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'participant-checkbox';
            checkbox.value = user.id;

            const info = document.createElement('span');
            info.textContent = `${user.name} (${user.email})` +
                (user.department?.name ? ` — ${user.department.name}` : '');

            label.append(checkbox, info);
            participantsList.appendChild(label);
        });

    } catch (error) {
        console.error(error);
        participantsList.textContent = 'Не удалось загрузить сотрудников.';
    }
}

// Поиск свободных комнат
searchForm.addEventListener('submit', async event => {
    event.preventDefault();

    roomsList.innerHTML = '';
    clearSelectedRoom();

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
        searchStatus.textContent = 'Время окончания должно быть позже начала.';
        return;
    }

    const params = new URLSearchParams({
        startTime: getBookingDateTime(date, startTime),
        endTime: getBookingDateTime(date, endTime)
    });

    if (capacityInput.value) {
        params.set('capacity', capacityInput.value);
    }

    const equipmentIds = getSelectedEquipment();

    if (equipmentIds.length) {
        params.set('equipmentIds', equipmentIds.join(','));
    }

    searchStatus.textContent = 'Поиск свободных комнат...';

    try {
        const data = await apiRequest(
            `/api/rooms/available?${params}`
        );

        if (!data.rooms.length) {
            searchStatus.textContent = 'Свободных комнат не найдено.';
            return;
        }

        searchStatus.textContent = `Найдено комнат: ${data.rooms.length}`;
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

        const equipment = document.createElement('p');
        const names = room.equipment.map(item => item.equipment.name);
        equipment.textContent = `Оборудование: ${names.join(', ') || 'Отсутствует'}`;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'primary-button';
        button.textContent = 'Выбрать комнату';
        button.addEventListener('click', () => selectRoom(room));

        card.append(title, capacity, equipment, button);
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
bookingForm.addEventListener('submit', async event => {
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

    const submitButton = bookingForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Сохранение...';

    try {
        await apiRequest('/api/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roomId: selectedRoom.id,
                title,
                startTime: getBookingDateTime(dateInput.value, startInput.value),
                endTime: getBookingDateTime(dateInput.value, endInput.value),
                participantIds: getSelectedParticipants()
            })
        });

        bookingStatus.textContent = 'Бронирование успешно создано!';

        setTimeout(() => {
            window.location.href = '/calendar/booking.html';
        }, 1200);

    } catch (error) {
        console.error(error);
        bookingStatus.textContent = error.message;

        if (error.message.includes('already booked') ||
            error.message.includes('blocked')) {
            searchForm.requestSubmit();
        }

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Забронировать комнату';
    }
});

// Запуск загрузки данных
loadEquipment();
loadUsers();
