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

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]  ${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERR] ${NC} $1"; }
log_phase() { echo -e "\n${CYAN}${BOLD}>>> PHASE: $1${NC}"; }

check_port() { lsof -i :$1 > /dev/null; return $?; }

kill_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        log_warn "Port $port is in use. Forcefully terminating..."
        fuser -k $port/tcp > /dev/null 2>&1 || true
        sleep 1
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
            lsof -t -i :$port | xargs kill -9 > /dev/null 2>&1 || true
        fi
    fi
}

deep_cleanup() {
    log_info "Performing environment cleanup (zombies & locks)..."
    pkill -f "uvicorn.*backend.app.main:app" || true
    pkill -f "next-dev" || true
    pkill -f "next" || true
    rm -f frontend/.next/dev/lock || true
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    log_success "Environment cleaned."
}

load_env() {
    if [ -f .env ]; then
        log_info "Loading environment from .env"
        export $(grep -v '^#' .env | xargs)
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
        if ! command -v $tool >/dev/null 2>&1; then
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
    if ! uv run python3 -m py_compile $(find app -name "*.py") > /tmp/py_compile.err 2>&1; then
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
        [ "$LAX_MODE" = "true" ] || { log_error "Strict mode: Blocking start due to type errors."; cat /tmp/tsc.err | head -n 20; exit 1; }
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
    
    # Determine if Qdrant is local
    local IS_LOCAL_QDRANT=false
    if [[ "$QDRANT_URL" == *"localhost"* ]] || [[ "$QDRANT_URL" == *"127.0.0.1"* ]]; then
        IS_LOCAL_QDRANT=true
    fi

    log_info "Spinning up core containers..."
    local services="mongodb minio neo4j jenkins sonarqube sonarqube_db"
    if [ "$IS_LOCAL_QDRANT" = true ]; then
        services="qdrant $services"
    fi
    $DOCKER_CMD up -d $services
    
    echo -n "Waiting for core services..."
    local count=0
    if [ "$IS_LOCAL_QDRANT" = true ]; then
        # Check health using the URL from config
        # Strip trailing slash and add /healthz
        local HEALTH_URL="${QDRANT_URL%/}/healthz"
        while ! curl -s "$HEALTH_URL" > /dev/null; do
            echo -n "."
            sleep 1
            count=$((count+1))
            [ $count -ge $MAX_RETRIES ] && { echo -e "${RED}\nFailed to start Qdrant local instance at $HEALTH_URL.${NC}"; exit 1; }
        done
        log_success " Local Qdrant READY!"
    else
        log_info "Using External/Cloud Qdrant: $QDRANT_URL"
    fi
    log_success " Infrastructure READY!"
}

# --- Phase 4: Launch (Application Runtime) ---

launch_backend() {
    log_phase "LAUNCH (Backend)"
    
    mkdir -p logs
    export PYTHONPATH=$PYTHONPATH:.
    
    log_info "Starting FastAPI in background..."
    nohup uv run --project backend backend/app/main.py > logs/backend.log 2>&1 &
    local B_PID=$!
    
    echo -n "Waiting for API..."
    local count=0
    while ! curl -s http://localhost:$BACKEND_PORT/ > /dev/null; do
        echo -n "."
        sleep 1
        count=$((count+1))
        if ! ps -p $B_PID > /dev/null; then 
            log_error "\nBackend died immediately. Check logs/backend.log"
            exit 1
        fi
        [ $count -ge 60 ] && { log_error "\nTimeout waiting for backend."; kill $B_PID; exit 1; }
    done
    log_success " ONLINE (PID: $B_PID)"
}

launch_frontend() {
    log_phase "LAUNCH (Frontend)"
    
    cd frontend
    log_info "Starting Next.js Dev Server..."
    nohup pnpm run dev > ../logs/frontend.log 2>&1 &
    local F_PID=$!
    cd ..
    
    echo -n "Waiting for UI..."
    while ! curl -s http://localhost:$FRONTEND_PORT > /dev/null; do
        echo -n "."
        sleep 2
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
    launch_backend
    launch_frontend
    
    log_phase "SUMMARY"
    log_success "Systems are operational!"
    echo -e "Backend UI: ${YELLOW}http://localhost:${BACKEND_PORT}/docs${NC}"
    echo -e "Frontend:   ${YELLOW}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "Jenkins:    ${YELLOW}http://localhost:8080${NC}"
    echo -e "SonarQube:  ${YELLOW}http://localhost:9005${NC}"
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
    
    cd backend && uv sync && cd ..
    cd frontend && pnpm install && pnpm run build && cd ..
    
    log_success "Build successful. Local code matches CI 'Production' behavior."
}

cmd_test() {
    load_env
    preflight
    log_phase "TEST (Quality Assurance)"
    
    log_info "Running Backend Tests (pytest)..."
    cd backend
    uv run pytest tests/unit tests/integration || log_error "Backend tests failed."
    cd ..
    
    log_info "Running Frontend Tests (vitest)..."
    cd frontend
    pnpm run test:unit || log_error "Frontend tests failed."
    cd ..
    
    log_success "Testing phase complete."
}

show_help() {
    echo -e "Usage: ./run.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  up           (Default) Verify code, start infra, and launch app"
    echo "  verify       Run backend and frontend correctness checks (lint, types, import)"
    echo "  build        Run full production build pipeline (backend sync + next build)"
    echo "  test         Run backend and frontend unit/integration tests"
    echo "  infra        Only start infrastructure containers"
    echo "  stop         Stop all processes and containers"
    echo "  clean        Nuke everything: stop, remove volumes, logs, and caches"
    echo "  status       Display heartbeat of all components"
    echo ""
    echo -e "Options:"
    echo "  --skip-verify    Skip correctness checks (only for rapid iteration)"
    echo "  --lax             Allow start even if verification has non-critical errors"
    echo "  --force-clean    Clear all caches before starting"
    echo ""
}

# --- Main Logic ---

COMMAND=${1:-"up"}
shift || true

# Support common flags
SKIP_VERIFY=false
LAX_MODE=false
FORCE_CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-verify) SKIP_VERIFY=true; shift ;;
        --lax)         LAX_MODE=true; shift ;;
        --force-clean) FORCE_CLEAN=true; shift ;;
        *) log_error "Unknown option: $1"; exit 1 ;;
    esac
done

case "$COMMAND" in
    up)    cmd_up ;;
    verify) cmd_verify ;;
    build) cmd_build ;;
    test)  cmd_test ;;
    infra)
        preflight
        boot_infra 
        ;;
    stop)
        preflight
        log_info "Stopping services..."
        $DOCKER_CMD stop
        kill_port $BACKEND_PORT
        kill_port $FRONTEND_PORT
        log_success "Stopped."
        ;;
    clean)
        preflight
        log_warn "Deep cleaning system..."
        $DOCKER_CMD down -v
        docker system prune -f
        kill_port $BACKEND_PORT
        kill_port $FRONTEND_PORT
        rm -rf logs/ backend/.venv frontend/node_modules frontend/.next
        log_success "Cleaned."
        ;;
    status)
        preflight
        log_phase "STATUS"
        $DOCKER_CMD ps
        echo ""
        if check_port $BACKEND_PORT; then log_success "Backend:  RUNNING"; else log_error "Backend:  STOPPED"; fi
        if check_port $FRONTEND_PORT; then log_success "Frontend: RUNNING"; else log_error "Frontend: STOPPED"; fi
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
