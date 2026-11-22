// Дата/время-хелперы для работы с бронированиями.

export function getLocalDate() {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');
}

// Сериализация брони в ISO для отправки на сервер (сервер валидирует часы в Киеве).
export function getBookingDateTime(date, time) {
    return new Date(`${date}T${time}`).toISOString();
}

export function getDateKey(value) {
    const date = new Date(value);

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
    ].join('-');
}

export function getTimeInputValue(value) {
    const date = new Date(value);

    return [
        String(date.getHours()).padStart(2, '0'),
        String(date.getMinutes()).padStart(2, '0')
    ].join(':');
}

// Валидация пары "дата + время" (проверка существующих полей).
export function getLocalDateTime(date, time) {
    if (!date || !time) {
        return null;
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);

    const result = new Date(year, month - 1, day, hours, minutes);

    if (
        result.getFullYear() !== year ||
        result.getMonth() !== month - 1 ||
        result.getDate() !== day ||
        result.getHours() !== hours ||
        result.getMinutes() !== minutes
    ) {
        return null;
    }

    return result;
}
