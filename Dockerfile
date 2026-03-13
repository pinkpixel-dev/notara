FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3489

COPY --from=build /app/dist ./dist
COPY docker/server.mjs ./docker/server.mjs

EXPOSE 3489

CMD ["node", "docker/server.mjs"]
