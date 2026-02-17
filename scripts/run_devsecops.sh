#!/bin/bash
set -e

echo "=== STARTING DEVSECOPS AUDIT ==="

# 1. Frontend Security Scan
echo "-----------------------------------"
echo "[Frontend] Running pnpm audit..."
cd frontend
if command -v pnpm &> /dev/null; then
    pnpm audit --audit-level high
else
    echo "pnpm not found. Skipping pnpm audit."
fi
cd ..

# 2. Backend Security Scan
echo "-----------------------------------"
echo "[Backend] Running Bandit (SAST)..."
cd backend
if command -v uv &> /dev/null; then
    uv run bandit -r app/ --recursive --skip B101,B104 || echo "Bandit found issues (but continuing for audit report)"
else
    echo "uv not found. Skipping Bandit."
fi

echo "-----------------------------------"
echo "[Backend] Running pip-audit (SCA)..."
if command -v uv &> /dev/null; then
    # Use --no-deps because we are passing a frozen requirement list from uv
    uvx pip-audit --no-deps --requirement <(uv pip freeze) || echo "pip-audit found vulnerabilities"
else
    echo "uv not found. Skipping pip-audit."
fi
cd ..

# 3. Secrets Detection (Simple Pattern Check)
echo "-----------------------------------"
echo "[Security] Scanning for secrets..."
# Exclude data directories, logs, and build artifacts to prevent permission errors and false positives
grep -rE "AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY" . \
    --exclude-dir={node_modules,.git,.venv,__pycache__,.gemini,logs,mongo_data,qdrant_storage,minio_data,.next} \
    --exclude={*.json,*.lock,*.log,.env,.env.local,.env.development.local} \
    || echo "No obvious secrets found in codebase."

echo "=== DEVSECOPS AUDIT COMPLETE ==="
