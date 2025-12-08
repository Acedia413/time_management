#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ] && [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ] && [ -n "$POSTGRES_DB" ]; then
  POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  POSTGRES_SCHEMA="${POSTGRES_SCHEMA:-public}"
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?schema=${POSTGRES_SCHEMA}"
  echo "DATABASE_URL is set via POSTGRES_* environment variables"
fi

npx prisma migrate deploy
if [ "${RUN_DB_SEED:-true}" = "true" ]; then
  node dist/prisma/seed.js
fi

exec "$@"
