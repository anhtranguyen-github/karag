#!/bin/bash

# --- Configuration ---
BACKEND_PORT=8000
FRONTEND_PORT=3000
QDRANT_PORT=6333
MAX_RETRIES=30

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== AI Architect Modular Runner ===${NC}"

# Load .env if exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Function to check port status
check_port() {
    lsof -i :$1 > /dev/null
    return $?
}

# Function to kill process on port
kill_port() {
    local port=$1
    if check_port $port; then
        echo -e "${YELLOW}Port $port is in use. Terminating existing process...${NC}"
        fuser -k $port/tcp > /dev/null 2>&1
        sleep 1
    fi
}

show_help() {
    echo -e "Usage: ./run.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  all          Start everything (infra, ai, backend, frontend)"
    echo "  turbo        Cloud-First Mode: Use APIs if keys exist, else start local infra"
    echo "  infra        Start core infrastructure (Qdrant, MongoDB, MinIO)"
    echo "  ai           Start AI providers (Ollama, vLLM, llama-cpp)"
    echo "  backend      Start backend API"
    echo "  frontend     Start frontend app"
    echo "  stop         Stop Docker services and kill local processes"
    echo "  clean        Deep clean: Stop everything, remove volumes & logs"
    echo "  status       Show current status of all components"
    echo ""
    echo "Options:"
    echo "  --llm [provider]        Set LLM_PROVIDER override"
    echo "  --embedding [provider]  Set EMBEDDING_PROVIDER override"
    echo ""
    echo "Example:"
    echo "  ./run.sh turbo --llm openai"
}

# Parse Args
COMMAND="help"
if [ $# -gt 0 ]; then
    COMMAND=$1
    shift
fi

# Support 'turpo' typo
[ "$COMMAND" == "turpo" ] && COMMAND="turbo"

while [[ $# -gt 0 ]]; do
    case $1 in
        --llm)
            export LLM_PROVIDER="$2"
            shift 2
            ;;
        --embedding)
            export EMBEDDING_PROVIDER="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

if [ "$COMMAND" == "help" ]; then
    show_help
    exit 0
fi

# -- Execution Functions --

start_infra() {
    echo -e "\n${BLUE}[INFRA] Starting core services...${NC}"
    docker compose up -d qdrant mongodb minio
    echo -n "Waiting for Qdrant..."
    count=0
    while ! curl -s http://localhost:6333/healthz > /dev/null; do
        echo -n "."
        sleep 1
        count=$((count+1))
        [ $count -ge $MAX_RETRIES ] && { echo -e "${RED}\nFailed.${NC}"; exit 1; }
    done
    echo -e "${GREEN} READY!${NC}"
}

start_ai() {
    echo -e "\n${BLUE}[AI] Starting model providers...${NC}"
    docker compose up -d ollama vllm llama-cpp
    echo -e "${YELLOW}Check 'docker compose logs -f' for pull status.${NC}"
}

start_backend() {
    echo -e "\n${BLUE}[BACKEND] Starting FastAPI...${NC}"
    kill_port $BACKEND_PORT
    
    VENV_PYTHON="backend/.venv/bin/python3"
    VENV_PIP="backend/.venv/bin/pip"

    if [ ! -d "backend/.venv" ]; then
        echo -e "${YELLOW}Creating virtual environment...${NC}"
        python3 -m venv backend/.venv
        "$VENV_PIP" install -r backend/requirements.txt
    fi
    
    export PYTHONPATH=$PYTHONPATH:.
    nohup "$VENV_PYTHON" backend/app/main.py > backend.log 2>&1 &
    B_PID=$!
    echo -n "Waiting for Backend..."
    count=0
    while ! curl -s http://localhost:$BACKEND_PORT/ > /dev/null; do
        echo -n "."
        sleep 1
        count=$((count+1))
        if ! ps -p $B_PID > /dev/null; then 
            echo -e "${RED}\nBackend Died. Check backend.log${NC}"
            exit 1
        fi
        [ $count -ge 60 ] && { echo -e "${RED}\nTimeout.${NC}"; kill $B_PID; exit 1; }
    done
    echo -e "${GREEN} ONLINE (PID: $B_PID)${NC}"
}

start_frontend() {
    echo -e "\n${BLUE}[FRONTEND] Starting Next.js...${NC}"
    kill_port $FRONTEND_PORT
    cd frontend
    [ ! -d "node_modules" ] && bun install
    nohup bun run dev > ../frontend.log 2>&1 &
    F_PID=$!
    cd ..
    echo -n "Waiting..."
    while ! curl -s http://localhost:$FRONTEND_PORT > /dev/null; do echo -n "."; sleep 2; done
    echo -e "${GREEN} ONLINE (PID: $F_PID)${NC}"
}

# -- Turbo Mode Logic --

start_turbo() {
    echo -e "${BLUE}>> Entering Turbo Mode: Cloud-First Strategy${NC}"
    
    # 1. Check AI (Cloud vs Local)
    if [ ! -z "$OPENAI_API_KEY" ] || [ ! -z "$ANTHROPIC_API_KEY" ]; then
        echo -e "${GREEN}✓ Cloud AI detected. Skipping local AI containers.${NC}"
        # Still check if we need local embeddings (if using only Anthropic)
        if [ -z "$OPENAI_API_KEY" ] && [ -z "$VOYAGE_API_KEY" ]; then
            echo -e "${YELLOW}! No Cloud embedding key. Starting local AI for embeddings...${NC}"
            docker compose up -d ollama
        fi
    else
        echo -e "${YELLOW}! No Cloud AI keys. Starting full local AI stack...${NC}"
        start_ai
    fi

    # 2. Check Database (Cloud vs Local)
    # If QDRANT_HOST is not localhost, assume cloud
    if [ ! -z "$QDRANT_HOST" ] && [[ "$QDRANT_HOST" != "localhost" && "$QDRANT_HOST" != "127.0.0.1" ]]; then
        echo -e "${GREEN}✓ Cloud Database detected ($QDRANT_HOST). Skipping local infrastructure.${NC}"
    else
        echo -e "${YELLOW}! Using local infrastructure...${NC}"
        start_infra
    fi
    
    start_backend
    start_frontend
}

# Dispatcher
case "$COMMAND" in
    all)
        start_infra
        start_ai
        start_backend
        start_frontend
        ;;
    turbo)
        start_turbo
        ;;
    infra)
        start_infra
        ;;
    all-ai)
        start_ai
        ;;
    backend)
        start_backend
        ;;
    frontend)
        start_frontend
        ;;
    stop)
        echo -e "${YELLOW}Stopping all services...${NC}"
        docker compose stop
        kill_port $BACKEND_PORT
        kill_port $FRONTEND_PORT
        echo -e "${GREEN}Stopped.${NC}"
        ;;
    clean)
        echo -e "${RED}Deep cleaning system...${NC}"
        docker compose down -v
        docker system prune -f
        kill_port $BACKEND_PORT
        kill_port $FRONTEND_PORT
        rm -f backend.log frontend.log
        echo -e "${GREEN}Cleaned.${NC}"
        ;;
    status)
        echo -e "\n${BLUE}--- Docker ---${NC}"
        docker compose ps
        echo -e "\n${BLUE}--- Local ---${NC}"
        if check_port $BACKEND_PORT; then echo -e "Backend:  ${GREEN}RUNNING${NC}"; else echo -e "Backend:  ${RED}STOPPED${NC}"; fi
        if check_port $FRONTEND_PORT; then echo -e "Frontend: ${GREEN}RUNNING${NC}"; else echo -e "Frontend: ${RED}STOPPED${NC}"; fi
        ;;
    *)
        echo -e "${RED}Invalid command: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac

echo -e "\n${GREEN}=== Operation Completed ===${NC}"
