const monthYear = document.getElementById('month-year');
const daysContainer = document.getElementById('days-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const calendar = document.querySelector('.calendar');
const calendarHeader = document.querySelector('.calendar-header');

const token = localStorage.getItem('token');

let currentUser = null;

try {
    currentUser = JSON.parse(localStorage.getItem('user'));
} catch (error) {
    console.error('Не удалось прочитать данные пользователя:', error);
}

const currentUserId = Number(currentUser?.id ?? currentUser?.userId);
const currentUserRole = currentUser?.role;

if (!token) {
    window.location.href = '/';
}

const statusElement = document.createElement('div');
statusElement.className = 'calendar-status';
statusElement.setAttribute('role', 'status');

const bookingsList = document.createElement('div');
bookingsList.className = 'bookings-list';

if (calendar) {
    calendar.appendChild(bookingsList);
}

if (calendar && calendarHeader) {
    calendar.insertBefore(statusElement, calendarHeader.nextSibling);
}

const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

let currentDate = new Date();
let requestNumber = 0;

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

let allBookings = [];
async function loadBookings() {
    const currentRequest = ++requestNumber;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();

    statusElement.textContent = 'Загрузка бронирований...';

    try {
        const response = await fetch(
            `/api/bookings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Ошибка загрузки бронирований');
        }

        if (!Array.isArray(data.bookings)) {
            throw new Error('Некорректный ответ сервера');
        }

        if (currentRequest !== requestNumber) {
            return;
        }

        const bookingsByDay = new Map();

        data.bookings.forEach(booking => {
            const date = new Date(booking.startTime);

            const dayKey = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, '0'),
                String(date.getDate()).padStart(2, '0')
            ].join('-');

            bookingsByDay.set(
                dayKey,
                (bookingsByDay.get(dayKey) || 0) + 1
            );
        });

        allBookings = data.bookings;
        renderCalendar(bookingsByDay);

        statusElement.textContent =
            `Бронирований в этом месяце: ${data.count}`;

    } catch (error) {
        if (currentRequest !== requestNumber) {
            return;
        }

        console.error('Booking loading error:', error);
        statusElement.textContent = 'Не удалось загрузить бронирования';
    }
}

function showDayBookings(dayKey) {
    bookingsList.innerHTML = '';

    const heading = document.createElement('h2');
    heading.textContent = `Встречи за ${dayKey}`;
    bookingsList.appendChild(heading);

    const dayBookings = allBookings.filter(booking => {
        const date = new Date(booking.startTime);

        const bookingDay = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('-');

        return bookingDay === dayKey;
    });

    if (dayBookings.length === 0) {
        const message = document.createElement('p');
        message.textContent = 'На этот день бронирований нет.';
        bookingsList.appendChild(message);
        return;
    }

    dayBookings.sort((a, b) =>
        new Date(a.startTime) - new Date(b.startTime)
    );

    dayBookings.forEach(booking => {
        const card = document.createElement('div');
        card.className = 'booking-card';

        const title = document.createElement('h3');
        title.textContent = booking.title;

        const time = document.createElement('p');
        time.textContent =
            `${new Date(booking.startTime).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            })} – ${new Date(booking.endTime).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            })}`;

        const room = document.createElement('p');
        room.textContent = `Комната: ${booking.room.name}`;

        const organizer = document.createElement('p');
        organizer.textContent = `Организатор: ${booking.user.name}`;

card.appendChild(title);
card.appendChild(time);
card.appendChild(room);
card.appendChild(organizer);

// Проверяем, может ли пользователь отменить бронирование
const isOwner = booking.userId === currentUserId;

const isManager =
    currentUserRole === 'office_manager' ||
    currentUserRole === 'admin';

if (isOwner || isManager) {
    const cancelButton = document.createElement('button');

    cancelButton.type = 'button';
    cancelButton.className = 'cancel-booking-button';
    cancelButton.textContent = 'Отменить бронирование';

    cancelButton.addEventListener('click', async () => {
        const confirmed = confirm(
            `Вы действительно хотите отменить встречу "${booking.title}"?`
        );

        if (!confirmed) {
            return;
        }

        cancelButton.disabled = true;
        cancelButton.textContent = 'Отмена...';

        try {
            const response = await fetch(`/api/bookings/${booking.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.status === 401) {
                logout();
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || 'Не удалось отменить бронирование');
            }

            // Обновляем календарь и список встреч
            await loadBookings();
            showDayBookings(dayKey);

            statusElement.textContent = 'Бронирование успешно отменено.';

        } catch (error) {
            console.error('Cancellation error:', error);
            alert(error.message);

            cancelButton.disabled = false;
            cancelButton.textContent = 'Отменить бронирование';
        }
    });

    card.appendChild(cancelButton);
}

bookingsList.appendChild(card);
    });
}

function renderCalendar(bookingsByDay = new Map()) {
    if (!monthYear || !daysContainer) {
        return;
    }

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYear.textContent = `${months[month]} ${year}`;

    daysContainer.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const paddingDays = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    for (let i = 0; i < paddingDays; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('day', 'empty');
        daysContainer.appendChild(emptyDiv);
    }

    const today = new Date();

    for (let day = 1; day <= lastDate; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');

        dayDiv.textContent = day;

        if (
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        ) {
            dayDiv.classList.add('today');
        }

        const dayKey = [
            year,
            String(month + 1).padStart(2, '0'),
            String(day).padStart(2, '0')
        ].join('-');

        const bookingCount = bookingsByDay.get(dayKey) || 0;
        dayDiv.addEventListener('click', () => {
        showDayBookings(dayKey);
        });

        if (bookingCount > 0) {
            dayDiv.classList.add('has-bookings');

            const badge = document.createElement('span');
            badge.className = 'booking-count';
            badge.textContent = bookingCount;

            dayDiv.appendChild(badge);
            dayDiv.title = `Бронирований: ${bookingCount}`;
        }

        daysContainer.appendChild(dayDiv);
    }
}

prevBtn.addEventListener('click', () => {
    currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
    );

    loadBookings();
});

nextBtn.addEventListener('click', () => {
    currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
    );

    loadBookings();
});

loadBookings();
