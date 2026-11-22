# ADR 008 — Спостережуваність: structured JSON logs + `x-request-id` + пагінація

## Статус: прийнято (2026-11-22)

## Контекст

- Критерій 7 (спостережуваність — 5 балів): логи — текстові, немає correlation ID,
  немає структурного формату.
- Критерій 8 (пагінація, 5 балів): `/api/bookings` без limit/offset.
- Appendix B-26/15: structured logs + заголовок request-id.

## Розглянуті варіанти

1. Змінити логи на JSON-формат + додати requestId — просто, використовуємо
   winston-формати.
2. Додати JSON-логи + кастомний correlation ID middleware — додатково:
   header + усі рядки логу з цим id.
3. ELK/Mimir/Zabbix — теж варіанти, але недоступні для курсового проекту.

Для пагінації: `limit/offset/sort` з валідацією та `total` (для клієнта).

## Рішення

- **Structured JSON logs:** `winston` + `format.json()`; усі `logger.info/error`
  стануть JSON-рядками (`level`, `message`, `timestamp`, мета, `stack`).
- **Correlation ID:** `requestIdMiddleware` — генерує `randomUUID()`,
  пише у заголовок `x-request-id` та `loggerMiddleware` включає у кожен
  логуємий запит.
- **Пагінація:** `GET /api/bookings?from&to&limit=50&offset=0&sort=startTime|-startTime`
  + `total` — валідація у `parseBookingsListQuery`.

## Наслідки

- Логи можна парсити (jq) — структура: `{ level, message, timestamp, ...meta, requestId }`.
- Клієнт отримує `total` для UI-сторінок "показати ще".
- Логсташ/Grafana Loki — перспектива (описати в PROJECT_STATE).
