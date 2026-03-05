#!/usr/bin/env python3
"""
RAG System Test Script

This script tests the complete RAG pipeline:
1. Authenticate / Create user
2. Create/Get workspace
3. Upload PDF document
4. Test search functionality
5. Test chat/RAG functionality

Usage:
    cd /home/tra01/project/karag/backend
    python3 scripts/test_rag.py

Or from project root:
    python3 -m backend.scripts.test_rag
"""

import os
import sys
import json
from pathlib import Path
from datetime import datetime
import requests


BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000")
API_PREFIX = "/api/v1"

# Test configuration
TEST_USER_EMAIL = f"test_rag_{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_NAME = "RAG Test User"


class RAGTestClient:
    """Test client for RAG API testing."""
    
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        self.workspace_id = None
        self.api_key = None
        
    def login(self, email: str, password: str) -> dict:
        """Login and get access token."""
        response = self.session.post(
            f"{self.base_url}{API_PREFIX}/auth/login",
            data={"username": email, "password": password}
        )
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            return response.json()
        return None
    
    def register(self, email: str, password: str, name: str) -> dict:
        """Register a new user."""
        response = self.session.post(
            f"{self.base_url}{API_PREFIX}/auth/register",
            json={"email": email, "password": password, "name": name}
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def create_workspace(self, name: str) -> dict:
        """Create a new workspace."""
        response = self.session.post(
            f"{self.base_url}{API_PREFIX}/workspaces",
            json={"name": name}
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def list_workspaces(self) -> dict:
        """List all workspaces."""
        response = self.session.get(f"{self.base_url}{API_PREFIX}/workspaces")
        if response.status_code == 200:
            return response.json()
        return None
    
    def upload_document(self, workspace_id: str, file_path: str) -> dict:
        """Upload a document to workspace."""
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'application/pdf')}
            data = {'strategy': 'recursive'}
            response = self.session.post(
                f"{self.base_url}{API_PREFIX}/workspaces/{workspace_id}/upload",
                files=files,
                data=data
            )
        if response.status_code == 200:
            return response.json()
        print(f"Upload failed: {response.status_code} - {response.text[:200]}")
        return None
    
    def get_task_status(self, task_id: str) -> dict:
        """Get task status by ID."""
        response = self.session.get(
            f"{self.base_url}{API_PREFIX}/tasks?limit=100"
        )
        if response.status_code == 200:
            tasks = response.json().get("data", [])
            for task in tasks:
                if task.get("id") == task_id or task.get("_id") == task_id:
                    return {"success": True, "data": task}
            return {"success": True, "data": {"status": "not_found"}}
        return None
    
    def list_documents(self, workspace_id: str) -> dict:
        """List all documents in workspace."""
        response = self.session.get(
            f"{self.base_url}{API_PREFIX}/workspaces/{workspace_id}/documents"
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def search_documents(self, workspace_id: str, query: str) -> dict:
        """Search documents in workspace."""
        response = self.session.get(
            f"{self.base_url}{API_PREFIX}/workspaces/{workspace_id}/search",
            params={"q": query}
        )
        if response.status_code == 200:
            return response.json()
        return None
    
    def chat_completion(self, workspace_id: str, message: str, mode: str = "rag") -> dict:
        """Send a chat message with RAG (handles SSE streaming response)."""
        import uuid
        response = self.session.post(
            f"{self.base_url}{API_PREFIX}/workspaces/{workspace_id}/chat/stream",
            json={
                "message": message,
                "thread_id": str(uuid.uuid4()),
                "execution": {"mode": mode}
            },
            stream=True
        )
        if response.status_code == 200:
            # Parse SSE response
            full_response = ""
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        data = line[6:]  # Remove 'data: ' prefix
                        # Try to extract content from various response formats
                        try:
                            parsed = json.loads(data)
                            # Handle different SSE formats
                            if 'delta' in parsed:
                                full_response += parsed['delta']
                            elif 'content' in parsed:
                                full_response += parsed['content']
                            elif 'message' in parsed and 'content' in parsed['message']:
                                full_response += parsed['message']['content']
                            elif 'choices' in parsed and len(parsed['choices']) > 0:
                                choice = parsed['choices'][0]
                                if 'delta' in choice:
                                    full_response += choice['delta']
                                elif 'message' in choice:
                                    full_response += choice['message'].get('content', '')
                        except json.JSONDecodeError:
                            # Skip non-JSON lines
                            continue
            return {"success": True, "message": full_response}
        print(f"Chat failed: {response.status_code} - {response.text[:200]}")
        return None


def test_rag_system():
    """Run comprehensive RAG system tests."""
    print("=" * 70)
    print("RAG System Test")
    print("=" * 70)
    
    client = RAGTestClient()
    
    # Test 1: Register/Login
    print("\n[1] Testing Authentication...")
    print("-" * 40)
    
    # Try to register
    reg_result = client.register(TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_NAME)
    if reg_result:
        print(f"✓ User registered: {TEST_USER_EMAIL}")
    else:
        print(f"✓ User may already exist, trying login...")
    
    # Login
    login_result = client.login(TEST_USER_EMAIL, TEST_USER_PASSWORD)
    if login_result:
        print(f"✓ Login successful")
    else:
        print("✗ Login failed")
        return
    
    # Test 2: Create/List Workspaces
    print("\n[2] Testing Workspace Management...")
    print("-" * 40)
    
    # Create workspace
    workspace_name = f"Test RAG Workspace {datetime.now().strftime('%Y%m%d%H%M%S')}"
    ws_result = client.create_workspace(workspace_name)
    if ws_result and ws_result.get("success"):
        client.workspace_id = ws_result["data"]["id"]
        print(f"✓ Workspace created: {client.workspace_id}")
    else:
        # Try to list existing
        list_result = client.list_workspaces()
        if list_result and list_result.get("success") and list_result["data"]:
            client.workspace_id = list_result["data"][0]["id"]
            print(f"✓ Using existing workspace: {client.workspace_id}")
        else:
            print("✗ Failed to get workspace")
            return
    
    # Test 3: Upload Document
    print("\n[3] Testing Document Upload...")
    print("-" * 40)
    
    # Find the PDF file
    pdf_path = os.environ.get(
        "TEST_PDF_PATH", 
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "example", "Building an Exam Aim Tracker.pdf")
    )
    if os.path.exists(pdf_path):
        upload_result = client.upload_document(client.workspace_id, pdf_path)
        if upload_result:
            print(f"✓ Document upload initiated: {upload_result.get('message', 'OK')}")
            # Get task ID for status checking
            task_id = upload_result.get("data", {}).get("task_id")
            if task_id:
                print(f"  Task ID: {task_id}")
                # Wait for document processing to complete
                print("  Waiting for document processing...")
                import time
                max_wait = 60  # Wait up to 60 seconds
                for i in range(max_wait):
                    time.sleep(1)
                    task_result = client.get_task_status(task_id)
                    if task_result and task_result.get("success"):
                        task_data = task_result.get("data", {})
                        status = task_data.get("status", "")
                        if status == "completed":
                            print(f"  ✓ Document processing completed")
                            break
                        elif status in ["failed", "error"]:
                            print(f"  ✗ Document processing failed: {task_data.get('error', 'Unknown error')}")
                            break
                        elif i % 10 == 0:
                            print(f"  Status: {status}... (waiting {i}/{max_wait}s)")
                else:
                    print(f"  ⚠ Timeout waiting for document processing")
        else:
            print(f"✗ Document upload failed")
    else:
        print(f"✗ PDF file not found: {pdf_path}")
    
    # Test 4: List Documents
    print("\n[4] Testing Document Listing...")
    print("-" * 40)
    
    docs_result = client.list_documents(client.workspace_id)
    if docs_result and docs_result.get("success"):
        docs = docs_result.get("data", [])
        print(f"✓ Found {len(docs)} documents")
        for doc in docs[:5]:
            print(f"  - {doc.get('filename', 'unknown')} ({doc.get('status', 'unknown')})")
    else:
        print(f"✗ Failed to list documents")
    
    # Test 5: Search (if documents exist)
    print("\n[5] Testing Search...")
    print("-" * 40)
    
    if docs_result and docs_result.get("data"):
        search_queries = [
            "exam",
            "tracker",
            "goal"
        ]
        for query in search_queries:
            search_result = client.search_documents(client.workspace_id, query)
            if search_result and search_result.get("success"):
                results = search_result.get("data", {}).get("results", [])
                print(f"✓ Search '{query}': {len(results)} results")
                for r in results[:3]:
                    print(f"  - {r.get('text', '')[:80]}...")
            else:
                print(f"✗ Search '{query}' failed")
    else:
        print("⚠ Skipping search tests - no documents available")
    
    # Test 6: Chat/RAG
    print("\n[6] Testing Chat/RAG...")
    print("-" * 40)
    
    test_questions = [
        "What is this document about?",
        "How does the exam aim tracker work?",
    ]
    
    for question in test_questions:
        chat_result = client.chat_completion(client.workspace_id, question)
        if chat_result and chat_result.get("success"):
            response = chat_result.get("data", {}).get("choices", [{}])[0].get("message", {})
            content = response.get("content", "")
            print(f"\nQ: {question}")
            print(f"A: {content[:300]}...")
        else:
            print(f"✗ Chat failed for: {question}")
            if chat_result:
                print(f"  Error: {chat_result}")
    
    # Summary
    print("\n" + "=" * 70)
    print("Test Summary")
    print("=" * 70)
    print(f"User: {TEST_USER_EMAIL}")
    print(f"Workspace: {client.workspace_id}")
    print(f"Base URL: {BASE_URL}")
    print(f"API Prefix: {API_PREFIX}")
    print("\n✓ RAG System Tests Complete")


def main():
    """Main entry point."""
    print("Starting RAG System Tests...")
    print(f"Target: {BASE_URL}")
    
    try:
        test_rag_system()
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
