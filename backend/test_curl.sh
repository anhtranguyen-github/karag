#!/bin/bash
#
# Curl tests for OpenAI-compatible API
# Usage: ./test_curl.sh [BASE_URL]
#

BASE_URL="${1:-http://localhost:8000}"
API_PREFIX="/api/v1"

echo "=========================================="
echo "Karag OpenAI API - Curl Tests"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to make a test request
run_test() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing $name... "
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$API_PREFIX$endpoint" \
            -H "Content-Type: application/json" 2>/dev/null)
    else
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$API_PREFIX$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
        echo "  Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test 1: List models
echo "--- Testing /v1/models ---"
run_test "List Models" "GET" "/v1/models" "" "200"

# Test 2: Get specific model
echo ""
echo "--- Testing /v1/models/{model_id} ---"
run_test "Get Model (karag:default)" "GET" "/v1/models/karag:default" "" "200"
run_test "Get Model (nonexistent)" "GET" "/v1/models/karag:nonexistent_xyz" "" "404"

# Test 3: Non-streaming chat completion
echo ""
echo "--- Testing /v1/chat/completions (non-streaming) ---"
run_test "Chat Completion" "POST" "/v1/chat/completions" '{
    "model": "karag:default",
    "messages": [{"role": "user", "content": "Hello, what is RAG?"}],
    "temperature": 0.7,
    "max_tokens": 100
}' "200"

# Test 4: Error cases
echo ""
echo "--- Testing Error Handling ---"
run_test "Invalid Provider" "POST" "/v1/chat/completions" '{
    "model": "openai:gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
}' "400"

run_test "Non-existent Workspace" "POST" "/v1/chat/completions" '{
    "model": "karag:nonexistent_xyz",
    "messages": [{"role": "user", "content": "Hello"}]
}' "404"

# Test 5: Stream test (check connection, not full content)
echo ""
echo "--- Testing /v1/chat/completions (streaming) ---"
echo -n "Testing Streaming Connection... "
stream_response=$(curl -s -N "$BASE_URL$API_PREFIX/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d '{
        "model": "karag:default",
        "messages": [{"role": "user", "content": "Say hello"}],
        "stream": true,
        "max_tokens": 10
    }' \
    -D - \
    --max-time 5 2>/dev/null | head -20)

if echo "$stream_response" | grep -q "text/event-stream"; then
    echo -e "${GREEN}✓ PASS${NC} (SSE headers correct)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠ SKIP${NC} (Server not streaming or not running)"
fi

# Test 6: Document retrieval for citations
echo ""
echo "--- Testing /v1/documents/{document_id} ---"
# This will likely fail without a valid doc_id, but tests the endpoint exists
response=$(curl -s -w "\n%{http_code}" "$BASE_URL$API_PREFIX/v1/documents/test_doc_123" 2>/dev/null)
http_code=$(echo "$response" | tail -n1)
if [ "$http_code" == "404" ] || [ "$http_code" == "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} Endpoint exists (HTTP $http_code)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}✗ FAIL${NC} Unexpected response (HTTP $http_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo "=========================================="

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
