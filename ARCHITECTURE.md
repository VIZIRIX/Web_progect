# Архитектура проекта

## Сервер (`server/`)

```
src/
  app.ts                 # createApp() — сборка приложения (middleware, routes, error handler)
  index.ts               # запуск на PORT
  db.ts                  # единый PrismaClient
  api/errors.ts          # AppError + errorHandler
  api/response.ts        # sendSuccess()
  middleware/
    auth.middleware.ts   # verifyToken / requireRole / isManager
    logger.middleware.ts # лог каждого запроса
  services/              # бизнес-логика (обращение к БД, транзакции, блокировки)
    booking.service.ts   # createBooking / rescheduleBooking / cancelBooking (+ Уведомления) / listBookings / listUsers
    room.service.ts      # комнаты/оборудование/свободные комнаты
    notification.service.ts # notifyBookingCancelled / listNotifications / markAsRead
    settings.service.ts  # getSettings / updateSettings
    auth.service.ts      # registerUser / loginUser (bcrypt)
  validators/            # валидация body/query/params → AppError на ошибку
  utils/
    booking.utils.ts     # validateBookingTime (рабочее время, Europe/Kyiv)
    logger.ts
  routes/                # тонкие маршрутизаторы: parse → service → sendSuccess
  routes/notification.routes.ts  # GET /api/me/notifications, PATCH /api/me/notifications/:id/read
```

Ошибки: единый формат ответа `{ status: 'error', error: message }` через `AppError` + `errorHandler`.
Зависимость от `PrismaClient` — только в `db.ts`.
Создание брони: `pg_advisory_xact_lock` на комнату + проверка пересечений по индексу `Booking_roomId_startTime_endTime_idx`.

## Клиент (`client/`)

- `src/lib/api.js` — единый fetch-клиент: `apiGet/Post/Patch/Delete`, центральный выход при 401/403
- `src/lib/time.js` — дата/время-хелперы
- Страницы: `index.html` (авторизация), `calendar/booking.html` (календарь), `booking/booking.html` (поиск + бронирование)

## Запуск

См. `README.md`. Основные: `pnpm install`, `pnpm --filter web-project-server prisma generate`,
`pnpm check` в `server/`, `pnpm --filter web-project-client build`.
