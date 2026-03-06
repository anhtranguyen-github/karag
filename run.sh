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

    if ! lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
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

    echo -n "Waiting for $name..."
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

    echo -n "Waiting for $name..."
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

    # Kill known process patterns
    pkill -f "uvicorn.*backend.app.main:app" 2>/dev/null || true
    pkill -f "next-dev" 2>/dev/null || true

    # Remove lock files
    rm -f frontend/.next/dev/lock 2>/dev/null || true

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

    log_info "Loading environment from .env"
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a
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

    # Check required tools
    local tools=("uv" "pnpm")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_error "Missing required tool: $tool"
            missing=true
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

    cd backend

    log_info "Synchronizing dependencies..."
    uv sync --quiet

    log_info "Checking Python syntax..."
    mapfile -t py_files < <(find app -name "*.py" 2>/dev/null)
    if [[ ${#py_files[@]} -gt 0 ]]; then
        if ! uv run python3 -m py_compile "${py_files[@]}" 2>/tmp/py_compile.err; then
            log_error "Python syntax errors detected:"
            cat /tmp/py_compile.err
            [[ "$LAX_MODE" == "true" ]] || exit 1
        fi
    fi

    log_info "Running static analysis (Ruff)..."
    uv run ruff check . --quiet 2>/dev/null || log_warn "Linting issues found"

    log_info "Checking code formatting..."
    uv run ruff format --check . 2>/dev/null || log_warn "Formatting issues found"

    cd - >/dev/null
    log_success "Backend verification complete"
}

verify_frontend() {
    log_info "Verifying frontend..."

    cd frontend

    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        pnpm install --silent
    fi

    log_info "Generating API client..."
    pnpm run generate-client >/dev/null 2>&1 || true

    log_info "Checking TypeScript..."
    if ! pnpm exec tsc --noEmit 2>/tmp/tsc.err; then
        log_warn "TypeScript errors detected"
        [[ "$LAX_MODE" == "true" ]] || {
            log_error "Type errors blocking start (use --lax to override):"
            head -n 15 /tmp/tsc.err
            exit 1
        }
    fi

    log_info "Running ESLint..."
    pnpm run lint 2>/dev/null || log_warn "ESLint issues found"

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

check_cloud_mongo() {
    [[ -n "${MONGO_URI:-}" ]] || return 1
    [[ "$MONGO_URI" == *"localhost"* ]] && return 1
    [[ "$MONGO_URI" == *"127.0.0.1"* ]] && return 1

    # Use Python for proper MongoDB connectivity check
    (
        cd backend
        MONGO_URI="$MONGO_URI" uv run python3 -c "
import pymongo
import os
client = pymongo.MongoClient(os.getenv('MONGO_URI'), serverSelectionTimeoutMS=5000)
client.admin.command('ping')
" 2>/dev/null
    )
}

check_cloud_neo4j() {
    [[ -n "${NEO4J_URI:-}" ]] || return 1
    [[ "$NEO4J_URI" == *"localhost"* ]] && return 1
    [[ "$NEO4J_URI" == *"127.0.0.1"* ]] && return 1

    local host
    host=$(echo "$NEO4J_URI" | sed -e 's/neo4j+s:\/\///' -e 's/neo4j:\/\///' -e 's/bolt:\/\///' -e 's/.*@//' -e 's/\/.*//' -e 's/:.*//')
    nc -zw 5 "$host" 7687 2>/dev/null
}

boot_infra() {
    log_phase "INFRASTRUCTURE"

    local services="minio"
    local local_services=()

    # Determine which services need local containers
    if check_cloud_qdrant; then
        log_info "Using Qdrant Cloud"
    else
        if [[ -n "${QDRANT_URL:-}" ]] && [[ "$QDRANT_URL" != *"localhost"* ]] && [[ "$QDRANT_URL" != *"127.0.0.1"* ]]; then
            log_warn "Qdrant Cloud unreachable, falling back to local Qdrant"
        else
            log_info "Using local Qdrant"
        fi
        services="qdrant $services"
        export QDRANT_URL="http://localhost:6333"
        export QDRANT_API_KEY="local-dev-key"
    fi

    if check_cloud_mongo; then
        log_info "Using MongoDB Atlas"
    else
        if [[ -n "${MONGO_URI:-}" ]] && [[ "$MONGO_URI" != *"localhost"* ]] && [[ "$MONGO_URI" != *"127.0.0.1"* ]]; then
            log_warn "MongoDB Atlas unreachable, falling back to local MongoDB"
        else
            log_info "Using local MongoDB"
        fi
        services="mongodb $services"
        export MONGO_URI="mongodb://localhost:27017"
    fi

    if check_cloud_neo4j; then
        log_info "Using Neo4j Aura"
    else
        if [[ -n "${NEO4J_URI:-}" ]] && [[ "$NEO4J_URI" != *"localhost"* ]] && [[ "$NEO4J_URI" != *"127.0.0.1"* ]]; then
            log_warn "Neo4j Cloud unreachable, falling back to local Neo4j"
        else
            log_info "Using local Neo4j"
        fi
        services="neo4j $services"
        export NEO4J_URI="bolt://localhost:7687"
        export NEO4J_USER="neo4j"
        export NEO4J_PASSWORD="neo4j_password"
    fi

    # Add DevSecOps services unless in turbo mode
    if [[ "${TURBO_MODE:-}" != "true" ]]; then
        services="$services jenkins sonarqube sonarqube_db"
    fi

    # Start containers
    log_info "Starting services: $services"
    if [[ "${LITE_MODE:-}" == "true" ]]; then
        # shellcheck disable=SC2086
        $DOCKER_CMD up -d $services
    else
        # shellcheck disable=SC2086
        $DOCKER_CMD --profile local-models --profile devops up -d $services
    fi

    # Wait for local services to be ready
    if [[ "${QDRANT_URL:-}" == *"localhost"* ]]; then
        wait_for_service "Qdrant" "${QDRANT_URL%/}/healthz" || exit 1
    fi

    if [[ "${MINIO_ENDPOINT:-}" == *"localhost"* ]] || [[ "${MINIO_ENDPOINT:-}" == *"127.0.0.1"* ]]; then
        wait_for_service "MinIO" "http://localhost:9000/minio/health/live" || exit 1
    fi

    if [[ "${MONGO_URI:-}" == *"localhost"* ]] || [[ "${MONGO_URI:-}" == *"127.0.0.1"* ]]; then
        wait_for_port "MongoDB" "localhost" "27017" || exit 1
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
    nohup uv run --project backend backend/app/main.py > logs/backend.log 2>&1 &
    local pid=$!

    echo -n "Waiting for API..."
    local count=0
    while ! curl -sf "http://localhost:${BACKEND_PORT}/" >/dev/null 2>&1; do
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

    cd frontend

    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        pnpm install --silent
    fi

    if [[ ! -d "src/lib/api" ]] || [[ -z "$(ls -A src/lib/api 2>/dev/null)" ]]; then
        log_info "Generating API client..."
        pnpm run generate-client >/dev/null 2>&1 || true
    fi

    local pid
    if [[ "${PROD_MODE:-}" == "true" ]]; then
        log_info "Starting production server..."
        if [[ ! -d ".next" ]]; then
            log_warn "No build found. Building first..."
            pnpm run build
        fi
        nohup pnpm run start > ../logs/frontend.log 2>&1 &
        pid=$!
    else
        log_info "Starting development server..."
        nohup pnpm run dev > ../logs/frontend.log 2>&1 &
        pid=$!
    fi

    cd - >/dev/null

    echo -n "Waiting for UI..."
    local count=0
    while ! curl -sf "http://127.0.0.1:${FRONTEND_PORT}" >/dev/null 2>&1; do
        echo -n "."
        sleep 2
        count=$((count + 1))

        if ! ps -p "$pid" >/dev/null 2>&1; then
            echo -e "\n${RED}ERROR: Frontend crashed. Check logs/frontend.log${NC}"
            exit 1
        fi

        if [[ $count -ge $HEALTH_TIMEOUT ]]; then
            echo -e "\n${RED}ERROR: Frontend failed to start within ${HEALTH_TIMEOUT}s${NC}"
            kill "$pid" 2>/dev/null || true
            exit 1
        fi
    done

    log_success "Frontend running (PID: $pid)"
}

# =============================================================================
# COMMANDS
# =============================================================================

cmd_up() {
    load_env
    preflight
    deep_cleanup

    if [[ "${SKIP_VERIFY:-}" != "true" ]]; then
        log_phase "VERIFICATION"
        verify_backend
        verify_frontend
    else
        log_warn "Skipping verification (--skip-verify)"
    fi

    boot_infra

    [[ "${CLEAR_CLOUD:-}" == "true" ]] && cmd_nuke "--cloud"
    [[ "${CLEAR_LOCAL:-}" == "true" ]] && cmd_nuke "--local"

    launch_backend
    launch_frontend

    log_phase "SUMMARY"
    log_success "Systems operational!"
    echo ""
    echo -e "  Backend:  ${YELLOW}http://localhost:${BACKEND_PORT}/docs${NC}"
    echo -e "  Frontend: ${YELLOW}http://localhost:${FRONTEND_PORT}${NC}"
    if [[ "${TURBO_MODE:-}" != "true" ]]; then
        echo -e "  Jenkins:  ${YELLOW}http://localhost:8080${NC}"
        echo -e "  SonarQube:${YELLOW}http://localhost:9005${NC}"
    fi
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
    (cd backend && uv sync)

    log_info "Building frontend..."
    (cd frontend && pnpm install && pnpm run build)

    log_success "Build complete"
}

cmd_build_cloud() {
    load_env
    log_phase "BUILD CLOUD"

    log_info "Validating cloud configuration..."
    local missing=()

    [[ -z "${QDRANT_URL:-}" ]] && missing+=("QDRANT_URL")
    [[ -z "${QDRANT_API_KEY:-}" ]] && missing+=("QDRANT_API_KEY")
    [[ -z "${MONGO_URI:-}" ]] && missing+=("MONGO_URI")
    [[ -z "${NEO4J_URI:-}" ]] && missing+=("NEO4J_URI")

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
    log_success "  MongoDB: CONFIGURED"
    log_success "  Neo4j:   CONFIGURED"
    echo ""

    log_info "Installing frontend dependencies..."
    (cd frontend && pnpm install --frozen-lockfile)

    log_info "Generating API client..."
    (cd frontend && pnpm run generate-client)

    log_info "Building frontend for production..."
    (cd frontend && pnpm run build)

    log_success "Cloud build complete"
    log_info "Output: frontend/.next/"
    log_info "Deploy this folder to your cloud hosting provider (Vercel, Netlify, etc.)"
}

cmd_test() {
    load_env
    preflight
    log_phase "TEST"

    log_info "Running backend tests..."
    (cd backend && uv run pytest tests/unit tests/integration 2>/dev/null) || log_warn "Backend tests failed"

    log_info "Running frontend tests..."
    (cd frontend && pnpm run test:unit 2>/dev/null) || log_warn "Frontend tests failed"

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
            --mongo-uri "${MONGO_URI}" \
            --mongo-db "${MONGO_DB}" \
            --neo4j-uri "${NEO4J_URI}" \
            --neo4j-user "${NEO4J_USER}" \
            --neo4j-pwd "${NEO4J_PASSWORD}" \
            2>/dev/null || log_warn "Cloud purge may have failed"
    elif [[ "$target" == "--local" ]]; then
        log_warn "Purging local databases..."
        uv run python3 scripts/purge_data.py \
            --qdrant-url "http://localhost:6333" \
            --mongo-uri "mongodb://localhost:27017" \
            --mongo-db "karag_dev" \
            --neo4j-uri "bolt://localhost:7687" \
            --neo4j-user "neo4j" \
            --neo4j-pwd "neo4j_password" \
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
    rm -rf logs/ backend/.venv frontend/node_modules frontend/.next 2>/dev/null || true

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
COMMAND="${1:-up}"
shift || true

# Parse options
SKIP_VERIFY=false
LAX_MODE=false
TURBO_MODE=false
PROD_MODE=false
CLEAR_CLOUD=false
CLEAR_LOCAL=false
LITE_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-verify)   SKIP_VERIFY=true; shift ;;
        --lax)           LAX_MODE=true; shift ;;
        --turbo)         TURBO_MODE=true; SKIP_VERIFY=true; shift ;;
        --prod)          PROD_MODE=true; shift ;;
        --lite)          LITE_MODE=true; shift ;;
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
