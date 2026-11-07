FROM node:22-alpine
RUN npm install -g pnpm@12.18.0
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile --only-builtDependencies=@prisma/client,@prisma/engines,esbuild,prisma
COPY . .
RUN pnpm prisma generate
EXPOSE 5173 5000
CMD ["pnpm", "run", "dev:server"]


