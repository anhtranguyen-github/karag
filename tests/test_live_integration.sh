#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/src/backend"
FRONTEND_DIR="$ROOT_DIR/src/frontend"
BACKEND_LOG="${TMPDIR:-/tmp}/karag-backend-live.log"
FRONTEND_LOG="${TMPDIR:-/tmp}/karag-frontend-live.log"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill -- "-${FRONTEND_PID}" 2>/dev/null || true
    sleep 1
    kill -9 -- "-${FRONTEND_PID}" 2>/dev/null || true
    wait "${FRONTEND_PID}" 2>/dev/null || true
  fi
  if [[ -n "${BACKEND_PID}" ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill -- "-${BACKEND_PID}" 2>/dev/null || true
    sleep 1
    kill -9 -- "-${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempt
  for attempt in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "Timed out waiting for ${label}: ${url}" >&2
  return 1
}

json_field() {
  local field="$1"
  python3 -c 'import json, sys; print(json.load(sys.stdin)[sys.argv[1]])' "$field"
}

require_cmd curl
require_cmd python3
require_cmd pnpm

echo "Starting backend..."
setsid bash -lc "
  cd \"$BACKEND_DIR\"
  env \
    TESTING=1 \
    DATABASE_URL=sqlite+pysqlite:///./karag-live-test.db \
    REDIS_URL= \
    ./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
" >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

wait_for_url "http://127.0.0.1:8000/health" "backend"

echo "Starting frontend..."
setsid bash -lc "
  cd \"$FRONTEND_DIR\"
  pnpm dev --hostname 127.0.0.1 --port 3000
" >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

wait_for_url "http://127.0.0.1:3000/proxy/health" "frontend proxy"

echo "Checking frontend route..."
HOME_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/)"
if [[ "$HOME_STATUS" != "307" ]]; then
  echo "Expected frontend root to redirect with 307, got ${HOME_STATUS}" >&2
  exit 1
fi

ACTOR_ID="live-test-actor"
RUN_ID="$(date +%s)"
BASE_URL="http://127.0.0.1:3000/proxy"

echo "Creating organization through frontend proxy..."
ORG_RESPONSE="$(curl -fsS -X POST "$BASE_URL/api/v1/organizations" \
  -H "Content-Type: application/json" \
  -H "X-Actor-Id: ${ACTOR_ID}" \
  --data "{\"name\":\"Live Test Org ${RUN_ID}\"}")"
ORG_ID="$(printf '%s' "$ORG_RESPONSE" | json_field id)"

echo "Creating project through frontend proxy..."
PROJECT_RESPONSE="$(curl -fsS -X POST "$BASE_URL/api/v1/organizations/${ORG_ID}/projects" \
  -H "Content-Type: application/json" \
  -H "X-Actor-Id: ${ACTOR_ID}" \
  --data "{\"name\":\"Live Test Project ${RUN_ID}\"}")"
PROJECT_ID="$(printf '%s' "$PROJECT_RESPONSE" | json_field id)"

echo "Creating workspace through frontend proxy..."
WORKSPACE_RESPONSE="$(curl -fsS -X POST "$BASE_URL/api/v1/workspaces" \
  -H "Content-Type: application/json" \
  -H "X-Actor-Id: ${ACTOR_ID}" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Project-Id: ${PROJECT_ID}" \
  --data "{\"name\":\"Live Test Workspace ${RUN_ID}\"}")"
WORKSPACE_ID="$(printf '%s' "$WORKSPACE_RESPONSE" | json_field id)"

echo "Listing created resources through frontend proxy..."
ORGS_RESPONSE="$(curl -fsS "$BASE_URL/api/v1/organizations" -H "X-Actor-Id: ${ACTOR_ID}")"
PROJECTS_RESPONSE="$(curl -fsS "$BASE_URL/api/v1/organizations/${ORG_ID}/projects" -H "X-Actor-Id: ${ACTOR_ID}")"
WORKSPACES_RESPONSE="$(curl -fsS "$BASE_URL/api/v1/workspaces" \
  -H "X-Actor-Id: ${ACTOR_ID}" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Project-Id: ${PROJECT_ID}")"

printf '%s' "$ORGS_RESPONSE" | python3 -c 'import json, sys; ids = {item["id"] for item in json.load(sys.stdin)}; sys.exit(0 if sys.argv[1] in ids else 1)' "$ORG_ID"
printf '%s' "$PROJECTS_RESPONSE" | python3 -c 'import json, sys; ids = {item["id"] for item in json.load(sys.stdin)}; sys.exit(0 if sys.argv[1] in ids else 1)' "$PROJECT_ID"
printf '%s' "$WORKSPACES_RESPONSE" | python3 -c 'import json, sys; ids = {item["id"] for item in json.load(sys.stdin)}; sys.exit(0 if sys.argv[1] in ids else 1)' "$WORKSPACE_ID"

echo "Live integration smoke test passed."
echo "Organization: ${ORG_ID}"
echo "Project: ${PROJECT_ID}"
echo "Workspace: ${WORKSPACE_ID}"

cleanup
trap - EXIT
