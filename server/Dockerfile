FROM node:22-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate
EXPOSE 5000
CMD ["pnpm", "run", "dev:server"]



