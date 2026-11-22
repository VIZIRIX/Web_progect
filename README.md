# Web Project

Курсовой проект: бронирование переговорных комнат.

```
Web_progect/
  server/           # Express + Prisma + PostgreSQL
  client/           # Vite frontend
  compose.yaml      # docker-compose: postgres + backend + frontend
```

## Запуск

```bash
pnpm install
pnpm --filter web-project-server prisma generate
pnpm --filter web-project-server prisma migrate dev
pnpm --filter web-project-server seed   # данные для демо/тестов

# Локально (bез docker)
pnpm dev:server    # server: tsx watch src/index.ts
pnpm dev:client    # client: vite

# Или всё через docker
docker compose up --build
```

## Тесты и проверки

```bash
pnpm --filter web-project-server check   # tsc --noEmit
pnpm --filter web-project-client build   # vite build
```

См. `ARCHITECTURE.md` в корне и `server/ARCHITECTURE.md`? (в корне) — описание слоёв.

## При разработке

- `server/.env.example` — шаблон переменных среды (`server/.env` создан из корневого `.env`).
- Смените пароли перед запуском в продакшене.
