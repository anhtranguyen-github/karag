#!/bin/bash
#
# Karag Modular Platform Manager
# ==============================
# A comprehensive CLI for managing the Karag backend, frontend, and infrastructure.
#
# Usage: ./run.sh [COMMAND] [OPTIONS]
#

set -euo pipefail

# =============================================================================
# CONFIGURATION
# =============================================================================

readonly BACKEND_PORT=8000
readonly FRONTEND_PORT=3000
readonly MAX_RETRIES=30
readonly HEALTH_TIMEOUT=60

# =============================================================================
# UI/LOGGING
# =============================================================================

readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]  ${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERR] ${NC} $1" >&2; }
log_phase()   { echo -e "\n${CYAN}${BOLD}>>> $1${NC}"; }
log_cmd()     { echo -e "${BOLD}$1${NC}"; }
log_kv()      { printf "  %-18s %s\n" "$1" "$2"; }

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Check if a port is in use
check_port() {
    local port=$1
    lsof -i :"$port" > /dev/null 2>&1
}

# Get PIDs using a specific port
get_port_pids() {
    local port=$1
    lsof -t -i :"$port" 2>/dev/null || true
}

# Kill processes using a specific port
kill_port() {
    local port=$1
    local pids

    if ! lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1 && ! fuser "$port/tcp" >/dev/null 2>&1; then
        return 0
    fi

    log_warn "Port $port is in use. Terminating processes..."

    # Try graceful termination first
    pids=$(get_port_pids "$port")
    if [[ -n "$pids" ]]; then
        # shellcheck disable=SC2086
        kill $pids 2>/dev/null || true
        sleep 1
    fi

    # Force kill if still running
    if lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
        pids=$(get_port_pids "$port")
        if [[ -n "$pids" ]]; then
            # shellcheck disable=SC2086
            kill -9 $pids 2>/dev/null || true
        fi
        fuser -k "${port}/tcp" >/dev/null 2>&1 || true
    fi
}

# Wait for a service to become healthy
wait_for_service() {
    local name=$1
    local health_url=$2
    local max_retries=${3:-$MAX_RETRIES}
    local count=0

    log_info "Waiting for $name health endpoint: $health_url (timeout: ${max_retries}s)"
    echo -n "  Progress"
    while ! curl -sf "$health_url" >/dev/null 2>&1; do
        echo -n "."
        sleep 1
        count=$((count + 1))
        if [[ $count -ge $max_retries ]]; then
            echo -e "\n${RED}ERROR: $name failed to start within ${max_retries}s${NC}"
            return 1
        fi
    done
    log_success " READY"
}

# Wait for a port to be available
wait_for_port() {
    local name=$1
    local host=$2
    local port=$3
    local max_retries=${4:-$MAX_RETRIES}
    local count=0

    log_info "Waiting for $name TCP socket: ${host}:${port} (timeout: ${max_retries}s)"
    echo -n "  Progress"
    while ! nc -zw 2 "$host" "$port" 2>/dev/null; do
        echo -n "."
        sleep 1
        count=$((count + 1))
        if [[ $count -ge $max_retries ]]; then
            echo -e "\n${RED}ERROR: $name failed to start within ${max_retries}s${NC}"
            return 1
        fi
    done
    log_success " READY"
}

# Kill all application-related processes
deep_cleanup() {
    log_info "Cleaning up environment..."
    log_kv "Backend port" "$BACKEND_PORT"
    log_kv "Frontend port" "$FRONTEND_PORT"

    # Kill known process patterns
    pkill -f "uvicorn.*backend.app.main:app" 2>/dev/null || true
    pkill -f "next-dev" 2>/dev/null || true

    # Remove lock files
    rm -f src/frontend/.next/dev/lock 2>/dev/null || true

    # Kill ports
    kill_port "$BACKEND_PORT"
    kill_port "$FRONTEND_PORT"

    log_success "Environment cleaned"
}

# Load environment variables from .env file
load_env() {
    if [[ ! -f .env ]]; then
        log_warn "No .env file found. Using system defaults."
        return 0
    fi

    log_info "Loading environment from $(pwd)/.env"
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a
}

print_runtime_flags() {
    log_info "Runtime options:"
    log_kv "Command" "$COMMAND"
    log_kv "Skip verify" "$SKIP_VERIFY"
    log_kv "Lax mode" "$LAX_MODE"
    log_kv "Turbo mode" "$TURBO_MODE"
    log_kv "Prod mode" "$PROD_MODE"
    log_kv "Lite mode" "$LITE_MODE"
    log_kv "Plugins mode" "$PLUGINS_MODE"
    log_kv "Clear cloud" "$CLEAR_CLOUD"
    log_kv "Clear local" "$CLEAR_LOCAL"
}

# =============================================================================
# PREFLIGHT CHECKS
# =============================================================================

detect_docker_command() {
    if docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif docker-compose version >/dev/null 2>&1; then
        echo "docker-compose"
    else
        log_error "Docker Compose is required but not found"
        return 1
    fi
}

preflight() {
    log_phase "PREFLIGHT CHECKS"

    local missing=false

    # Detect Docker command
    DOCKER_CMD=$(detect_docker_command) || missing=true
    [[ "$missing" == false ]] && log_kv "Docker command" "$DOCKER_CMD"

    # Check required tools
    local tools=("uv" "pnpm")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_error "Missing required tool: $tool"
            missing=true
        else
            log_kv "$tool" "$(command -v "$tool")"
        fi
    done

    if [[ "$missing" == true ]]; then
        log_error "Please install missing tools and try again"
        exit 1
    fi

    log_success "All required tools are present"
}

# =============================================================================
# VERIFICATION
# =============================================================================

verify_backend() {
    log_info "Verifying backend..."
    log_kv "Project dir" "src/backend"

    cd src/backend

    log_info "Synchronizing dependencies..."
    log_cmd "uv sync --quiet"
    uv sync --quiet

    log_info "Checking Python syntax..."
    mapfile -t py_files < <(find app -name "*.py" 2>/dev/null)
    log_kv "Python files" "${#py_files[@]}"
    if [[ ${#py_files[@]} -gt 0 ]]; then
        if ! uv run python3 -m py_compile "${py_files[@]}" 2>/tmp/py_compile.err; then
            log_error "Python syntax errors detected:"
            cat /tmp/py_compile.err
            [[ "$LAX_MODE" == "true" ]] || exit 1
        fi
    fi

    log_info "Running backend tests..."
    log_cmd "uv run pytest tests/ --junitxml=results-unit.xml"
    uv run pytest tests/ --junitxml=results-unit.xml 2>/dev/null || log_warn "Backend tests failed"

    cd - >/dev/null
    log_success "Backend verification complete"
}

verify_frontend() {
    log_info "Verifying frontend..."
    log_kv "Project dir" "src/frontend"

    cd src/frontend

    if [[ ! -d "node_modules" ]] || [[ -z "$(ls -A node_modules 2>/dev/null)" ]]; then
        log_info "Installing dependencies..."
        log_cmd "pnpm install --silent"
        pnpm install --silent
    fi

    log_info "Generating API client..."
    log_cmd "pnpm run generate-client"
    pnpm run generate-client >/dev/null 2>&1 || true

    log_info "Running frontend unit tests (Vitest)..."
    log_cmd "pnpm run test:unit"
    if ! pnpm run test:unit 2>/tmp/vitest.err; then
        log_warn "Frontend unit tests failed"
        [[ "$LAX_MODE" == "true" ]] || {
            log_error "Vitest errors blocking start (use --lax to override):"
            head -n 15 /tmp/vitest.err
            exit 1
        }
    fi

    cd - >/dev/null
    log_success "Frontend verification complete"
}

# =============================================================================
# INFRASTRUCTURE
# =============================================================================

check_cloud_qdrant() {
    [[ -n "${QDRANT_URL:-}" ]] || return 1
    [[ -n "${QDRANT_API_KEY:-}" ]] || return 1
    [[ "$QDRANT_URL" == *"localhost"* ]] && return 1
    [[ "$QDRANT_URL" == *"127.0.0.1"* ]] && return 1

    curl -sf --connect-timeout 5 "${QDRANT_URL%/}/healthz" >/dev/null 2>&1
}

# Infra checks simplified - Postgres and Redis handled via docker compose

# Neo4j removed

boot_infra() {
    log_phase "INFRASTRUCTURE"

    # Core services that ALWAYS run
    local services="redis postgres"
    local plugin_services=""
    
    log_info "Evaluating core infrastructure"

    if [[ "$PLUGINS_MODE" == "true" ]]; then
        log_info "Plugin mode enabled: adding Qdrant and MinIO to stack"
        plugin_services="qdrant minio"
        
        if check_cloud_qdrant; then
            log_info "Using Qdrant Cloud"
            log_kv "Qdrant URL" "${QDRANT_URL:-unset}"
            plugin_services="minio"
        else
            log_info "Using local Qdrant"
            export QDRANT_URL="http://localhost:6333"
            export QDRANT_API_KEY="local-dev-key"
        fi
    fi

    # Start containers
    log_info "Starting core infrastructure: $services"
    # shellcheck disable=SC2086
    $DOCKER_CMD --profile cpu up -d $services

    if [[ -n "$plugin_services" ]]; then
        log_info "Starting plugin infrastructure: $plugin_services"
        # shellcheck disable=SC2086
        $DOCKER_CMD --profile plugins up -d $plugin_services
    fi

    # Wait for core services
    if [[ "${REDIS_URL:-}" == *"localhost"* ]] || [[ "${REDIS_URL:-}" == *"127.0.0.1"* ]]; then
        wait_for_port "Redis" "localhost" "6379" || exit 1
    fi

    if [[ "${DATABASE_URL:-}" == *"localhost"* ]] || [[ "${DATABASE_URL:-}" == *"127.0.0.1"* ]]; then
        wait_for_port "Postgres" "localhost" "54321" || exit 1
    fi

    # Wait for plugins if enabled
    if [[ "$PLUGINS_MODE" == "true" ]]; then
        if [[ "${QDRANT_URL:-}" == *"localhost"* ]]; then
             wait_for_service "Qdrant" "${QDRANT_URL%/}/healthz" || exit 1
        fi
        if [[ "${MINIO_ENDPOINT:-}" == *"localhost"* ]] || [[ "${MINIO_ENDPOINT:-}" == *"127.0.0.1"* ]]; then
            wait_for_service "MinIO" "http://localhost:9000/minio/health/live" || exit 1
        fi
    fi

    log_success "Infrastructure ready"
}

# =============================================================================
# APPLICATION LAUNCH
# =============================================================================

launch_backend() {
    log_phase "BACKEND LAUNCH"

    mkdir -p logs
    export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}."

    log_info "Starting FastAPI server..."
    log_kv "Port" "$BACKEND_PORT"
    log_kv "Log file" "logs/backend.log"
    log_cmd "uv run --project src/backend uvicorn app.main:app --host 0.0.0.0 --port ${BACKEND_PORT}"
    cd src/backend
    nohup uv run uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT}" > ../../logs/backend.log 2>&1 &
    local pid=$!
    cd - >/dev/null

    log_info "Waiting for API health check: http://localhost:${BACKEND_PORT}/health"
    echo -n "  Progress"
    local count=0
    while ! curl -sf "http://localhost:${BACKEND_PORT}/health" >/dev/null 2>&1; do
        echo -n "."
        sleep 1
        count=$((count + 1))

        if ! ps -p "$pid" >/dev/null 2>&1; then
            echo -e "\n${RED}ERROR: Backend crashed. Check logs/backend.log${NC}"
            exit 1
        fi

        if [[ $count -ge $HEALTH_TIMEOUT ]]; then
            echo -e "\n${RED}ERROR: Backend failed to start within ${HEALTH_TIMEOUT}s${NC}"
            kill "$pid" 2>/dev/null || true
            exit 1
        fi
    done

    log_success "Backend running (PID: $pid)"
}

launch_frontend() {
    log_phase "FRONTEND LAUNCH"

    mkdir -p logs
    cd src/frontend

    if [[ ! -d "node_modules" ]] || [[ -z "$(ls -A node_modules 2>/dev/null)" ]]; then
        log_info "Installing dependencies..."
        log_cmd "pnpm install --silent"
        pnpm install --silent
    fi

    if [[ ! -d "src/sdk/generated" ]] || [[ -z "$(ls -A src/sdk/generated 2>/dev/null)" ]]; then
        log_info "Generating API client..."
        log_cmd "pnpm run generate-client"
        pnpm run generate-client >/dev/null 2>&1 || true
    fi

    local pid
    if [[ "${PROD_MODE:-}" == "true" ]]; then
        log_info "Starting production server..."
        if [[ ! -d ".next" ]]; then
            log_warn "No build found. Building first..."
            log_cmd "pnpm run build"
            pnpm run build
        fi
        log_kv "Port" "$FRONTEND_PORT"
        log_kv "Log file" "logs/frontend.log"
        log_cmd "pnpm exec next start -p ${FRONTEND_PORT}"
        nohup pnpm exec next start -p "${FRONTEND_PORT}" > ../../logs/frontend.log 2>&1 &
        pid=$!
    else
        log_info "Starting development server..."
        log_kv "Port" "$FRONTEND_PORT"
        log_kv "Log file" "logs/frontend.log"
        log_cmd "pnpm exec next dev -H 0.0.0.0 -p ${FRONTEND_PORT}"
        nohup pnpm exec next dev -H 0.0.0.0 -p "${FRONTEND_PORT}" > ../../logs/frontend.log 2>&1 &
        pid=$!
    fi

    cd - >/dev/null

    log_info "Waiting for UI health check: http://127.0.0.1:${FRONTEND_PORT}"
    wait_for_port "Frontend" "localhost" "${FRONTEND_PORT}" 60 || exit 1

    log_success "Frontend running (PID: $pid)"
}

# =============================================================================
# COMMANDS
# =============================================================================

cmd_up() {
    load_env
    print_runtime_flags
    preflight
    deep_cleanup

    boot_infra

    if [[ "${SKIP_VERIFY:-}" != "true" ]]; then
        log_phase "VERIFICATION"
        verify_backend
        verify_frontend
    else
        log_warn "Skipping verification (--skip-verify)"
    fi


    [[ "${CLEAR_CLOUD:-}" == "true" ]] && cmd_nuke "--cloud"
    [[ "${CLEAR_LOCAL:-}" == "true" ]] && cmd_nuke "--local"

    launch_backend
    launch_frontend

    log_phase "SUMMARY"
    log_success "Systems operational!"
    echo ""
    echo -e "  Backend:  ${YELLOW}http://localhost:${BACKEND_PORT}/docs${NC}"
    echo -e "  Frontend: ${YELLOW}http://localhost:${FRONTEND_PORT}${NC}"
    echo ""
    echo -e "  Logs:     ${YELLOW}tail -f logs/*.log${NC}"
}

cmd_quick() {
    TURBO_MODE=true
    SKIP_VERIFY=true
    cmd_up
}

cmd_verify() {
    load_env
    preflight
    deep_cleanup
    boot_infra
    log_phase "VERIFICATION"
    verify_backend
    verify_frontend
    log_success "Verification complete"
}

cmd_build() {
    load_env
    preflight
    log_phase "BUILD"

    log_info "Building backend..."
    (cd src/backend && uv sync)

    log_info "Building frontend..."
    (cd src/frontend && pnpm install && pnpm run build)

    log_success "Build complete"
}

cmd_build_cloud() {
    load_env
    log_phase "BUILD CLOUD"

    log_info "Validating cloud configuration..."
    local missing=()

    [[ -z "${QDRANT_URL:-}" ]] && missing+=("QDRANT_URL")
    [[ -z "${QDRANT_API_KEY:-}" ]] && missing+=("QDRANT_API_KEY")

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing cloud environment variables:"
        printf '  - %s\n' "${missing[@]}"
        log_info "Set these in .env or export them before running this command"
        exit 1
    fi

    log_info "Testing cloud service connectivity..."
    local failed=()
    local skipped=()

    # Test Qdrant
    log_info "  Testing Qdrant..."
    if [[ "$QDRANT_URL" == *"localhost"* ]] || [[ "$QDRANT_URL" == *"127.0.0.1"* ]]; then
        log_warn "    Qdrant: LOCAL (skipping cloud test)"
        skipped+=("Qdrant(local)")
    elif curl -sf -H "Authorization: Bearer ${QDRANT_API_KEY}" \
        "${QDRANT_URL%/}/collections" > /dev/null 2>&1; then
        log_success "    Qdrant: CONNECTED"
    else
        log_error "    Qdrant: FAILED"
        failed+=("Qdrant")
    fi

    # Test MongoDB
    log_info "  Testing MongoDB..."
    if [[ "$MONGO_URI" == *"localhost"* ]] || [[ "$MONGO_URI" == *"127.0.0.1"* ]]; then
        log_warn "    MongoDB: LOCAL (skipping cloud test)"
        skipped+=("MongoDB(local)")
    elif command -v python3 >/dev/null 2>&1; then
        if python3 -c "
import sys
try:
    import pymongo
    client = pymongo.MongoClient('${MONGO_URI}', serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    sys.exit(0)
except Exception as e:
    sys.exit(1)
" 2>/dev/null; then
            log_success "    MongoDB: CONNECTED"
        else
            log_error "    MongoDB: FAILED"
            failed+=("MongoDB")
        fi
    else
        log_warn "    MongoDB: SKIP (python3 not available)"
    fi

    # Test Neo4j
    log_info "  Testing Neo4j..."
    if [[ "$NEO4J_URI" == *"localhost"* ]] || [[ "$NEO4J_URI" == *"127.0.0.1"* ]]; then
        log_warn "    Neo4j: LOCAL (skipping cloud test)"
        skipped+=("Neo4j(local)")
    else
        local neo_host
        neo_host=$(echo "$NEO4J_URI" | sed -e 's/neo4j+s:\/\///' -e 's/neo4j:\/\///' -e 's/bolt:\/\///' -e 's/.*@//' -e 's/\/.*//' -e 's/:.*//')
        if command -v nc >/dev/null 2>&1 && nc -zw 5 "$neo_host" 7687 2>/dev/null; then
            log_success "    Neo4j: CONNECTED"
        else
            log_error "    Neo4j: FAILED"
            failed+=("Neo4j")
        fi
    fi

    if [[ ${#failed[@]} -gt 0 ]]; then
        log_error "Cloud service connection failed:"
        printf '  - %s\n' "${failed[@]}"
        log_info "Check your credentials and network connectivity"
        log_info "Use localhost URLs for local-only builds"
        exit 1
    fi

    if [[ ${#skipped[@]} -gt 0 ]]; then
        log_warn "Some services are local-only:"
        printf '  - %s\n' "${skipped[@]}"
    fi

    log_success "All services verified!"
    echo ""
    log_info "Configuration summary:"
    log_success "  Qdrant:  CONFIGURED"
    echo ""

    log_info "Installing frontend dependencies..."
    (cd src/frontend && pnpm install --frozen-lockfile)

    log_info "Generating API client..."
    (cd src/frontend && pnpm run generate-client)

    log_info "Building frontend for production..."
    (cd src/frontend && pnpm run build)

    log_success "Cloud build complete"
    log_info "Output: src/frontend/.next/"
    log_info "Deploy this folder to your cloud hosting provider (Vercel, Netlify, etc.)"
}

cmd_test() {
    load_env
    preflight
    boot_infra
    log_phase "TEST"

    log_info "Running backend tests..."
    (cd src/backend && uv run pytest tests/ 2>/dev/null) || log_warn "Backend tests failed"

    log_info "Running frontend tests..."
    (cd src/frontend && pnpm run test:unit 2>/dev/null) || log_warn "Frontend tests failed"

    log_success "Testing complete"
}

cmd_nuke() {
    load_env
    local target=$1

    log_phase "NUKE"

    if [[ "$target" == "--cloud" ]]; then
        log_warn "Purging cloud databases..."
        uv run python3 scripts/purge_data.py \
            --qdrant-url "${QDRANT_URL}" \
            --qdrant-key "${QDRANT_API_KEY}" \
            2>/dev/null || log_warn "Cloud purge may have failed"
    elif [[ "$target" == "--local" ]]; then
        log_warn "Purging local databases..."
        uv run python3 scripts/purge_data.py \
            --qdrant-url "http://localhost:6333" \
            2>/dev/null || log_warn "Local purge may have failed"
    else
        log_error "Specify --cloud or --local"
        exit 1
    fi

    log_success "Nuke complete"
}

cmd_infra() {
    load_env
    preflight
    boot_infra
}

cmd_stop() {
    load_env
    preflight
    log_phase "STOP"

    log_info "Stopping containers..."
    $DOCKER_CMD stop 2>/dev/null || true

    log_info "Stopping applications..."
    kill_port "$BACKEND_PORT"
    kill_port "$FRONTEND_PORT"

    log_success "All services stopped"
}

cmd_clean() {
    load_env
    preflight
    log_phase "CLEAN"

    log_warn "This will remove all data, containers, and caches"
    read -r -p "Continue? [y/N] " confirm
    [[ "$confirm" =~ ^[Yy]$ ]] || { log_info "Cancelled"; exit 0; }

    log_info "Stopping and removing containers..."
    $DOCKER_CMD down -v 2>/dev/null || true
    docker system prune -f >/dev/null 2>&1 || true

    log_info "Killing processes..."
    kill_port "$BACKEND_PORT"
    kill_port "$FRONTEND_PORT"

    log_info "Removing caches and logs..."
    rm -rf logs/ src/backend/.venv src/frontend/node_modules src/frontend/.next 2>/dev/null || true

    log_success "System cleaned"
}

cmd_status() {
    load_env
    preflight
    log_phase "STATUS"

    echo "Containers:"
    $DOCKER_CMD ps 2>/dev/null || echo "  (Docker not running)"

    echo ""
    echo "Services:"
    if check_port "$BACKEND_PORT"; then
        log_success "  Backend:  RUNNING on port $BACKEND_PORT"
    else
        log_error "  Backend:  STOPPED"
    fi

    if check_port "$FRONTEND_PORT"; then
        log_success "  Frontend: RUNNING on port $FRONTEND_PORT"
    else
        log_error "  Frontend: STOPPED"
    fi
}

show_help() {
    cat << 'EOF'
Karag Platform Manager

Usage: ./run.sh [COMMAND] [OPTIONS]

Commands:
  up          Start everything: verify, infra, backend, frontend (default)
  quick       Turbo mode: skip verification and heavy services
  verify      Run code quality checks only
  build       Production build of frontend and backend
  build-cloud Build frontend using cloud services only (no local infra)
  test        Run test suites
  infra       Start only infrastructure containers
  stop        Stop all services
  clean       Remove all containers, volumes, and caches
  nuke        Purge database data (requires --cloud or --local)
  status      Show service status

Options:
  --skip-verify     Skip code verification
  --lax             Allow start despite non-critical errors
  --turbo           Quick mode: skip verify + heavy containers
  --prod            Run frontend in production mode
  --lite            Skip local model services, use CPU backend
  --plugins         Enable optional plugins (MinIO, Qdrant)
  --clear-cloud     Purge cloud databases on startup
  --clear-local     Purge local databases on startup

Examples:
  ./run.sh                    # Full development startup
  ./run.sh quick              # Fast iteration mode
  ./run.sh up --lax           # Start despite type errors
  ./run.sh build-cloud        # Build for cloud deployment
  ./run.sh nuke --local       # Reset local databases
  ./run.sh clean              # Complete system reset

EOF
}

# =============================================================================
# MAIN
# =============================================================================

# Default command
if [[ $# -gt 0 ]] && [[ "$1" != --* ]]; then
    COMMAND="$1"
    shift
else
    COMMAND="up"
fi

# Parse options
SKIP_VERIFY=false
LAX_MODE=false
TURBO_MODE=false
PROD_MODE=false
CLEAR_CLOUD=false
CLEAR_LOCAL=false
LITE_MODE=false
PLUGINS_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-verify)   SKIP_VERIFY=true; shift ;;
        --lax)           LAX_MODE=true; shift ;;
        --turbo)         TURBO_MODE=true; SKIP_VERIFY=true; shift ;;
        --prod)          PROD_MODE=true; shift ;;
        --lite)          LITE_MODE=true; shift ;;
        --plugins)       PLUGINS_MODE=true; shift ;;
        --clear-cloud|--cloud) CLEAR_CLOUD=true; shift ;;
        --clear-local|--local) CLEAR_LOCAL=true; shift ;;
        -h|--help|help)  show_help; exit 0 ;;
        *) log_error "Unknown option: $1"; show_help; exit 1 ;;
    esac
done

# Execute command
case "$COMMAND" in
    up)       cmd_up ;;
    quick)    cmd_quick ;;
    verify)   cmd_verify ;;
    build)    cmd_build ;;
    build-cloud) cmd_build_cloud ;;
    test)     cmd_test ;;
    infra)    cmd_infra ;;
    stop)     cmd_stop ;;
    clean)    cmd_clean ;;
    nuke)
        if [[ "$CLEAR_CLOUD" == true ]]; then
            cmd_nuke "--cloud"
        elif [[ "$CLEAR_LOCAL" == true ]]; then
            cmd_nuke "--local"
        else
            log_error "Nuke requires --cloud or --local"
            show_help
            exit 1
        fi
        ;;
    status)   cmd_status ;;
    help)     show_help ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
