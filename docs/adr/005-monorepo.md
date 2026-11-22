# ADR 005 — Монорепозиторій pnpm (замість окремих репозиторіїв)

## Статус: прийнято (2026-11-22)

## Контекст

Проект розділений на `client/` і `server/`. Окремі репозиторії:

- `client` потребує `API Клієнт` (або OpenAPI),
- одинакова версія залежностей,
- два `pnpm-lock.yaml`, дві перевірки,
- складніше координувати зміни.

## Розглянуті варіанти

1. Монорепозиторій pnpm (root) + `pnpm --filter` — спільні пакети,
   один lockfile (в корені), загальні скрипти.
2. Окремі репозиторії — спільних немає, два lockfiles.

## Рішення

Монорепозиторій: `pnpm-workspace.yaml` у root (`client`, `server`),
`package.json` root з `pnpm --filter`-скриптами (`dev:server`, `dev:client`,
`check:server`). `server/pnpm-workspace.yaml` + `client/pnpm-workspace.yaml` —
залишено самою прийомною з попередніх версій проекту, перенести в root.

## Наслідки

- Корень — єдине місце конфігурації, один lockfile (`pnpm-lock.yaml` у root).
- `pnpm check:server` викликає провірку лише server,
  `pnpm --filter web-project-client build` — лише client.
- Спільні пакети поки не потрібні — пересмотрім якщо знадобиться.
