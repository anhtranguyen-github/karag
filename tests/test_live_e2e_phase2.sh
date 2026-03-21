#!/usr/bin/env bash
# ==============================================================================
# Karag Platform — Extended E2E Test Suite (Phase 2)
# ==============================================================================
# Tests: Chat sessions, message history, workspace scope isolation,
#        context documents, evaluation datasets, cross-workspace isolation,
#        RBAC for chat/docs, workspace RAG config updates
# Usage: bash tests/test_live_e2e_phase2.sh
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
        [[ -n "$body" ]] && echo -e "    ${RED}Response: ${body:0:300}${NC}"
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
        echo -e "    ${RED}Response: ${haystack:0:300}${NC}"
        FAIL=$((FAIL + 1))
        ERRORS+=("$label: missing '$needle'")
    fi
}

assert_not_contains() {
    local label="$1"
    local needle="$2"
    local haystack="$3"
    TOTAL=$((TOTAL + 1))
    if echo "$haystack" | grep -qF "$needle"; then
        echo -e "  ${RED}✗${NC} $label — response SHOULD NOT contain '${YELLOW}$needle${NC}'"
        echo -e "    ${RED}Response: ${haystack:0:300}${NC}"
        FAIL=$((FAIL + 1))
        ERRORS+=("$label: unexpectedly found '$needle'")
    else
        echo -e "  ${GREEN}✓${NC} $label ${CYAN}(correctly absent '$needle')${NC}"
        PASS=$((PASS + 1))
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

assert_json_length() {
    local label="$1"
    local expected="$2"
    local json_body="$3"
    TOTAL=$((TOTAL + 1))
    local actual
    actual=$(echo "$json_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null)
    if [[ "$actual" == "$expected" ]]; then
        echo -e "  ${GREEN}✓${NC} $label ${CYAN}(count=$actual)${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} $label — expected length ${YELLOW}$expected${NC}, got ${RED}$actual${NC}"
        FAIL=$((FAIL + 1))
        ERRORS+=("$label: expected_length=$expected actual=$actual")
    fi
}

phase() {
    echo ""
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}  PHASE $1: $2${NC}"
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
}

# ── Setup: IDs ────────────────────────────────────────────────────────────────
TS=$(date +%s)
ORG_ID="chat-test-org-${TS}"
PRJ_ID=""
WS_A_ID=""
WS_B_ID=""

USER_A_ID=""
USER_B_ID=""
USER_C_ID=""
USER_A_EMAIL="chatadmin_${TS}@test.com"
USER_B_EMAIL="chatmember_${TS}@test.com"
USER_C_EMAIL="chatviewer_${TS}@test.com"

SESSION_A1_ID=""
SESSION_A2_ID=""
SESSION_B1_ID=""

EVAL_DS_ID=""

# ==============================================================================
# PHASE 0: SETUP — Create Org, Project, Users, Memberships
# ==============================================================================
phase "0" "Setup — Scaffold Org/Project/Users/Workspaces"

# Create Org
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/organizations" \
    -H "Content-Type: application/json" \
    -d "{\"id\":\"$ORG_ID\",\"name\":\"Chat Test Org\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Create Organization" "201" "$CODE" "$BODY"

# Register 3 users
for ROLE_INFO in "A:$USER_A_EMAIL:Admin1234!:Chat Admin" "B:$USER_B_EMAIL:Member1234!:Chat Member" "C:$USER_C_EMAIL:Viewer1234!:Chat Viewer"; do
    IFS=':' read -r TAG EMAIL PW NAME <<< "$ROLE_INFO"
    RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"full_name\":\"$NAME\"}")
    BODY=$(echo "$RESP" | head -n -1)
    CODE=$(echo "$RESP" | tail -1)
    assert_status "Register User $TAG" "201" "$CODE" "$BODY"
    U_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
    assert_not_empty "User $TAG ID captured" "$U_ID"
    eval "USER_${TAG}_ID=$U_ID"
done

# Create Project
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/organizations/$ORG_ID/projects" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Chat Test Project\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Create Project" "201" "$CODE" "$BODY"
PRJ_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Project ID" "$PRJ_ID"

# Create Workspace A
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/workspaces" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system" \
    -d "{\"name\":\"Workspace Alpha\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Create Workspace A" "201" "$CODE" "$BODY"
WS_A_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Workspace A ID" "$WS_A_ID"

# Create Workspace B (for cross-workspace isolation tests)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/workspaces" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: system" \
    -d "{\"name\":\"Workspace Beta\"}")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -1)
assert_status "Create Workspace B" "201" "$CODE" "$BODY"
WS_B_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Workspace B ID" "$WS_B_ID"

# Assign memberships via psql (fast, no DB contention with backend)
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
    echo -e "  ${GREEN}✓${NC} Memberships assigned ${CYAN}(admin/member/viewer via psql)${NC}"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}✗${NC} Failed to assign memberships: $ROLE_OUT"
    FAIL=$((FAIL + 1))
    ERRORS+=("Membership assignment failed: $ROLE_OUT")
fi

echo -e "\n  ${CYAN}Setup complete:${NC}"
echo -e "    Org:         ${BOLD}$ORG_ID${NC}"
echo -e "    Project:     ${BOLD}$PRJ_ID${NC}"
echo -e "    Workspace A: ${BOLD}$WS_A_ID${NC}"
echo -e "    Workspace B: ${BOLD}$WS_B_ID${NC}"
echo -e "    Admin:       ${BOLD}$USER_A_ID${NC}"
echo -e "    Member:      ${BOLD}$USER_B_ID${NC}"
echo -e "    Viewer:      ${BOLD}$USER_C_ID${NC}"

# ==============================================================================
# PHASE 1: CHAT SESSIONS — CRUD & Workspace Scoping
# ==============================================================================
phase "1" "Chat Sessions — Create, List, Workspace Scope"

# Admin creates a chat session in Workspace A
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/chat/sessions" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -d "{\"workspace_id\":\"$WS_A_ID\",\"project_id\":\"$PRJ_ID\",\"organization_id\":\"$ORG_ID\",\"title\":\"Admin Session 1\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin creates chat session in WS-A" "201" "$CODE" "$BODY"
SESSION_A1_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Session A1 ID" "$SESSION_A1_ID"
assert_contains "Session scoped to workspace A" "$WS_A_ID" "$BODY"
assert_contains "Session owned by admin user" "$USER_A_ID" "$BODY"

# Admin creates a second session in Workspace A
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/chat/sessions" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -d "{\"workspace_id\":\"$WS_A_ID\",\"project_id\":\"$PRJ_ID\",\"organization_id\":\"$ORG_ID\",\"title\":\"Admin Session 2\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin creates 2nd session in WS-A" "201" "$CODE" "$BODY"
SESSION_A2_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Session A2 ID" "$SESSION_A2_ID"

# Member creates a session in Workspace B
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/chat/sessions" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID" \
    -d "{\"workspace_id\":\"$WS_B_ID\",\"project_id\":\"$PRJ_ID\",\"organization_id\":\"$ORG_ID\",\"title\":\"Member Session in WS-B\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Member creates session in WS-B" "201" "$CODE" "$BODY"
SESSION_B1_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Session B1 ID" "$SESSION_B1_ID"
assert_contains "Session B scoped to workspace B" "$WS_B_ID" "$BODY"

# Viewer tries to create a session → should be 403 (viewer lacks chat.session)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/chat/sessions" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID" \
    -d "{\"workspace_id\":\"$WS_A_ID\",\"project_id\":\"$PRJ_ID\",\"organization_id\":\"$ORG_ID\",\"title\":\"Viewer Session\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer cannot create session (403)" "403" "$CODE" "$BODY"

# ==============================================================================
# PHASE 2: WORKSPACE SCOPE ISOLATION FOR SESSIONS
# ==============================================================================
phase "2" "Workspace Scope Isolation — Session Listing"

# List sessions for Workspace A → should have 2 sessions
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions?workspace_id=$WS_A_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "List sessions for WS-A" "200" "$CODE" "$BODY"
assert_contains "WS-A has session A1" "$SESSION_A1_ID" "$BODY"
assert_contains "WS-A has session A2" "$SESSION_A2_ID" "$BODY"
assert_not_contains "WS-A does NOT have WS-B session" "$SESSION_B1_ID" "$BODY"

# List sessions for Workspace B → should have 1 session
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions?workspace_id=$WS_B_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "List sessions for WS-B" "200" "$CODE" "$BODY"
assert_contains "WS-B has session B1" "$SESSION_B1_ID" "$BODY"
assert_not_contains "WS-B does NOT have WS-A sessions" "$SESSION_A1_ID" "$BODY"

# Viewer lists sessions → should have workspace.view permission
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions?workspace_id=$WS_A_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer can list sessions (read-only)" "200" "$CODE" "$BODY"

# ==============================================================================
# PHASE 3: CHAT MESSAGING — Send & View History
# ==============================================================================
phase "3" "Chat Messaging — Ask & View History"

# Admin sends a message in session A1
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/chat/sessions/$SESSION_A1_ID/ask?query=What+is+the+meaning+of+life" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin asks question in session A1" "200" "$CODE" "$BODY"
assert_contains "Response has assistant role" '"role":"assistant"' "$BODY"
assert_contains "Response echoes query" "meaning of life" "$BODY"

# Admin sends another message
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/chat/sessions/$SESSION_A1_ID/ask?query=Tell+me+about+RAG+pipelines" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin asks 2nd question" "200" "$CODE" "$BODY"
assert_contains "2nd response echoes query" "RAG pipelines" "$BODY"

# Member sends a message in session B1
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/chat/sessions/$SESSION_B1_ID/ask?query=Hello+from+workspace+B" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Member asks question in WS-B session" "200" "$CODE" "$BODY"

# View message history for session A1 → should have 4 messages (2 user + 2 assistant)
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions/$SESSION_A1_ID/messages" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "View message history for session A1" "200" "$CODE" "$BODY"
assert_json_length "Session A1 has 4 messages" "4" "$BODY"
assert_contains "History has user message" '"role":"user"' "$BODY"
assert_contains "History has assistant message" '"role":"assistant"' "$BODY"
assert_contains "History has first question" "meaning of life" "$BODY"
assert_contains "History has second question" "RAG pipelines" "$BODY"

# View message history for session B1 → should have 2 messages (1 user + 1 assistant)
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions/$SESSION_B1_ID/messages" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "View message history for session B1" "200" "$CODE" "$BODY"
assert_json_length "Session B1 has 2 messages" "2" "$BODY"

# View message history for empty session A2 → should have 0 messages
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions/$SESSION_A2_ID/messages" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "View empty session A2 messages" "200" "$CODE" "$BODY"
assert_json_length "Session A2 has 0 messages" "0" "$BODY"

# ==============================================================================
# PHASE 4: CHAT RBAC — Viewer can ask but NOT create sessions
# ==============================================================================
phase "4" "Chat RBAC — Viewer Ask Permission"

# Viewer has chat.ask permission → can ask questions in existing sessions
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/chat/sessions/$SESSION_A1_ID/ask?query=Viewer+asking+a+question" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer can ask in existing session" "200" "$CODE" "$BODY"

# Verify viewer's message is in history
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions/$SESSION_A1_ID/messages" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "History updated after viewer message" "200" "$CODE" "$BODY"
assert_json_length "Session A1 now has 6 messages" "6" "$BODY"
assert_contains "History includes viewer question" "Viewer asking a question" "$BODY"

# ==============================================================================
# PHASE 5: CONTEXT DOCUMENTS — Upload & Workspace Scoping
# ==============================================================================
phase "5" "Context Documents — Upload & Workspace Scope"

# Upload doc to project (storage-only)
echo "Context document Alpha - knowledge base for Workspace A testing" > /tmp/ctx_doc_alpha.txt
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/documents/upload?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -F "file=@/tmp/ctx_doc_alpha.txt")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Upload context doc Alpha" "201" "$CODE" "$BODY"
DOC_A_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Doc Alpha ID" "$DOC_A_ID"

# Upload another doc
echo "Context document Beta - different content for testing scope isolation" > /tmp/ctx_doc_beta.txt
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/documents/upload?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -F "file=@/tmp/ctx_doc_beta.txt")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Upload context doc Beta" "201" "$CODE" "$BODY"

# Member uploads doc (member has doc.upload permission)
echo "Member-uploaded context document for workspace" > /tmp/ctx_doc_member.txt
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/documents/upload?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID" \
    -F "file=@/tmp/ctx_doc_member.txt")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Member uploads context doc" "201" "$CODE" "$BODY"

# Viewer tries to upload → 403
echo "Viewer should not be able to upload" > /tmp/ctx_doc_viewer.txt
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/documents/upload?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID" \
    -F "file=@/tmp/ctx_doc_viewer.txt")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer cannot upload docs (403)" "403" "$CODE" "$BODY"

# List all docs for this project
RESP=$(curl -s -w "\n%{http_code}" "$API/documents?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "List all project docs" "200" "$CODE" "$BODY"
assert_contains "Docs include Alpha" "ctx_doc_alpha" "$BODY"
assert_contains "Docs include Beta" "ctx_doc_beta" "$BODY"
assert_contains "Docs include member doc" "ctx_doc_member" "$BODY"

# Viewer can VIEW docs (doc.view permission)
RESP=$(curl -s -w "\n%{http_code}" "$API/documents?project_id=$PRJ_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer can list docs (read-only)" "200" "$CODE" "$BODY"

# ==============================================================================
# PHASE 6: WORKSPACE RAG CONFIG — Update & Verify
# ==============================================================================
phase "6" "Workspace RAG Config — Update & Pipeline Audit"

# Get current RAG config for WS-A
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces/$WS_A_ID/rag-config" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "GET WS-A RAG config" "200" "$CODE" "$BODY"
assert_contains "Has embedding config" '"embedding"' "$BODY"
assert_contains "Has LLM config" '"llm"' "$BODY"
assert_contains "Has RAG config" '"rag"' "$BODY"

# Update RAG config (change retriever top_k)
RESP=$(curl -s -w "\n%{http_code}" -X PUT "$API/workspaces/$WS_A_ID/rag-config" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -d "{\"retriever\":{\"component\":\"hybrid\",\"top_k\":10,\"score_threshold\":0.5}}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Update RAG config (retriever)" "200" "$CODE" "$BODY"
assert_contains "Updated top_k to 10" '"top_k":10' "$BODY"

# Audit WS-A pipeline
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces/$WS_A_ID/rag-pipeline/audit" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Audit WS-A pipeline" "200" "$CODE" "$BODY"
assert_contains "Pipeline is valid" '"valid":true' "$BODY"
assert_contains "Has pipeline graph" '"pipeline_graph"' "$BODY"
assert_contains "Has compatibility checks" '"compatibility"' "$BODY"

# Validate proposed config change (without applying)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/workspaces/$WS_A_ID/rag-pipeline/validate" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -d "{\"retriever\":{\"component\":\"hybrid\",\"top_k\":5,\"score_threshold\":0.3}}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Validate proposed config" "200" "$CODE" "$BODY"
assert_contains "Validation returns pipeline_graph" '"pipeline_graph"' "$BODY"

# Config for WS-B should be independent
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces/$WS_B_ID/rag-config" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "GET WS-B RAG config (independent)" "200" "$CODE" "$BODY"
# WS-B should still have default top_k (not 10)
assert_not_contains "WS-B NOT affected by WS-A update" '"top_k":10' "$BODY"

# ==============================================================================
# PHASE 7: EVALUATION DATASETS — Workspace-scoped
# ==============================================================================
phase "7" "Evaluation Datasets — Create & Scope"

# Create evaluation dataset in WS-A
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/evaluation-datasets" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -d "{\"workspace_id\":\"$WS_A_ID\",\"name\":\"Test Eval Dataset\",\"description\":\"For E2E testing\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Create eval dataset in WS-A" "201" "$CODE" "$BODY"
EVAL_DS_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
assert_not_empty "Eval dataset ID" "$EVAL_DS_ID"
assert_contains "Eval dataset scoped to WS-A" "$WS_A_ID" "$BODY"

# Add questions to the dataset
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/evaluation-datasets/$EVAL_DS_ID/questions" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -d "{\"question\":\"What is RAG?\",\"expected_answer\":\"Retrieval Augmented Generation\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Add question to eval dataset" "201" "$CODE" "$BODY"
assert_contains "Question stored correctly" "What is RAG" "$BODY"

# Add a second question
RESP=$(curl -s -w "\n%{http_code}" -X POST "$API/evaluation-datasets/$EVAL_DS_ID/questions" \
    -H "Content-Type: application/json" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID" \
    -d "{\"question\":\"What is embeddings?\",\"expected_answer\":\"Vector representations of text\"}")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Add 2nd question to eval dataset" "201" "$CODE" "$BODY"

# List questions
RESP=$(curl -s -w "\n%{http_code}" "$API/evaluation-datasets/$EVAL_DS_ID/questions" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "List eval questions" "200" "$CODE" "$BODY"
assert_json_length "Dataset has 2 questions" "2" "$BODY"

# List eval datasets for WS-A → should show ours
RESP=$(curl -s -w "\n%{http_code}" "$API/evaluation-datasets?workspace_id=$WS_A_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "List eval datasets for WS-A" "200" "$CODE" "$BODY"
assert_contains "WS-A has our dataset" "$EVAL_DS_ID" "$BODY"

# List eval datasets for WS-B → should be empty (scope isolation)
RESP=$(curl -s -w "\n%{http_code}" "$API/evaluation-datasets?workspace_id=$WS_B_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "List eval datasets for WS-B (empty)" "200" "$CODE" "$BODY"
assert_not_contains "WS-B does NOT have WS-A dataset" "$EVAL_DS_ID" "$BODY"

# ==============================================================================
# PHASE 8: CROSS-WORKSPACE CHAT ISOLATION
# ==============================================================================
phase "8" "Cross-Workspace Chat Isolation"

# Sessions from WS-A do NOT appear in WS-B listing
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions?workspace_id=$WS_B_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "WS-B session list" "200" "$CODE" "$BODY"
assert_not_contains "WS-B list has no WS-A session A1" "$SESSION_A1_ID" "$BODY"
assert_not_contains "WS-B list has no WS-A session A2" "$SESSION_A2_ID" "$BODY"
assert_contains "WS-B list has its own session B1" "$SESSION_B1_ID" "$BODY"

# Messages in session A1 do NOT leak into session B1
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions/$SESSION_B1_ID/messages" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "WS-B session messages" "200" "$CODE" "$BODY"
assert_not_contains "WS-B msgs don't have WS-A content" "meaning of life" "$BODY"
assert_contains "WS-B msgs have their own content" "workspace B" "$BODY"

# ==============================================================================
# PHASE 9: CONTINUE CHAT — Multiple exchanges in a session
# ==============================================================================
phase "9" "Continue Chat — Multi-turn Conversation"

# Send multiple messages in session A2 (simulating continued conversation)
for i in 1 2 3; do
    RESP=$(curl -s -w "\n%{http_code}" -X POST \
        "$API/chat/sessions/$SESSION_A2_ID/ask?query=Turn+${i}+of+conversation" \
        -H "X-Organization-Id: $ORG_ID" \
        -H "X-Project-Id: $PRJ_ID" \
        -H "X-Actor-Id: $USER_A_ID")
    CODE=$(echo "$RESP" | tail -1)
    BODY=$(echo "$RESP" | head -n -1)
    assert_status "Multi-turn $i in session A2" "200" "$CODE" "$BODY"
done

# Verify the full conversation is stored
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions/$SESSION_A2_ID/messages" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "View multi-turn history" "200" "$CODE" "$BODY"
assert_json_length "Session A2 has 6 messages (3 user + 3 assistant)" "6" "$BODY"
assert_contains "Has turn 1" "Turn 1" "$BODY"
assert_contains "Has turn 2" "Turn 2" "$BODY"
assert_contains "Has turn 3" "Turn 3" "$BODY"

# ==============================================================================
# PHASE 10: SHARED VISIBILITY — Chat accessible across roles in same workspace
# ==============================================================================
phase "10" "Shared Chat Visibility"

# Member can view admin's session messages in WS-A (shared workspace)
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions/$SESSION_A1_ID/messages" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_B_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Member views admin's WS-A session msgs" "200" "$CODE" "$BODY"
assert_contains "Member can see admin's question" "meaning of life" "$BODY"

# Viewer can view session messages (read-only access via workspace.view)
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions/$SESSION_A1_ID/messages" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_C_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Viewer views admin's session msgs" "200" "$CODE" "$BODY"
assert_contains "Viewer can see shared history" "meaning of life" "$BODY"

# Admin can view member's session messages in WS-B
RESP=$(curl -s -w "\n%{http_code}" "$API/chat/sessions/$SESSION_B1_ID/messages" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Admin views member's WS-B session msgs" "200" "$CODE" "$BODY"
assert_contains "Admin can see member's question" "workspace B" "$BODY"

# ==============================================================================
# PHASE 11: OBSERVABILITY — Event tracking
# ==============================================================================
phase "11" "Observability & Event Tracking"

RESP=$(curl -s -w "\n%{http_code}" "$API/observability/summary")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "GET observability summary" "200" "$CODE" "$BODY"
assert_contains "Has event_bus info" '"event_bus"' "$BODY"

# ==============================================================================
# PHASE 12: CLEANUP — Delete & Verify
# ==============================================================================
phase "12" "Cleanup — Delete Eval Dataset & Workspaces"

# Delete evaluation dataset
RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$API/evaluation-datasets/$EVAL_DS_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
assert_status "Delete eval dataset" "204" "$CODE"

# Verify eval dataset is gone
RESP=$(curl -s -w "\n%{http_code}" "$API/evaluation-datasets?workspace_id=$WS_A_ID" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Eval datasets empty after delete" "200" "$CODE" "$BODY"
assert_not_contains "Deleted dataset not in list" "$EVAL_DS_ID" "$BODY"

# Delete both workspaces
for WS_ID_DEL in "$WS_A_ID" "$WS_B_ID"; do
    RESP=$(curl -s -w "\n%{http_code}" -X DELETE "$API/workspaces/$WS_ID_DEL" \
        -H "X-Organization-Id: $ORG_ID" \
        -H "X-Project-Id: $PRJ_ID" \
        -H "X-Actor-Id: $USER_A_ID")
    CODE=$(echo "$RESP" | tail -1)
    assert_status "Delete workspace $WS_ID_DEL" "204" "$CODE"
done

# Verify workspaces are gone  
RESP=$(curl -s -w "\n%{http_code}" "$API/workspaces" \
    -H "X-Organization-Id: $ORG_ID" \
    -H "X-Project-Id: $PRJ_ID" \
    -H "X-Actor-Id: $USER_A_ID")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | head -n -1)
assert_status "Workspaces empty after cleanup" "200" "$CODE" "$BODY"
assert_not_contains "WS-A gone" "$WS_A_ID" "$BODY"
assert_not_contains "WS-B gone" "$WS_B_ID" "$BODY"

# Cleanup temp files
rm -f /tmp/ctx_doc_alpha.txt /tmp/ctx_doc_beta.txt /tmp/ctx_doc_member.txt \
      /tmp/ctx_doc_viewer.txt

# ==============================================================================
# SUMMARY
# ==============================================================================
echo ""
echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${CYAN}  TEST RESULTS (Phase 2)${NC}"
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
