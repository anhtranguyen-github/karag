#!/usr/bin/env bash
# ==============================================================================
# Karag Platform — Live E2E Test Suite
# ==============================================================================
# Tests: Auth, Org, Project, Workspace, RBAC, Documents, API Keys, Scope isolation
# Usage: bash tests/test_live_e2e.sh
# Requires: Backend running at http://localhost:8000
# ==============================================================================

set -uo pipefail

BASE="http://localhost:8000"
API="$BASE/api/v1"

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
TOTAL=0
ERRORS=()

# ── Helpers ───────────────────────────────────────────────────────────────────
assert_status() {
    local label="$1"
    local expected="$2"
    local actual="$3"
    local body="${4:-}"
    TOTAL=$((TOTAL + 1))
    if [[ "$actual" == "$expected" ]]; then
        echo -e "  ${GREEN}✓${NC} $label ${CYAN}(HTTP $actual)${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $label — expected ${YELLOW}$expected${NC}, got ${RED}$actual${NC}"
        [[ -n "$body" ]] && echo -e "    ${RED}Response: ${body:0:200}${NC}"
        FAIL=$((FAIL + 1))
        ERRORS+=("$label: expected=$expected actual=$actual")
    fi
}

assert_contains() {
    local label="$1"
    local needle="$2"
    local haystack="$3"
    TOTAL=$((TOTAL + 1))
    if echo "$haystack" | grep -qF "$needle"; then
        echo -e "  ${GREEN}✓${NC} $label ${CYAN}(contains '$needle')${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $label — response does NOT contain '${YELLOW}$needle${NC}'"
        echo -e "    ${RED}Response: ${haystack:0:200}${NC}"
        FAIL=$((FAIL + 1))
        ERRORS+=("$label: missing '$needle'")
    fi
}

assert_not_empty() {
    local label="$1"
    local value="$2"
    TOTAL=$((TOTAL + 1))
    if [[ -n "$value" && "$value" != "null" ]]; then
        echo -e "  ${GREEN}✓${NC} $label ${CYAN}(value='${value:0:40}')${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $label — value is empty/null"
        FAIL=$((FAIL + 1))
        ERRORS+=("$label: value is empty")
    fi
}

phase() {
    echo ""
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}  PHASE $1: $2${NC}"
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
}

# Tenant headers builder
tenant_headers() {
    local org="$1"
    local prj="$2"
    local actor="${3:-system}"
    local ws="${4:-}"
    local extra="-H 'X-Organization-Id: $org' -H 'X-Project-Id: $prj' -H 'X-Actor-Id: $actor'"
    [[ -n "$ws" ]] && extra="$extra -H 'X-Workspace-Id: $ws'"
    echo "$extra"
}

# ── Stored IDs ────────────────────────────────────────────────────────────────
ORG_ID="test-org-$(date +%s)"
ORG_NAME="Test Organization"
PRJ_ID=""
PRJ_NAME="Test Project"
WS_ID=""
WS_NAME="Test Workspace"

USER_A_ID=""
USER_B_ID=""
USER_C_ID=""
USER_A_TOKEN=""
USER_B_TOKEN=""
USER_C_TOKEN=""

API_KEY_ID=""
API_KEY_VALUE=""

ORG_B_ID="test-org-b-$(date +%s)"

# Unique emails
TS=$(date +%s)
USER_A_EMAIL="admin_${TS}@test.com"
USER_B_EMAIL="member_${TS}@test.com"
USER_C_EMAIL="viewer_${TS}@test.com"

# ==============================================================================
# PHASE 1: HEALTH & INFRASTRUCTURE
# ==============================================================================
phase "1" "Health & Infrastructure"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/health")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /health" "200" "$CODE" "$BODY"
assert_contains "/health returns ok" '"status":"ok"' "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE/health/dependencies")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /health/dependencies" "200" "$CODE" "$BODY"
assert_contains "Dependencies has counts" '"counts"' "$BODY"

# ==============================================================================
# PHASE 2: AUTH — REGISTER & LOGIN
# ==============================================================================
phase "2" "Auth — Register & Login"

# Register User A (admin)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"Admin1234!\",\"full_name\":\"Admin User\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Register User A (admin)" "201" "$CODE" "$BODY"
USER_A_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "User A ID captured" "$USER_A_ID"

# Register User B (member)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"Member1234!\",\"full_name\":\"Member User\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Register User B (member)" "201" "$CODE" "$BODY"
USER_B_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "User B ID captured" "$USER_B_ID"

# Register User C (viewer)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$USER_C_EMAIL\",\"password\":\"Viewer1234!\",\"full_name\":\"Viewer User\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Register User C (viewer)" "201" "$CODE" "$BODY"
USER_C_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "User C ID captured" "$USER_C_ID"

# Login User A
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"Admin1234!\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Login User A" "200" "$CODE" "$BODY"
USER_A_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
assert_not_empty "User A token captured" "$USER_A_TOKEN"

# Login User B
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"Member1234!\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Login User B" "200" "$CODE" "$BODY"
USER_B_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
assert_not_empty "User B token captured" "$USER_B_TOKEN"

# Login User C
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$USER_C_EMAIL\",\"password\":\"Viewer1234!\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Login User C" "200" "$CODE" "$BODY"
USER_C_TOKEN=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)
assert_not_empty "User C token captured" "$USER_C_TOKEN"

# GET /me with User A's token
RESP=$(curl -s -w "\n%{http_code}" "$API/auth/me" \
    -H "Authorization: Bearer $USER_A_TOKEN")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "GET /me (User A)" "200" "$CODE" "$BODY"
assert_contains "/me returns admin email" "$USER_A_EMAIL" "$BODY"

# Duplicate registration → should fail
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"Admin1234!\",\"full_name\":\"Admin User\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Duplicate registration rejected" "400" "$CODE" "$BODY"

# ==============================================================================
# PHASE 3: ORGANIZATION CRUD
# ==============================================================================
phase "3" "Organization CRUD"

# Create Org
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/organizations" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$ORG_ID\",\"name\":\"$ORG_NAME\",\"description\":\"E2E test org\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Create Organization" "201" "$CODE" "$BODY"
assert_contains "Org has correct name" "$ORG_NAME" "$BODY"

# List Orgs
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations" \
    -H "X-Actor-Id: system")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "List Organizations" "200" "$CODE" "$BODY"
assert_contains "List contains our org" "$ORG_ID" "$BODY"

# Get Org (with tenant headers — admin dev-mode fallback)
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: dummy" \
    -H "X-Actor-Id: system")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Get Organization" "200" "$CODE" "$BODY"
assert_contains "Get returns correct org ID" "$ORG_ID" "$BODY"

# Duplicate Org → 409
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/organizations" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$ORG_ID\",\"name\":\"Duplicate Org\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Duplicate org → 409" "409" "$CODE" "$BODY"

# ==============================================================================
# PHASE 4: PROJECT CRUD
# ==============================================================================
phase "4" "Project CRUD"

# Create Project
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/organizations/$ORG_ID/projects" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$PRJ_NAME\",\"description\":\"E2E test project\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Create Project" "201" "$CODE" "$BODY"
PRJ_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Project ID captured" "$PRJ_ID"
assert_contains "Project has correct org_id" "$ORG_ID" "$BODY"

# List Projects
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID/projects" \
    -H "X-Actor-Id: system")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "List Projects" "200" "$CODE" "$BODY"
assert_contains "List contains our project" "$PRJ_ID" "$BODY"

# Get Project (with tenant headers)
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID/projects/$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Get Project" "200" "$CODE" "$BODY"

# Update Project
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$API/organizations/$ORG_ID/projects/$PRJ_ID" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system" \
    -d "{\"name\":\"Updated Project Name\",\"description\":\"Updated desc\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Update Project" "200" "$CODE" "$BODY"
assert_contains "Project name updated" "Updated Project Name" "$BODY"

# ==============================================================================
# PHASE 5: WORKSPACE CRUD
# ==============================================================================
phase "5" "Workspace CRUD"

# Create Workspace
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/workspaces" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system" \
    -d "{\"name\":\"$WS_NAME\",\"description\":\"E2E test workspace\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Create Workspace" "201" "$CODE" "$BODY"
WS_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Workspace ID captured" "$WS_ID"

# List Workspaces
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "List Workspaces" "200" "$CODE" "$BODY"
assert_contains "List contains workspace" "$WS_ID" "$BODY"

# Get Workspace
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces/$WS_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Get Workspace" "200" "$CODE" "$BODY"
assert_contains "Workspace has correct name" "$WS_NAME" "$BODY"

# Get RAG Config (auto-created with defaults)
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces/$WS_ID/rag-config" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Get RAG Config" "200" "$CODE" "$BODY"
assert_contains "RAG config has embedding" '"embedding"' "$BODY"
assert_contains "RAG config has retriever" '"retriever"' "$BODY"

# Audit RAG Pipeline
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces/$WS_ID/rag-pipeline/audit" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Audit RAG Pipeline" "200" "$CODE" "$BODY"
assert_contains "Audit has pipeline_graph" '"pipeline_graph"' "$BODY"

# Duplicate Workspace → 409
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/workspaces" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system" \
    -H "X-Workspace-Id: $WS_ID" \
    -d "{\"id\":\"$WS_ID\",\"name\":\"Duplicate WS\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Duplicate workspace → 409" "409" "$CODE" "$BODY"

# ==============================================================================
# PHASE 6: MEMBERSHIP & ROLES (Add/Remove Members)
# ==============================================================================
phase "6" "Membership & Roles"

# Assign memberships via psql (fast, avoids DB contention with running backend)
ADMIN_ROLE_ID=$(docker exec $(docker ps -qf name=postgres) psql -U karag -d karag -t -A -c "SELECT id FROM roles WHERE name='admin' LIMIT 1")
MEMBER_ROLE_ID=$(docker exec $(docker ps -qf name=postgres) psql -U karag -d karag -t -A -c "SELECT id FROM roles WHERE name='member' LIMIT 1")
VIEWER_ROLE_ID=$(docker exec $(docker ps -qf name=postgres) psql -U karag -d karag -t -A -c "SELECT id FROM roles WHERE name='viewer' LIMIT 1")

ROLE_SQL="
INSERT INTO memberships (id, user_id, organization_id, project_id, role_id, created_at) VALUES
  (gen_random_uuid(), '$USER_A_ID', '$ORG_ID', NULL,     '$ADMIN_ROLE_ID', NOW()),
  (gen_random_uuid(), '$USER_B_ID', '$ORG_ID', NULL,     '$MEMBER_ROLE_ID', NOW()),
  (gen_random_uuid(), '$USER_C_ID', '$ORG_ID', NULL,     '$VIEWER_ROLE_ID', NOW()),
  (gen_random_uuid(), '$USER_A_ID', '$ORG_ID', '$PRJ_ID', '$ADMIN_ROLE_ID', NOW()),
  (gen_random_uuid(), '$USER_B_ID', '$ORG_ID', '$PRJ_ID', '$MEMBER_ROLE_ID', NOW()),
  (gen_random_uuid(), '$USER_C_ID', '$ORG_ID', '$PRJ_ID', '$VIEWER_ROLE_ID', NOW());
"
ROLE_OUT=$(docker exec $(docker ps -qf name=postgres) psql -U karag -d karag -c "$ROLE_SQL" 2>&1)

TOTAL=$((TOTAL + 1))
if echo "$ROLE_OUT" | grep -qF "INSERT"; then
    echo -e "  ${GREEN}✓${NC} Roles & Memberships assigned ${CYAN}(admin, member, viewer via psql)${NC}"
    echo -e "    admin: $ADMIN_ROLE_ID"
    echo -e "    member: $MEMBER_ROLE_ID"
    echo -e "    viewer: $VIEWER_ROLE_ID"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}✗${NC} Failed to assign roles"
    echo -e "    ${RED}$ROLE_OUT${NC}"
    FAIL=$((FAIL + 1))
    ERRORS+=("Role assignment failed: $ROLE_OUT")
fi

# ==============================================================================
# PHASE 7: RBAC BOUNDARY TESTING
# ==============================================================================
phase "7" "RBAC Boundary Testing"

echo -e "\n  ${BOLD}--- Admin (User A) Tests ---${NC}"

# Admin: GET org → 200
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin → GET org" "200" "$CODE" "$BODY"

# Admin: GET project → 200
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID/projects/$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin → GET project" "200" "$CODE" "$BODY"

# Admin: PUT project → 200
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$API/organizations/$ORG_ID/projects/$PRJ_ID" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -d "{\"description\":\"Admin updated\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin → PUT project" "200" "$CODE" "$BODY"

# Admin: GET workspaces → 200
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin → GET workspaces" "200" "$CODE" "$BODY"

# Admin: GET documents → 200
RESP=$(curl -s -w "\n%{http_code}" "$API/documents?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin → GET documents" "200" "$CODE" "$BODY"

echo -e "\n  ${BOLD}--- Member (User B) Tests ---${NC}"

# Member: GET org → 200
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Member → GET org" "200" "$CODE" "$BODY"

# Member: GET project → 200
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID/projects/$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Member → GET project" "200" "$CODE" "$BODY"

# Member: PUT project → 403 (member lacks project.edit)
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$API/organizations/$ORG_ID/projects/$PRJ_ID" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID" \
    -d "{\"description\":\"Member tried to update\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Member → PUT project (denied)" "403" "$CODE" "$BODY"

# Member: GET documents → 200
RESP=$(curl -s -w "\n%{http_code}" "$API/documents?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Member → GET documents" "200" "$CODE" "$BODY"

echo -e "\n  ${BOLD}--- Viewer (User C) Tests ---${NC}"

# Viewer: GET org → 200
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer → GET org" "200" "$CODE" "$BODY"

# Viewer: GET project → 200
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID/projects/$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer → GET project" "200" "$CODE" "$BODY"

# Viewer: PUT project → 403
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$API/organizations/$ORG_ID/projects/$PRJ_ID" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID" \
    -d "{\"description\":\"Viewer tried to update\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer → PUT project (denied)" "403" "$CODE" "$BODY"

# Viewer: GET documents → 200 (viewers have doc.view)
RESP=$(curl -s -w "\n%{http_code}" "$API/documents?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer → GET documents" "200" "$CODE" "$BODY"

# Viewer: Upload document → 403 (viewer lacks doc.upload)
echo "This is viewer-test-content" > /tmp/viewer_test.txt
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/documents/upload?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID" \
    -F "file=@/tmp/viewer_test.txt")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer → Upload doc (denied)" "403" "$CODE" "$BODY"

# ==============================================================================
# PHASE 8: DOCUMENT UPLOAD & SCOPE ISOLATION
# ==============================================================================
phase "8" "Document Upload & Scope Isolation"

# Create a test file
echo "Hello from E2E test! This is a sample document for testing." > /tmp/e2e_test_doc.txt

# Admin uploads a document (no X-Workspace-Id → storage-only, skip RAG ingestion)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/documents/upload?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -F "file=@/tmp/e2e_test_doc.txt")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin uploads document" "201" "$CODE" "$BODY"
DOC_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Document ID captured" "$DOC_ID"
assert_contains "Doc has correct extension" '"extension":"txt"' "$BODY"

# Member uploads a document (should succeed)
echo "Member's document content" > /tmp/member_doc.txt
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/documents/upload?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID" \
    -F "file=@/tmp/member_doc.txt")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Member uploads document" "201" "$CODE" "$BODY"

# List documents for this project → should show our documents
RESP=$(curl -s -w "\n%{http_code}" "$API/documents?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "List documents for project" "200" "$CODE" "$BODY"
assert_contains "Documents list includes uploaded doc" "e2e_test_doc" "$BODY"

# List documents for a different project → empty (scope isolation)
RESP=$(curl -s -w "\n%{http_code}" "$API/documents?project_id=nonexistent-project" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "List docs for other project" "200" "$CODE" "$BODY"
assert_contains "Other project has no docs" "[]" "$BODY"

# ==============================================================================
# PHASE 9: API KEY MANAGEMENT
# ==============================================================================
phase "9" "API Key Management"

# Create API Key
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/api-keys" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -d "{\"organization_id\":\"$ORG_ID\",\"project_id\":\"$PRJ_ID\",\"name\":\"E2E Test Key\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Create API Key" "201" "$CODE" "$BODY"
API_KEY_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
API_KEY_VALUE=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('key_value',''))" 2>/dev/null)
assert_not_empty "API Key ID captured" "$API_KEY_ID"
assert_not_empty "API Key value captured" "$API_KEY_VALUE"
assert_contains "API Key starts with karag_" "karag_" "$API_KEY_VALUE"

# List API Keys
RESP=$(curl -s -w "\n%{http_code}" "$API/api-keys?organization_id=$ORG_ID&project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "List API Keys" "200" "$CODE" "$BODY"
assert_contains "API key list contains key" "$API_KEY_ID" "$BODY"

# Use API Key to authenticate (also need X-Actor-Id for permission resolution)
RESP=$(curl -s -w "\n%{http_code}" "$API/documents?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -H "X-API-Key: $API_KEY_VALUE")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "API Key auth → GET documents" "200" "$CODE" "$BODY"

# Invalid API Key → 401
RESP=$(curl -s -w "\n%{http_code}" "$API/documents?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-API-Key: invalid_key_12345")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Invalid API Key → 401" "401" "$CODE" "$BODY"

# Delete API Key
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$API/api-keys/$API_KEY_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
assert_status "Delete API Key" "204" "$CODE"

# Verify key is gone
RESP=$(curl -s -w "\n%{http_code}" "$API/api-keys?organization_id=$ORG_ID&project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "API Keys after delete" "200" "$CODE" "$BODY"

# ==============================================================================
# PHASE 10: CROSS-ORG ISOLATION
# ==============================================================================
phase "10" "Cross-Org Isolation"

# Create a second organization
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/organizations" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$ORG_B_ID\",\"name\":\"Org B (Isolated)\",\"description\":\"Cross-org test\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Create Org B" "201" "$CODE" "$BODY"

# Try to access Org A resources using Org B tenant headers → 403
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID" \
    -H "X-Organization-Id: $ORG_B_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Cross-org GET org (denied)" "403" "$CODE" "$BODY"

# Try to get Org A project with Org B headers → 403
RESP=$(curl -s -w "\n%{http_code}" "$API/organizations/$ORG_ID/projects/$PRJ_ID" \
    -H "X-Organization-Id: $ORG_B_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Cross-org GET project (denied)" "403" "$CODE" "$BODY"

# ==============================================================================
# PHASE 11: WORKSPACE DELETE & CLEANUP VERIFICATION
# ==============================================================================
phase "11" "Workspace Delete & Cleanup"

# Delete workspace
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$API/workspaces/$WS_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
assert_status "Delete Workspace" "204" "$CODE"

# Verify workspace is gone
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces/$WS_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Deleted workspace → 404" "404" "$CODE" "$BODY"

# Final health check with counts
RESP=$(curl -s -w "\n%{http_code}" "$BASE/health/dependencies")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Final health check" "200" "$CODE" "$BODY"
echo -e "  ${CYAN}Counts: $(echo "$BODY" | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('counts',{}),indent=2))" 2>/dev/null)${NC}"

# Clean up tmp files
rm -f /tmp/e2e_test_doc.txt /tmp/member_doc.txt /tmp/viewer_test.txt /tmp/assign_roles.py

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  TEST RESULTS${NC}"
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Total:   ${BOLD}$TOTAL${NC}"
echo -e "  Passed:  ${GREEN}${BOLD}$PASS${NC}"
echo -e "  Failed:  ${RED}${BOLD}$FAIL${NC}"
echo ""

if [[ $FAIL -gt 0 ]]; then
    echo -e "${RED}${BOLD}  FAILURES:${NC}"
    for err in "${ERRORS[@]}"; do
        echo -e "    ${RED}• $err${NC}"
    done
    echo ""
    exit 1
else
    echo -e "  ${GREEN}${BOLD}🎉 ALL TESTS PASSED!${NC}"
    echo ""
    exit 0
fi
