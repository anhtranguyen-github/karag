#!/bin/bash
set -e

# --- Configuration ---
BACKEND_PORT=8000
FRONTEND_PORT=3000
MAX_RETRIES=30

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}=== Karag Modular Platform Manager ===${NC}"

# --- Utility Functions ---

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]  ${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERR] ${NC} $1"; }
log_phase()   { echo -e "\n${CYAN}${BOLD}>>> PHASE: $1${NC}"; }

# SC2086 fix: quote $1 in lsof; remove redundant return $?
check_port() { lsof -i :"$1" > /dev/null; }

kill_port() {
    local port=$1
    # SC2086 fix: quote $port throughout
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_warn "Port $port is in use. Forcefully terminating..."
        fuser -k "${port}/tcp" > /dev/null 2>&1 || true
        sleep 1
        if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
            # SC2046 fix: capture pids safely before passing to kill
            local pids
            pids=$(lsof -t -i :"$port" 2>/dev/null) || true
            if [[ -n "$pids" ]]; then
                # shellcheck disable=SC2086
                kill -9 $pids > /dev/null 2>&1 || true
            fi
        fi
    fi
}

deep_cleanup() {
    log_info "Performing environment cleanup (zombies & locks)..."
    pkill -f "uvicorn.*backend.app.main:app" || true
    pkill -f "next-dev" || true
    pkill -f "next" || true
    rm -f frontend/.next/dev/lock || true
    kill_port "$BACKEND_PORT"
    kill_port "$FRONTEND_PORT"
    log_success "Environment cleaned."
}

load_env() {
    if [ -f .env ]; then
        log_info "Loading environment from .env"
        # SC2046 fix: use set -a / source to safely export vars without word-splitting
        set -a
        # shellcheck source=/dev/null
        source .env
        set +a
    else
        log_warn "No .env file found. Using system defaults."
    fi
}

# --- Phase 1: Preflight (Tool Checks) ---

preflight() {
    log_phase "PREFLIGHT (Tool Checks)"

    local missing=false
    # Check for docker compose (v2) or docker-compose (v1)
    if docker compose version >/dev/null 2>&1; then
        DOCKER_CMD="docker compose"
    elif docker-compose version >/dev/null 2>&1; then
        DOCKER_CMD="docker-compose"
    else
        log_error "Docker Compose is required but not found."
        missing=true
    fi

    for tool in uv pnpm; do
        # SC2086 fix: quote $tool
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_error "Missing required tool: $tool"
            missing=true
        fi
    done

    if [ "$missing" = true ]; then
        log_error "Please install missing tools and try again."
        exit 1
    fi
    log_success "All required tools are present."
}

# --- Phase 2: Verify (Correctness & Integrity) ---

verify_backend() {
    log_info "Verifying Backend Correctness..."
    cd backend

    log_info "Synchronizing dependencies (uv)..."
    uv sync --quiet

    log_info "Checking for syntax and import errors..."
    # SC2046 fix: use mapfile + array to safely handle filenames with spaces
    mapfile -t py_files < <(find app -name "*.py")
    if ! uv run python3 -m py_compile "${py_files[@]}" > /tmp/py_compile.err 2>&1; then
        log_error "Backend compilation failed. Found syntax or import issues:"
        cat /tmp/py_compile.err
        [ "$LAX_MODE" = "true" ] || exit 1
    fi

    log_info "Running static analysis (Ruff)..."
    if ! uv run ruff check . --quiet; then
        log_warn "Ruff detected linting issues."
    fi

    log_info "Checking code formatting (Ruff)..."
    if ! uv run ruff format --check .; then
        log_warn "Formatting issues detected. Run 'uv run ruff format .' in backend to fix."
    fi

    cd ..
    log_success "Backend integrity verified."
}

verify_frontend() {
    log_info "Verifying Frontend Correctness..."
    cd frontend

    [ ! -d "node_modules" ] && log_info "Installing dependencies..." && pnpm install --quiet

    log_info "Generating API client..."
    pnpm run generate-client

    log_info "Checking for TypeScript errors (TSC)..."
    if ! pnpm exec tsc --noEmit > /tmp/tsc.err 2>&1; then
        log_warn "TypeScript errors detected. Use './run.sh verify' to see full log."
        # SC2002 fix: avoid useless cat; read file directly with head
        [ "$LAX_MODE" = "true" ] || { log_error "Strict mode: Blocking start due to type errors."; head -n 20 /tmp/tsc.err; exit 1; }
    fi

    log_info "Running ESLint..."
    if ! pnpm run lint --quiet > /tmp/lint.err 2>&1; then
        log_warn "Linting issues found."
        # We allow linting warnings in dev mode
    fi

    cd ..
    log_success "Frontend integrity verified."
}

# --- Phase 3: Setup (Infrastructure) ---

boot_infra() {
    log_phase "BOOT (Infrastructure)"

    # Determine if Cloud Qdrant should be used (default preference)
    local USE_CLOUD_QDRANT=false
    if [[ -n "${QDRANT_URL:-}" ]] && [[ "${QDRANT_URL:-}" != *"localhost"* ]] && [[ "${QDRANT_URL:-}" != *"127.0.0.1"* ]] && [[ -n "${QDRANT_API_KEY:-}" ]]; then
        log_info "Verifying Qdrant Cloud connectivity..."
        if curl -s --connect-timeout 5 "${QDRANT_URL%/}/healthz" > /dev/null; then
            USE_CLOUD_QDRANT=true
        else
            log_warn "Qdrant Cloud unreachable. Falling back to Local Container."
        fi
    fi

    # Determine if Cloud MongoDB should be used
    local USE_CLOUD_MONGO=false
    if [[ "${MONGO_URI:-}" != *"localhost"* ]] && [[ "${MONGO_URI:-}" != *"127.0.0.1"* ]] && [[ -n "${MONGO_URI:-}" ]]; then
        log_info "Verifying MongoDB Cloud connectivity..."
        log_info "Testing URI: ${MONGO_URI:0:30}..."
        
        # Use uv to run a proper ping check via python if possible, as it handles SRV correctly
        if [[ -d "backend" ]] && command -v uv >/dev/null 2>&1; then
            # Using env var via os.getenv to avoid shell escaping issues with special characters in URI
            if (cd backend && MONGO_URI="$MONGO_URI" uv run python3 -c "import pymongo; import os; pymongo.MongoClient(os.getenv('MONGO_URI'), serverSelectionTimeoutMS=5000).admin.command('ping')" > /dev/null 2>&1); then
                USE_CLOUD_MONGO=true
                log_info "Cloud Check: Success"
            else
                log_warn "Cloud Check: Failed"
            fi
        fi

        # Fallback to TCP check if python check didn't confirm (for non-SRV or if uv is missing)
        if [ "$USE_CLOUD_MONGO" = false ]; then
            local mongo_host
            mongo_host=$(echo "$MONGO_URI" | sed -e 's/mongodb+srv:\/\///' -e 's/mongodb:\/\///' -e 's/.*@//' -e 's/\/.*//' -e 's/:.*//' | cut -d',' -f1)
            if command -v nc >/dev/null 2>&1 && nc -zw 5 "$mongo_host" 27017 >/dev/null 2>&1; then
                 USE_CLOUD_MONGO=true
            fi
        fi
        
        if [ "$USE_CLOUD_MONGO" = true ]; then
            log_info "Cloud Protocol Verified: Using MongoDB Atlas"
        else
            log_warn "MongoDB Cloud unreachable or IP not whitelisted. Falling back to Local Container."
        fi
    fi

    # Determine if Cloud Neo4j should be used
    local USE_CLOUD_NEO4J=false
    if [[ "${NEO4J_URI:-}" != *"localhost"* ]] && [[ "${NEO4J_URI:-}" != *"127.0.0.1"* ]] && [[ -n "${NEO4J_URI:-}" ]]; then
        log_info "Verifying Neo4j Cloud connectivity..."
        local neo_host
        neo_host=$(echo "$NEO4J_URI" | sed -e 's/neo4j+s:\/\///' -e 's/neo4j:\/\///' -e 's/bolt:\/\///' -e 's/.*@//' -e 's/\/.*//' -e 's/:.*//')
        if command -v nc >/dev/null 2>&1 && nc -zw 5 "$neo_host" 7687 >/dev/null 2>&1; then
            USE_CLOUD_NEO4J=true
            log_info "Cloud Protocol Verified: Using Neo4j Aura"
        else
            log_warn "Neo4j Cloud unreachable (DNS failure or Down). Falling back to Local Container."
        fi
    fi

    log_info "Calculating infrastructure footprint..."
    local services="minio"

    if [ "$USE_CLOUD_MONGO" = false ]; then
        services="mongodb $services"
    fi

    if [ "$USE_CLOUD_NEO4J" = false ]; then
        services="neo4j $services"
    fi

    if [ "${TURBO_MODE:-}" != "true" ]; then
        services="$services jenkins sonarqube sonarqube_db"
    fi

    if [ "$USE_CLOUD_QDRANT" = false ]; then
        services="qdrant $services"
        # Ensure fallback URL is set if missing or pointing to cloud while we need local
        if [[ "${QDRANT_URL:-}" != *"localhost"* ]] && [[ "${QDRANT_URL:-}" != *"127.0.0.1"* ]]; then
            export QDRANT_URL="http://localhost:6333"
            export QDRANT_API_KEY="local-dev-key"
        fi
    fi

    # If LITE_MODE is true, only start database services, skip profiles
    if [ "$LITE_MODE" = "true" ]; then
        log_info "Lite mode: Skipping local model and devops services."
        # shellcheck disable=SC2086
        $DOCKER_CMD up -d $services
    else
        # SC2086 fix: $services intentionally word-splits here; disable warning
        # shellcheck disable=SC2086
        $DOCKER_CMD --profile local-models --profile devops up -d $services
    fi

    echo -n "Waiting for core services..."
    local count=0
    if [ "$USE_CLOUD_QDRANT" = false ]; then
        # Check health using the URL from config
        local HEALTH_URL="${QDRANT_URL%/}/healthz"
        while ! curl -s "$HEALTH_URL" > /dev/null; do
            echo -n "."
            sleep 1
            count=$((count+1))
            [ $count -ge $MAX_RETRIES ] && { echo -e "${RED}\nFailed to start Qdrant local instance at $HEALTH_URL.${NC}"; exit 1; }
        done
        log_success " Local Qdrant READY!"
    fi
    log_success " Infrastructure READY!"
}

# --- Phase 4: Launch (Application Runtime) ---

launch_backend() {
    log_phase "LAUNCH (Backend)"

    mkdir -p logs
    export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}."

    log_info "Starting FastAPI in background..."
    if [ "$LITE_MODE" = "true" ]; then
        # Ensure we are using CPU-optimized build if running via docker, 
        # but for local 'uv run', it uses the local venv.
        log_info "Running in LITE mode."
    fi
    nohup uv run --project backend backend/app/main.py > logs/backend.log 2>&1 &
    local B_PID=$!

    echo -n "Waiting for API..."
    local count=0
    while ! curl -s "http://localhost:${BACKEND_PORT}/" > /dev/null; do
        echo -n "."
        sleep 1
        count=$((count+1))
        if ! ps -p "$B_PID" > /dev/null 2>&1; then
            log_error "\nBackend died immediately. Check logs/backend.log"
            exit 1
        fi
        [ $count -ge 60 ] && { log_error "\nTimeout waiting for backend."; kill "$B_PID"; exit 1; }
    done
    log_success " ONLINE (PID: $B_PID)"
}

launch_frontend() {
    log_phase "LAUNCH (Frontend)"

    cd frontend
    if [ ! -d "node_modules" ]; then
        log_warn "node_modules missing in frontend. Running pnpm install..."
        pnpm install --quiet
    fi

    # Ensure API client is generated if missing
    if [ ! -d "src/lib/api" ] || [ -z "$(ls -A src/lib/api 2>/dev/null)" ]; then
        log_info "Generating API client..."
        pnpm run generate-client
    fi

    if [ "$PROD_MODE" = "true" ]; then
        log_info "Starting Next.js Production Server..."
        # Ensure build exists for production mode
        if [ ! -d ".next" ]; then
            log_warn "No build found. Running 'pnpm run build'..."
            pnpm run build
        fi
        nohup pnpm run start > ../logs/frontend.log 2>&1 &
    else
        log_info "Starting Next.js Dev Server..."
        nohup pnpm run dev > ../logs/frontend.log 2>&1 &
    fi
    local F_PID=$!
    cd ..

    echo -n "Waiting for UI..."
    local count=0
    # Fix: add timeout to prevent infinite loop if frontend never starts
    while ! curl -s "http://127.0.0.1:${FRONTEND_PORT}" > /dev/null; do
        echo -n "."
        sleep 2
        count=$((count+1))
        if ! ps -p "$F_PID" > /dev/null 2>&1; then
            log_error "\nFrontend process died. Check logs/frontend.log"
            exit 1
        fi
        [ $count -ge 60 ] && { log_error "\nTimeout waiting for frontend (120s)."; kill "$F_PID"; exit 1; }
    done
    log_success " ONLINE (PID: $F_PID)"
}

# --- Commands ---

cmd_up() {
    load_env
    preflight
    deep_cleanup

    if [ "$SKIP_VERIFY" != "true" ]; then
        log_phase "VERIFY (Correctness)"
        verify_backend
        verify_frontend
    else
        log_warn "Skipping correctness verification (--skip-verify)"
    fi

    boot_infra
    
    if [ "$CLEAR_CLOUD" == "true" ]; then cmd_nuke "--cloud"; fi
    if [ "$CLEAR_LOCAL" == "true" ]; then cmd_nuke "--local"; fi

    launch_backend
    launch_frontend

    log_phase "SUMMARY"
    log_success "Systems are operational!"
    echo -e "Backend UI: ${YELLOW}http://localhost:${BACKEND_PORT}/docs${NC}"
    echo -e "Frontend:   ${YELLOW}http://localhost:${FRONTEND_PORT}${NC}"
    if [ "${TURBO_MODE:-}" != "true" ]; then
        echo -e "Jenkins:    ${YELLOW}http://localhost:8080${NC}"
        echo -e "SonarQube:  ${YELLOW}http://localhost:9005${NC}"
    fi
    echo -e "Logs:       ${YELLOW}tail -f logs/backend.log logs/frontend.log${NC}"
}

cmd_verify() {
    load_env
    preflight
    deep_cleanup
    log_phase "VERIFY (Detailed Correctness Check)"
    verify_backend
    verify_frontend
    log_success "Verification complete. Your code is clean and ready to fly."
}

cmd_build() {
    load_env
    preflight
    log_phase "BUILD (Production Readiness)"
    log_info "This runs the full production build pipeline to catch late errors."

    # Fix: use subshells to avoid leaving cwd changed on failure
    ( cd backend && uv sync )
    ( cd frontend && pnpm install && pnpm run build )

    log_success "Build successful. Local code matches CI 'Production' behavior."
}

cmd_nuke() {
    load_env
    local target=$1
    log_phase "NUKE (Purge Data)"
    
    if [[ "$target" == "--cloud" ]]; then
        log_warn "Purging CLOUD data sources..."
        uv run python3 scripts/purge_data.py \
            --qdrant-url "${QDRANT_URL}" --qdrant-key "${QDRANT_API_KEY}" \
            --mongo-uri "${MONGO_URI}" --mongo-db "${MONGO_DB}" \
            --neo4j-uri "${NEO4J_URI}" --neo4j-user "${NEO4J_USER}" --neo4j-pwd "${NEO4J_PASSWORD}"
    elif [[ "$target" == "--local" ]]; then
        log_warn "Purging LOCAL data sources..."
        uv run python3 scripts/purge_data.py \
            --qdrant-url "http://localhost:6333" \
            --mongo-uri "mongodb://localhost:27017" --mongo-db "karag_dev" \
            --neo4j-uri "bolt://localhost:7687" --neo4j-user "neo4j" --neo4j-pwd "neo4j_password"
    else
        log_error "Please specify --cloud or --local for the nuke command."
        exit 1
    fi
    log_success "Nuke operation complete."
}

cmd_test() {
    load_env
    preflight
    log_phase "TEST (Quality Assurance)"

    log_info "Running Backend Tests (pytest)..."
    ( cd backend && uv run pytest tests/unit tests/integration ) || log_error "Backend tests failed."

    log_info "Running Frontend Tests (vitest)..."
    ( cd frontend && pnpm run test:unit ) || log_error "Frontend tests failed."

    log_success "Testing phase complete."
}

show_help() {
    echo -e "Usage: ./run.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  up           (Default) Verify code, start infra, and launch app"
    echo "  quick        Rapid launch: skip heavy infra (DevSecOps) and verification"
    echo "  verify       Run backend and frontend correctness checks (lint, types, import)"
    echo "  build        Run full production build pipeline (backend sync + next build)"
    echo "  test         Run backend and frontend unit/integration tests"
    echo "  infra        Only start infrastructure containers"
    echo "  nuke         Purge all data from databases (requires --cloud or --local)"
    echo "  stop         Stop all processes and containers"
    echo "  clean        Nuke everything: stop, remove volumes, logs, and caches"
    echo "  status       Display heartbeat of all components"
    echo ""
    echo -e "Options:"
    echo "  --skip-verify    Skip correctness checks (only for rapid iteration)"
    echo "  --lax             Allow start even if verification has non-critical errors"
    echo "  --force-clean    Clear all caches before starting"
    echo "  --turbo          Low footprint mode: skip verify + skip heavy containers"
    echo "  --prod           Run frontend in production mode (requires build)"
    echo "  --clear-cloud    Purge cloud databases as part of the startup"
    echo "  --clear-local    Purge local databases as part of the startup"
    echo "  --lite           Cloud-first mode: Skip all GPU/Local model services and use CPU backend"
    echo ""
}

# --- Main Logic ---

COMMAND=${1:-"up"}
shift || true

# Support common flags
SKIP_VERIFY=false
LAX_MODE=false
FORCE_CLEAN=false
PROD_MODE=false
CLEAR_CLOUD=false
CLEAR_LOCAL=false
LITE_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-verify) SKIP_VERIFY=true; shift ;;
        --lax)         LAX_MODE=true; shift ;;
        --force-clean) FORCE_CLEAN=true; shift ;;
        --turbo)       TURBO_MODE=true; SKIP_VERIFY=true; shift ;;
        --prod)        PROD_MODE=true; shift ;;
        --clear-cloud|--cloud) CLEAR_CLOUD=true; shift ;;
        --clear-local|--local) CLEAR_LOCAL=true; shift ;;
        --lite)                LITE_MODE=true; shift ;;
        *) log_error "Unknown option: $1"; exit 1 ;;
    esac
done

case "$COMMAND" in
    up)    cmd_up ;;
    quick|turbo)
        TURBO_MODE=true
        SKIP_VERIFY=true
        cmd_up
        ;;
    verify) cmd_verify ;;
    build)  cmd_build ;;
    nuke)
        if [ "$CLEAR_CLOUD" == "true" ]; then cmd_nuke "--cloud"
        elif [ "$CLEAR_LOCAL" == "true" ]; then cmd_nuke "--local"
        else
            log_error "Nuke requires --cloud or --local"
            exit 1
        fi
        ;;
    test)   cmd_test ;;
    infra)
        load_env
        preflight
        boot_infra
        ;;
    stop)
        load_env
        preflight
        log_info "Stopping services..."
        $DOCKER_CMD stop
        kill_port "$BACKEND_PORT"
        kill_port "$FRONTEND_PORT"
        log_success "Stopped."
        ;;
    clean)
        load_env
        preflight
        log_warn "Deep cleaning system..."
        $DOCKER_CMD down -v
        docker system prune -f
        kill_port "$BACKEND_PORT"
        kill_port "$FRONTEND_PORT"
        rm -rf logs/ backend/.venv frontend/node_modules frontend/.next
        log_success "Cleaned."
        ;;
    status)
        load_env
        preflight
        log_phase "STATUS"
        $DOCKER_CMD ps
        echo ""
        if check_port "$BACKEND_PORT"; then log_success "Backend:  RUNNING"; else log_error "Backend:  STOPPED"; fi
        if check_port "$FRONTEND_PORT"; then log_success "Frontend: RUNNING"; else log_error "Frontend: STOPPED"; fi
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Invalid command: $COMMAND"
        show_help
        exit 1
        ;;
esac
