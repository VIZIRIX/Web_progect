# ADR 006 — Автоматичні тести + CI (GitHub Actions)

## Статус: прийнято (2026-11-22)

## Контекст

- Рівень тестування (5 відсотків, 20 балів): тільки бізнес-логіка +
  one наскрізний сценарій — оцінка: 3/10.
- Критерій 5 (якість коду, тести, CI — 10 балів) — повністю незаповнений.
- `pnpm check` (tsc --noEmit) був лише локальним.

## Розглянуті варіанти

1. Жодних тестів до захисту — відкинуто.
2. vitest (server) + eslint/prettier (client) + наскрізний тест за сценарієм
   "прийняти учасників → поділитися на робочі години" — оцінюємо: 3/10.
3. vitest (server, 51 тест) + eslint (client) + prettier + CI на PR.

## Рішення

- **vitest + unit-тести на server:** валідатори, `validateBookingTime` (Kyiv),
  `booking.service` (з моками `vi.mock('@prisma/client')`), `AppError`/`errorHandler`,
  `room.validators`, `auth.validators`, `settings.validators`.
- **CI (GitHub Actions):** `check-server` (tsc + check), `test-server` (vitest),
  `lint-client` (eslint), `build-client` (vite build) на push/PR у main.
- Клієнт — plain JS, змістили лінтинг в `client/eslint.config.mjs`; сервер — TS strict
  + `pnpm lint` = `tsc --noEmit`.

## Наслідки

- Покриття: server — ~40-50% (валідатори + service), client — 0 (верстка).
- Коротко траєтито — наскрізний API-тест можна додати пізніше (supertest).
- Тести запускаються локально й у CI (`pnpm --filter web-project-server test`).
- Наступне: перенести `bcrypt`/`bcryptjs` → один пакет; додати OpenAPI smoke-test.
