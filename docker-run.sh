#!/bin/bash

# ============================================
# docker-run.sh
# Poori app ko sirf "docker" commands se chalata hai (bina compose ke).
# Project ke root (crp-pro) se chalana hai.
# ============================================

NETWORK="crp-net"
VOLUME="pgdata"

echo "=== 1) Network bana rahe hain ==="
docker network create $NETWORK

echo "=== 2) Database (Postgres) chala rahe hain ==="
docker run -d \
  --name db \
  --network $NETWORK \
  -e POSTGRES_USER=crp \
  -e POSTGRES_PASSWORD=crp_dev_only_pw \
  -e POSTGRES_DB=crp \
  -v $VOLUME:/var/lib/postgresql/data \
  -p 5433:5432 \
  postgres:16

echo "=== db ke ready hone ka intezaar... ==="
until docker exec db pg_isready -U crp >/dev/null 2>&1; do
  echo "  ...db abhi ready nahi, 2 sec ruko"
  sleep 2
done
echo "db ready hai!"

echo "=== 3) Backend image bana rahe hain ==="
docker build -t crp-backend ./Backend

echo "=== 4) Frontend image bana rahe hain ==="
docker build -t crp-frontend \
  --build-arg VITE_API_URL=http://localhost:8000 \
  ./Frontend

echo "=== 5) Backend container chala rahe hain ==="
docker run -d \
  --name backend \
  --network $NETWORK \
  -e APP_ENV=dev \
  -e DATABASE_URL="postgresql+psycopg2://crp:crp_dev_only_pw@db:5432/crp" \
  -e CORS_ORIGINS=http://localhost:8080 \
  -p 8000:8000 \
  crp-backend

echo "=== 6) Frontend container chala rahe hain ==="
docker run -d \
  --name frontend \
  --network $NETWORK \
  -p 8080:8080 \
  crp-frontend

echo "=========================================="
echo " Sab chal pada!"
echo " Frontend: http://localhost:8080"
echo " Backend:  http://localhost:8000"
echo " Database: localhost:5433"
echo "=========================================="

echo ""
echo "=== Jo IMAGES bani: ==="
docker images | grep crp

echo ""
echo "=== Jo CONTAINERS chal rahe: ==="
docker ps
