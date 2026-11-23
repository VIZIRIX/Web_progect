# Контекст проекту: Бронювання переговорних кімнат

## 1. Технічне завдання (ТЗ)

Тема: **Бронювання переговорних кімнат** — внутрішній сервіс компанії: кімнати, обладнання, брони на інтервали. Класична задача про перетин часових проміжків.

### Ролі

- Співробітник
- Офіс-менеджер
- Адміністратор

### Сутності

Кімната · Бронювання · Користувач · Відділ · Обладнання · Повторюване бронювання

### Зв'язок М:М

- Кімната ↔ Обладнання
- Бронювання ↔ Учасник

### Обсяг (сиді)

- 25 кімнат
- 12 відділів
- 100 співробітників
- 1500 бронювань

### Функціональні вимоги (по ролях)

**Співробітник:**
- календар кімнат (на день і тиждень)
- бронювання вільного інтервалу з темою зустрічі
- запрошення учасників
- повторюване бронювання (щотижня)
- скасування або перенесення власних бронів
- пошук вільної кімнати за місткістю та обладнанням

**Офіс-менеджер:**
- керування кімнатами, місткістю та обладнанням
- блокування кімнати на прибирання чи ремонт
- примусове скасування броні з детальним сповіщенням (хто скасував + назва кімнати + дата бронювання)
- звіт завантаженості кімнат

**Адміністратор:**
- керування відділами та правами
- налаштування робочих годин і максимальної тривалості бронювання

### Особливості реалізації

- Повторюване бронювання створює окремі записи на кожну дату — інакше неможливо скасувати одну зустріч із серії.
- Перевірка перетину — умова в запиті до бази з відповідним індексом (Booking_roomId_startTime_endTime_idx).
- Робочі години й максимальна тривалість перевіряються на сервері.

---

## 2. Курсовий проєкт

Прифайл `docs/task-form.md` — «ДОДАТОК D — БЛАНК ЗАВДАННЯ НА КУРСОВИЙ ПРОЄКТ».
(PDF-файл `/home/vizirix/Downloads/Методичні_рекомендації_до_Курсового_проєкту_Веб_технології_та_веб_дизайн.pdf`
містить такий же контент; ця модель не підтримує PDF-вхідні дані, тому підготовлена текстова копія з `task-form.md`.)

- **1. Тема проєкту:** Бронювання переговорних кімнат
- **2. Конкурентна операція:** Створення броні на інтервал. Два бронювання однієї кімнати з перетином часу неможливі.
- **3. Зміст пояснювальної записки:** вступ; аналіз предметної області та технічне завдання; проєктування інформаційної системи; програмна реалізація вебзастосунку; тестування та розгортання; висновки; список джерел; додатки.
- **4. Перелік графічного матеріалу:** ER-діаграма; схема застосунку (app.ts → routes/services); діаграма послідовності ключових операцій (createBooking: lock → checks → create occurrences); знімки екрана інтерфейсу (auth, календар, бронювання) — після деплою.
- **5. Технічне завдання:** — базується на ТЗ з чату (зміст у пункті 1).

---

## 3. Архітектура проекту (сервер)

`server/` — Express + Prisma + PostgreSQL.

```
src/
  app.ts                 # createApp(): middleware + routes + errorHandler
  index.ts               # запуск на PORT
  db.ts                  # один PrismaClient
  api/
    errors.ts            # AppError + errorHandler (problem+json)
    response.ts          # sendSuccess() → { status: 'success', ...data }
  middleware/
    auth.middleware.ts   # verifyToken / requireRole / isManager (employee, office_manager, admin)
    logger.middleware.ts
  services/
    booking.service.ts   # createBooking (lock + overlap + recurring), rescheduleBooking, cancelBooking, listBookings, listUsers
    room.service.ts      # кімнати/обладнання/доступні кімнати (capacity, equipment)
    department.service.ts  # CRUD відділів (адмін)
    user.service.ts      # перелік користувачів + зміна ролей (адмін)
    report.service.ts    # getRoomUtilization (звіт завантаженості, office_manager/admin)
    notification.service.ts
    settings.service.ts  # getSettings / updateSettings (адмін)
    auth.service.ts
  validators/            # валідація body/query/params → AppError
  utils/
    booking.utils.ts     # validateBookingTime (робочий час, Europe/Kyiv)
    logger.ts
  routes/                # thin routers
    auth.routes.ts, booking.routes.ts, room.routes.ts, settings.routes.ts,
    notification.routes.ts, department.routes.ts, user.routes.ts
  controllers/auth.controller.ts
```

Ключові потоки:
- **createBooking:** `pg_advisory_xact_lock(roomId)` → перевірка `isBlocked` → учасники → для кожного оберту серії: `validateBookingTime` + запит на перетин (`roomId + startTime < end AND endTime > start` по індексу) → створення запису.
- **Overlap check:** Prisma-запит з умовою перетину + індекс `Booking_roomId_startTime_endTime_idx` (`@@index([roomId, startTime, endTime])` у схемі).
- **Робочі години / макс тривалість:** валідуються серверно на створенні та перенесенні (`validateBookingTime`, Europe/Kyiv; `SystemSettings.workStart/workEnd/maxBookingHours`).

## 4. Архітектура проекту (клієнт, employee/manager)

```
client/
  index.html             # сторінка входу (авторизація)
  calendar/booking.html  # календар (місяць, список бронювань по дню + перенос/отмена + повідомлення,
                         # посилання в хедері: Кабінет офіс-менеджера / Адміністрування)
  booking/booking.html   # страница бронювання: пошук свободних кімнат (по даті/часу/місткості/обладнанню),
                         # тема встречи, участники, еженедельное повторение, забронировать
  manager/manager.html   # Кабінет офіс-менеджера: кімнати (створення, редагування, блокування),
                         # звіт завантаженості кімнат (2 кімнати початково + Показати ещё + пошук)
  admin/admin.html       # Адміністрування (лише admin): відділи, сотрудники та права, налаштування системи
  src/api/client.js      # fetch-клієнт: apiGet/Post/Patch/Delete (+ apiPut, +401 → logout)
  src/lib/time.js        # дата/час-хелпери (getBookingDateTime, getLocalDateTime, ...)
  src/app/auth.js        # сторінка входу (login/register POST /api/login)
  src/app/expandable-list.js # спільний компонент: список з пошуком по названі + «Показати ещё» (масштаб)
  src/app/manager/manager.js
  src/app/admin/admin.js
  src/app/booking/*.js   # shared, search, equipment, participants, booking-form, app
  src/app/calendar/*.js  # shared, load-bookings, render-calendar, day-view, reschedule, cancel,
                         # month-nav, notifications, app
  src/styles/
    shared.css, booking.css, calendar.css, auth.css, manager.css, admin.css
```

API (дивись `docs/openapi.yaml`):
`/api/auth`(register/login), `/api/bookings` (+/users, +/:id, +/:id/cancel), `/api/me/notifications`,
`/api/rooms` (equipment, management, available, create/update/block, equipment CRUD),
`/api/settings` (адмін), `/api/departments` (адмін), `/api/users` + `/api/users/:id/role` (адмін),
`/api/rooms/utilization` (офіс-менеджер/адмін).

## 5. Стан проекту (пріоритетизовано за вимогами ТЗ)

**Готово:**
- Сервер: всі тех. вимоги (п.1 ТЗ). Всі сутності, ролі, індекс, overlap-check, робочі години,
  повторювані бронювання (отдельні записи), скасування/перенос своїх, пошук комнат, блокування кімнат.
- Сервер: додано + перевірено — відділи CRUD (адмін), керування ролями (адмін),
  звіт завантаженості кімнат (`GET /api/rooms/utilization`), тести, `docs/openapi.yaml`.
- Клієнт (співробітник): календар (місяць + список по дню + перенос/отмена + повідомлення),
  страница бронювання (пошук, місткість/обладнання, тема, участники, щотижня, скасування своїх).
- Клієнт (масштаб: 25 кімнат / 12 відділів / 100 співробітників): сторінки офіс-менеджера
  (`manager/manager.html` + `src/app/manager/manager.js`) та адміністратора
  (`admin/admin.html` + `src/app/admin/admin.js`); списки (кімнати, відділи, сотрудники,
  звіт) з пошуком по названі (`src/app/expandable-list.js`: «Показати ещё» + пошук) —
  видимий початковий блок (2 кімнати, 6 відділів, 10 користувачів, 8 показано рядків звіту);
  на сторінку календарю — посилання «Кабінет офіс-менеджера» (офіс-менеджер/адмін)
  та «Адміністрування» (адмін).
  API: `apiPut` в `src/api/client.js`.
  (Примусове скасування броней — залишається доступним на сервері `POST /api/bookings/:id/cancel`
  (повідомлення містить ім'я того, хто скасував, назву кімнати та дату бронювання); через календар
  (DELETE) — дубль на сторінці менеджера не доданий.)

**Відкладено (на паузу):** тижневий вид календаря (вимоги «на день і тиждень» покриті
поточним місячним режимом + списком бронювань за днем і кнопкою «Перенести»).

## 6. Де що лежить

- `server/src/services/*.ts` — бізнес-логіка; `server/src/routes/*.ts` — маршрути.
- `server/prisma/schema.prisma`, `server/prisma/seed.ts` — моделі та демо-дані (25 кімнат, 12 відділів, 100 користувачів, 1500 бронювань).
- `server/src/services/*.test.ts` — тести (71 тест, vitest, mocks на `@prisma/client`).
- `client/` — Vite-клієнт: сторінки `index.html`, `calendar/booking.html`, `booking/booking.html`,
  `manager/manager.html`, `admin/admin.html`, `src/app/*` модулі (вход, календар, бронювання,
  менеджер, адміністратор).
- `docs/` — `task-form.md`, `openapi.yaml`, `project-context.md` (цей файл).
- Корінь проекту: `ARCHITECTURE.md` — у дереві git (HEAD), на робочій директорії поки вилучена
  (згідно з інструкцією «не робити нічого», відновлення чекає вашого рішення).

## 7. Команди розробки / перевірки

```bash
pnpm install                                   # залежності
pnpm --filter web-project-server prisma generate
pnpm --filter web-project-server prisma migrate dev
pnpm --filter web-project-server seed          # дані для демо/тестів

pnpm dev:server                                # сервер (tsx watch)
pnpm dev:client                                # клієнт (vite)

pnpm check:server                              # tsc --noEmit (зелений)
pnpm --filter web-project-server test          # vitest (71/71, зелений)
pnpm build:client                              # vite build (зелений)
```

`ARCHITECTURE.md` (корінь проекту) — коротка описа архітектури (відновлена в робочій директорії).

---

## 8. Ключові короткі факти (для орієнтації)

- Конкурентна операція: **створення броні на інтервал** — перехоплення перетинів заборонене; технічно: транзакція + `pg_advisory_xact_lock` на кімнату + запит на перетин по індексу.
- Сервер перевіряє: робочі години (в Києві), макс тривалість, блокування кімнати.
- Співробітник може переносити/скасовувати лише свої бронювання; офіс-менеджер/адмін — будь-які, з повідомленням.
- Повторювані бронювання = окремі записи на кожну дату серії.
