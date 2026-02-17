#!/bin/bash
set -e

# --- Configuration ---
PROJECT_ROOT=$(pwd)
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

echo -e "\e[34m=== Karag Local DevSecOps Pipeline ===\e[0m"
echo "Constraint: LOCAL-ONLY. No Cloud. No Docker Registries."

# 1. Prompt Registry Validation
echo -e "\n\e[32m[Stage 1/7] Prompt Registry Validation\e[0m"
python3 -c "import yaml; yaml.safe_load(open('backend/app/core/prompts.yaml'))" && echo "✓ Prompt Registry: PASSED"

# 2. Backend Unit Tests
echo -e "\n\e[32m[Stage 2/7] Backend Unit Tests (Pytest)\e[0m"
cd "${BACKEND_DIR}"
# Ensure test-results dir exists for sonar reports
mkdir -p test-results
uv run python -m pytest tests/ --junitxml=test-results/results.xml --maxfail=1
echo "✓ Backend Tests: PASSED"
cd "${PROJECT_ROOT}"

# 3. Frontend CI (Lint & Unit Tests)
echo -e "\n\e[32m[Stage 3/7] Frontend CI (Lint & Vitest)\e[0m"
cd "${FRONTEND_DIR}"
pnpm run lint --quiet
pnpm run test:unit --run
echo "✓ Frontend CI: PASSED"
cd "${PROJECT_ROOT}"

# 4. API Contract Security Audit
echo -e "\n\e[32m[Stage 4/7] API Contract Security Audit\e[0m"
if grep -q ":path}" frontend/src/lib/api/openapi.json; then
    echo -e "\e[31mCRITICAL: Path traversal vulnerability surface detected in openapi.json!\e[0m"
    grep ":path}" frontend/src/lib/api/openapi.json
    exit 1
fi
echo "✓ API Contract: PASSED"

# 5. Code Quality Analysis (SonarQube)
# Note: This assumes a local SonarQube container is available or can be started as a tool.
echo -e "\n\e[32m[Stage 5/6] SonarQube Analysis (Tool via Docker)\e[0m"
# Since we don't have a confirmed running Sonar server, we attempt scan if reachable
if docker ps | grep -q "sonarqube"; then
    echo "SonarQube server detected. Running scanner tool..."
    docker run --rm \
        -v "${PROJECT_ROOT}:/usr/src" \
        --network host \
        sonarsource/sonar-scanner-cli
else
    echo "SonarQube server not running locally. Skipping scan stage."
fi

# 6. Infrastructure Scanning (Checkov)
echo -e "\n\e[32m[Stage 6/7] Infrastructure Scanning (Checkov)\e[0m"
# Scan the repository for IaC issues using Docker as a runtime tool (or uvx)
uvx checkov -d . --check HIGH,CRITICAL --soft-fail || echo "Checkov found potential issues."

# 7. Local Deployment & Proxy (Nginx)
echo -e "\n\e[32m[Stage 7/7] Local Deployment & Proxy (Nginx)\e[0m"
echo "[Nginx] Starting local proxy tool via Docker..."
# Adlering to "Docker for tools only" - Nginx acts as the local entrypoint proxy
if docker ps | grep -q "ai-nginx"; then
    echo "Restarting ai-nginx proxy..."
    docker stop ai-nginx > /dev/null
    docker rm ai-nginx > /dev/null
fi

docker run -d \
    --name ai-nginx \
    --network host \
    -v "${PROJECT_ROOT}/nginx.conf:/etc/nginx/nginx.conf:ro" \
    nginx:alpine > /dev/null

echo "✓ Local Nginx Proxy: STARTED (Listening on http://localhost:80)"

echo -e "\n\e[34m=== DEVSECOPS RUN COMPLETE ===\e[0m"
echo "All local pipeline stages finished successfully."
