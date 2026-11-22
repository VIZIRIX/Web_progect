# PROJECT_STATE.md — контекст работы (для продолжения)

> Курсовой проект «Бронирование переговорных комнат». Монорепо: `server/` + `client/`.
> Таймзона: Киев (`Europe/Kyiv`).
> Дата обновления: 2026-11-22.

## 0. Выжимка — Фаза 1 завершена

- **Архитектура сервера** — рефактор завершён (Фаза 1, запрос пользователя "починить архитектуру").
- **Методички** — основной пакет "по стандартам курсовой": OpenAPI 3.1, 8 ADR (docs/adr), титульный аркуш, бланк завдания, CI (.github/workflows), тесты (51 на сервере), ESLint на клиенте, security/observability/pagination на сервере.
- **Функционал:** ~40–50% — сотрудники почти закрыты, офис-менеджер/администратор/регистрация клиента — отстают (фаза 2 — следующий запуск).
- **Проверки:** `pnpm check:server`, `pnpm --filter web-project-server test`, `pnpm --filter web-project-client build`, `pnpm --filter web-project-client lint` — все зелёные.

---

## 1. Текущее состояние

### 1.1 Готовность по заданию (~40–50%)

#### Есть (по заданию)
- **Співробітник:** календарь кімнат (месяц с бейджами + список по дню), бронирование с темой, участники, повторюемость (2–52, еженедельно), перенос/отмена своей брони, поиск комнат по місткості/обладнанию (`GET /api/rooms/available`).
- **Офис-менеджер:** управление комнатами/оборудованием, блокировка комнаты, принудительное отменение брони (`DELETE /api/bookings/:id`).
- **Адміністратор:** настройки рабочих часов/макс. тривалости (`PUT /api/settings`).

#### Нет (по заданию) — ключевой брак (Фаза 2 — следующий запуск)
1. ❌ Уведомления при принудительном скасуванни офис-менеджером — `Notification` не создана.
2. ❌ Отчёт о загрузке комнат (п. Звіт завантаженості комнат) — `GET /api/bookings/stats`.
3. ❌ По-недельний вид календаря (есть месяц + список по дню).
4. ❌ CRUD отделов и прав пользователей (админ) — только сид; пользователь — только чтение списка.
5. ❌ Страница регистрации на клиенте (серверный `/api/register` есть, UI — нет).

### 1.2 Проверка против методичек (§5–5.9, appendix A–H) — Фаза 1

#### §5.1 Архитектура ✅
- Сервер: `routes/` (тонкие) → `services/` → `validators/` → `api/errors.ts` → `db.ts` — лаконично и профессионально.
- Бизнес-логика не залежит від HTTP (сервисы вызываются без изменений роутов).
- ✅ OpenAPI 3.1 — `docs/openapi.yaml` (покрыты все эндпоинты + схемы + ошибки + securitySchemes).
- ✅ ADR: `docs/adr/` — 8 файлов (потребность 3+).

#### §5.2 Интерфейс ✅
- Календарь — семантика переработана (`<main>/<header>/<nav>/<section>`, aria-labels, `role="grid"`).
- Адаптивность добавлена (media query `@media (max-width: 420px)` — ширина 100%, отступы, шрифты).
- Три стана есть (loading/empty/error — страны/результат/ошибка в календаре + booking).

#### §5.3 Функциональные вимоги ⚠️ (на Фазу 2)
- Пагинация — **добавлена**: `GET /api/bookings?from&to&limit=50&offset=0&sort=startTime|-startTime` + `total` (ADR 008, `validators/booking.validators.ts`, `listBookings` с take/skip + `Promise.all` count).

#### §5.4 Валідація і помилки ✅
- RFC 9457 — `AppError` + `errorHandler` (`api/errors.ts`), ответ `application/problem+json` с `type/title/status/detail/instance` (ADR 001), `server/src/api/errors.test.ts` — 5 тестов.
- Валидация на меже сервера — `validators/*.ts` (AppError, часто с полями ошибок).

#### §5.6 Якість коду, тести, CI ✅
- Сервер — TS strict, `pnpm lint` = `tsc --noEmit` (TS 7 — типи суворі).
- **Тесты: 51 тест** — `src/api/errors.test.ts`, `src/validators/{booking,room,settings,auth}.validators.test.ts`, `src/utils/booking.utils.test.ts` (Kyiv, 8 тестов), `src/services/booking.service.test.ts` (9 тестов, моки Prisma).
- **CI:** `.github/workflows/ci.yml` — check-server (tsc+lint), test-server (vitest), lint-client (eslint), build-client (vite).
- Lint: server = tsc, client = eslint (defineConfig, `*.js`), prettier в обоих.
- Клієнт — plain JS; TypeScript-міграція — опционально (§5.6 не требує строго).

#### §5.7 Спостережуваність ✅ (ADR 008)
- Structured JSON logs — winston `format.json()` (`{level, message, timestamp, ...meta, stack}`).
- Correlation ID — `requestIdMiddleware` — `x-request-id` в ответах + в логах.
- Health endpoint — есть.

#### §5.8 Розгортання ⚠️ (Фаза 2 — деплой + backup)
- Docker (`compose up`) — OK. Публічний HTTPS — на стадии деплою.
- `server/.env.example`, `CLIENT_ORIGIN` в compose, пароль в сиде — сменить (`superadmin123` → `Superadmin123!`).

#### §5.9 Репозиторій ✅
- Гілки + PR, README кореню, commit-історія.

#### Appendix A — Титульный аркуш — `docs/title-sheet.md` (заполнено, плейсхолдеры).
#### Appendix B — Чек-лист — проходит (п. 1–18; 19–27 — до захисту).
#### Appendix D — Бланк завдання — `docs/task-form.md` (в полній мірі з ТЗ чату).
#### Appendix G — ADR — 8 файлів (потребні 3+).
#### Appendix V — Презентація — потім (live demo после деплоя).

---

### 1.3 Заметки для продолжения

- Команды:
  - `cd server && pnpm check && pnpm test && pnpm lint`
  - `cd client && pnpm build && pnpm lint`
  - `pnpm install`, `prisma generate`, `prisma migrate dev`, `seed`, `pnpm dev:server & pnpm dev:client`
- Seed: `admin@example.com` / `Superadmin123!`, `manager1..4@example.com` / `Manager123!`, `employee001..100@example.com` / `Employee123!`.
- Ключевые места: `server/src/services/booking.service.ts` (бизнес-логика), `server/src/utils/booking.utils.ts` (Kyiv), `server/src/validators/*.ts`, `server/src/api/errors.ts`, `server/src/app.ts`, `client/booking/booking.js`, `client/calendar/script.js`, `docs/adr/`.
- Создать каталог `server/docs/adr/` перед размещением ADR-файлов (сейчас — `docs/adr/`).

---

## 2. Фаза 2 — P0 (следующий запуск)

Функционал за заданием и по методичкам — дозаповнення:

1. **Уведомления при принудительном скасуванни** (офис-менеджер): `Notification` модель, `POST /api/bookings/:id/cancel` (цілоціальне), `GET/PATCH /api/me/notifications`, UI-бейдж.
2. **Отчёт о загрузке комнат**: `GET /api/bookings/stats` (процент загрузки по комнатам + занятость за день/неделю), UI-страница для менеджера.
3. **По-недельний вид календаря** (есть месяц + список по дню).
4. **CRUD отделов и прав пользователей** (админ): `/api/departments`, `/api/users/{id}` (role, departmentId).
5. **Страница регистрации на клиенте** (серверный `/api/register` есть).
6. **Idempotency** для бронювання (ADR), мягкие запросы (Optimistic concurrency?).

---

## 3. Фаза 3 — Опционально

- Деплой на публичном HTTPS + backup/restore (§5.8, appendix B-25).
- Миграция клиента на TypeScript (опционально по §5.6).
- Presentation (Appendix V).
- Формализация ПЗ по DSTU 3008:2015/8302:2015 (студентський документ, требует розширення — розділи 4.2–4.6, переліки рисунків, таблиць, формул).
