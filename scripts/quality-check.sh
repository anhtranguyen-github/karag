#!/bin/bash
#
# Unified Quality Check Script
#
# Runs all code quality checks:
# - ruff (linting and import sorting)
# - bandit (security scanning)
# - detect-secrets (secret detection)
# - hardcoded string scanner
# - mock data scanner
# - debug artifact scanner
# - import-linter (architecture boundaries)
#
# Exit codes:
#   0 - All checks passed
#   1 - One or more checks failed

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "========================================"
echo "Code Quality Check"
echo "========================================"
echo ""

FAILED_CHECKS=0

# Function to run a check and track results
run_check() {
    local check_name="$1"
    local check_command="$2"
    
    echo -n "Running $check_name... "
    if eval "$check_command"; then
        echo -e "${GREEN}PASSED${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    echo ""
}

# 1. Ruff - Linting
echo "========================================"
echo "1. Ruff Linter"
echo "========================================"
run_check "Ruff" "ruff check ."

# 2. Bandit - Security Scanner
echo "========================================"
echo "2. Bandit Security Scanner"
echo "========================================"
run_check "Bandit" "bandit -r src/backend/ -x tests/"

# 3. Detect Secrets (if baseline exists)
echo "========================================"
echo "3. Detect Secrets"
echo "========================================"
if [ -f ".secrets.baseline" ]; then
    run_check "Detect Secrets" "detect-secrets-hook --baseline .secrets.baseline scan --strict ."
else
    echo -e "${YELLOW}SKIPPED${NC} - No .secrets.baseline found"
    echo "Run: detect-secrets scan > .secrets.baseline"
    echo ""
fi

# 4. Hardcoded Strings Scanner
echo "========================================"
echo "4. Hardcoded URL/Route Scanner"
echo "========================================"
run_check "Hardcoded Strings" "python tools/check_hardcoded_strings.py"

# 5. Mock Data Scanner
echo "========================================"
echo "5. Mock/Placeholder Data Scanner"
echo "========================================"
run_check "Mock Data" "python tools/check_mock_data.py"

# 6. Debug Artifact Scanner
echo "========================================"
echo "6. Debug Artifact Scanner"
echo "========================================"
run_check "Debug Artifacts" "python tools/check_debug_artifacts.py"

# 7. Import Linter (if available)
echo "========================================"
echo "7. Import Linter"
echo "========================================"
if command -v lint-imports &> /dev/null; then
    run_check "Import Linter" "lint-imports"
else
    # Try with import-linter package
    run_check "Import Linter" "importlinter lint importlinter.ini"
fi

# Summary
echo "========================================"
echo "Summary"
echo "========================================"
if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}$FAILED_CHECKS check(s) failed${NC}"
    exit 1
fi

