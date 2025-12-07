# syntax=docker/dockerfile:1.7

FROM node:20-alpine3.18 AS builder
WORKDIR /app
ARG PRISMA_DB_URL="postgresql://postgres:postgres@localhost:5432/postgres"
ENV DATABASE_URL=$PRISMA_DB_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine3.18 AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
RUN apk add --no-cache openssl1.1-compat
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY package*.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh
RUN mkdir -p uploads
EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
