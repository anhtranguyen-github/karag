#!/bin/bash
set -e

# --- Configuration ---
PROJECT_ROOT=$(pwd)
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

echo -e "\e[34m=== Karag DevSecOps Pipeline (Local) ===\e[0m"

# Question 1: Can this code actually run?
echo -e "\n\e[32m[Q1] Correctness: Build & Lint\e[0m"
cd "${BACKEND_DIR}"
uv sync
uvx ruff check .
uvx ruff format --check .
cd "${FRONTEND_DIR}"
pnpm install --frozen-lockfile
pnpm run lint
pnpm run build
cd "${PROJECT_ROOT}"

# Question 2: Does it behave as intended?
echo -e "\n\e[32m[Q2] Behavior: Logic & Tests\e[0m"
cd "${BACKEND_DIR}"
uv run pytest tests/unit tests/contract --junitxml=test-results/results.xml --maxfail=1
cd "${FRONTEND_DIR}"
pnpm run test:unit --run
cd "${PROJECT_ROOT}"

# Question 3: Are there obvious security risks in code patterns?
echo -e "\n\e[32m[Q3] Security: Pattern Analysis\e[0m"
cd "${BACKEND_DIR}"
uv run bandit -r app/ -ll
if grep -q ":path}" src/frontend/src/lib/api/openapi.json; then
    echo -e "\e[31mCRITICAL: Path traversal vulnerability surface detected in openapi.json!\e[0m"
    exit 1
fi
echo "✓ API Contract: PASSED"
cd "${PROJECT_ROOT}"

# Question 4: Are dependencies and artifacts trustworthy?
echo -e "\n\e[32m[Q4] Trust: Supply Chain & Artifacts\e[0m"
cd "${BACKEND_DIR}"
uv lock --check
cd "${PROJECT_ROOT}"
# Verify Dockerfile build
docker build -t karag:local-test -f src/backend/Dockerfile .

# Question 5: Are infrastructure and configs safe by default?
echo -e "\n\e[32m[Q5] Infrastructure & Config: Safety Scan\e[0m"
uvx checkov -d . --check HIGH,CRITICAL --framework dockerfile,docker_compose --soft-fail false
python3 -c "import yaml; yaml.safe_load(open('src/backend/app/core/prompts.yaml'))"

echo -e "\n\e[34m=== ALL 5 QUESTIONS ANSWERED: SUCCESS ===\e[0m"

