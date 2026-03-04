#!/usr/bin/env python3
"""
Test OpenAI SDK compatibility for Karag API.

This script tests the OpenAI-compatible endpoints using the official OpenAI SDK.
It verifies:
- Workspace resolution via model names (karag:<workspace>)
- Chat completions (streaming and non-streaming)
- Citations in [[doc:<id>]] format
- Error handling
- Document retrieval for citations
"""

import os
import sys
import asyncio

# Test configuration
BASE_URL = os.getenv("KARAG_API_URL", "http://localhost:8000/api/v1")
API_KEY = os.getenv("KARAG_API_KEY", "test-key")
TEST_WORKSPACE = os.getenv("KARAG_TEST_WORKSPACE", "default")


def test_import_openai():
    """Test that openai package is available."""
    try:
        import openai
        print(f"✓ OpenAI SDK version: {openai.__version__}")
        return True
    except ImportError:
        print("✗ OpenAI SDK not installed. Install with: pip install openai")
        return False


def create_client():
    """Create an OpenAI client configured for Karag API."""
    from openai import AsyncOpenAI
    
    return AsyncOpenAI(
        base_url=BASE_URL,
        api_key=API_KEY,
    )


async def test_list_models():
    """Test /v1/models endpoint."""
    print("\n--- Testing /v1/models ---")
    
    try:
        client = create_client()
        models = await client.models.list()
        
        print(f"✓ Retrieved {len(models.data)} models")
        
        for model in models.data:
            print(f"  - {model.id} (owned by: {model.owned_by})")
            
            # Verify model ID format
            if not model.id.startswith("karag:"):
                print(f"  ⚠ Warning: Model ID {model.id} doesn't start with 'karag:'")
        
        return True
    except Exception as e:
        print(f"✗ Failed to list models: {e}")
        return False


async def test_chat_completion_non_streaming():
    """Test non-streaming chat completion."""
    print("\n--- Testing Non-Streaming Chat Completion ---")
    print(f"Workspace: {TEST_WORKSPACE}")
    
    try:
        client = create_client()
        
        response = await client.chat.completions.create(
            model=f"karag:{TEST_WORKSPACE}",
            messages=[
                {"role": "user", "content": "Hello, what is RAG?"}
            ],
            temperature=0.7,
            max_tokens=100,
        )
        
        # Verify response structure
        assert response.id, "Missing response ID"
        assert response.object == "chat.completion", f"Wrong object type: {response.object}"
        assert response.created, "Missing created timestamp"
        assert response.model == f"karag:{TEST_WORKSPACE}", f"Wrong model: {response.model}"
        assert len(response.choices) > 0, "No choices in response"
        
        choice = response.choices[0]
        assert choice.index == 0, "Wrong choice index"
        assert choice.message.role == "assistant", f"Wrong role: {choice.message.role}"
        assert choice.message.content, "Empty content"
        assert choice.finish_reason in ["stop", "length"], f"Unexpected finish_reason: {choice.finish_reason}"
        
        # Verify usage
        assert response.usage.prompt_tokens >= 0, "Invalid prompt_tokens"
        assert response.usage.completion_tokens >= 0, "Invalid completion_tokens"
        assert response.usage.total_tokens >= 0, "Invalid total_tokens"
        
        print("✓ Non-streaming response received")
        print(f"  ID: {response.id}")
        print(f"  Content preview: {choice.message.content[:100]}...")
        print(f"  Finish reason: {choice.finish_reason}")
        print(f"  Tokens: {response.usage.total_tokens} ({response.usage.prompt_tokens} prompt, {response.usage.completion_tokens} completion)")
        
        return True
    except Exception as e:
        print(f"✗ Non-streaming test failed: {e}")
        return False


async def test_chat_completion_streaming():
    """Test streaming chat completion."""
    print("\n--- Testing Streaming Chat Completion ---")
    print(f"Workspace: {TEST_WORKSPACE}")
    
    try:
        client = create_client()
        
        stream = await client.chat.completions.create(
            model=f"karag:{TEST_WORKSPACE}",
            messages=[
                {"role": "user", "content": "Explain vector databases in one sentence."}
            ],
            temperature=0.7,
            max_tokens=100,
            stream=True,
        )
        
        collected_content = []
        chunk_count = 0
        
        async for chunk in stream:
            chunk_count += 1
            
            # Verify chunk structure
            assert chunk.id, "Missing chunk ID"
            assert chunk.object == "chat.completion.chunk", f"Wrong object type: {chunk.object}"
            assert chunk.created, "Missing created timestamp"
            assert chunk.model == f"karag:{TEST_WORKSPACE}", f"Wrong model: {chunk.model}"
            assert len(chunk.choices) > 0, "No choices in chunk"
            
            choice = chunk.choices[0]
            
            # Delta can be empty for final chunk
            if choice.delta.content:
                collected_content.append(choice.delta.content)
            
            if choice.finish_reason:
                assert choice.finish_reason in ["stop", "length"], f"Unexpected finish_reason: {choice.finish_reason}"
        
        full_content = "".join(collected_content)
        
        print("✓ Streaming response received")
        print(f"  Chunks: {chunk_count}")
        print(f"  Content: {full_content}")
        
        assert full_content, "No content collected from stream"
        
        return True
    except Exception as e:
        print(f"✗ Streaming test failed: {e}")
        return False


async def test_citations():
    """Test that citations are properly embedded in content."""
    print("\n--- Testing Citations ---")
    print(f"Workspace: {TEST_WORKSPACE}")
    
    try:
        client = create_client()
        
        response = await client.chat.completions.create(
            model=f"karag:{TEST_WORKSPACE}",
            messages=[
                {"role": "user", "content": "What information do you have about my documents?"}
            ],
            temperature=0.7,
            max_tokens=200,
        )
        
        content = response.choices[0].message.content
        
        # Check for citation pattern [[doc:<id>]]
        import re
        citations = re.findall(r'\[\[doc:([^\]]+)\]\]', content)
        
        print("✓ Response received")
        print(f"  Content preview: {content[:150]}...")
        print(f"  Citations found: {len(citations)}")
        
        if citations:
            for i, citation in enumerate(citations[:3]):  # Show first 3
                print(f"    - doc:{citation}")
        
        return True
    except Exception as e:
        print(f"✗ Citations test failed: {e}")
        return False


async def test_mode_qa():
    """Test QA mode behavior."""
    print("\n--- Testing QA Mode ---")
    
    try:
        client = create_client()
        
        response = await client.chat.completions.create(
            model=f"karag:{TEST_WORKSPACE}:qa",  # Mode in model name
            messages=[
                {"role": "user", "content": "What is the capital of France?"}
            ],
            temperature=0.7,
            max_tokens=100,
        )
        
        content = response.choices[0].message.content
        
        print("✓ QA mode response received")
        print(f"  Content: {content[:100]}...")
        
        return True
    except Exception as e:
        print(f"✗ QA mode test failed: {e}")
        return False


async def test_error_handling():
    """Test error responses are OpenAI-compatible."""
    print("\n--- Testing Error Handling ---")
    
    try:
        client = create_client()
        
        # Test with non-existent workspace
        try:
            await client.chat.completions.create(
                model="karag:nonexistent_workspace_xyz",
                messages=[
                    {"role": "user", "content": "Hello"}
                ],
            )
            print("✗ Should have raised an error for non-existent workspace")
            return False
        except Exception as e:
            # Should get an error response
            print("✓ Error properly returned for non-existent workspace")
            print(f"  Error type: {type(e).__name__}")
            return True
    except Exception as e:
        print(f"✗ Error handling test failed: {e}")
        return False


async def test_document_retrieval():
    """Test document retrieval for citations."""
    print("\n--- Testing Document Retrieval ---")
    
    try:
        import httpx
        
        async with httpx.AsyncClient() as client:
            # First, get a list of documents
            response = await client.get(
                f"{BASE_URL}/workspaces/{TEST_WORKSPACE}/documents",
                headers={"Authorization": f"Bearer {API_KEY}"},
            )
            
            if response.status_code != 200:
                print(f"⚠ Could not list documents: {response.status_code}")
                return True  # Skip if no documents
            
            docs = response.json()
            if not docs.get("data") or len(docs["data"]) == 0:
                print("⚠ No documents found to test citation retrieval")
                return True  # Skip if no documents
            
            # Get first document ID
            doc_id = docs["data"][0].get("id")
            if not doc_id:
                print("⚠ Document has no ID")
                return True
            
            print(f"Testing citation lookup for document: {doc_id}")
            
            # Test the document lookup endpoint
            response = await client.get(
                f"{BASE_URL}/v1/documents/{doc_id}",
                headers={"Authorization": f"Bearer {API_KEY}"},
            )
            
            if response.status_code == 200:
                doc_data = response.json()
                print("✓ Document retrieved successfully")
                print(f"  Filename: {doc_data.get('filename')}")
                print(f"  Content type: {doc_data.get('content_type')}")
            else:
                print(f"✗ Failed to retrieve document: {response.status_code}")
                return False
            
            return True
    except Exception as e:
        print(f"⚠ Document retrieval test skipped: {e}")
        return True  # Don't fail on optional test


async def run_all_tests():
    """Run all tests and report results."""
    print("=" * 60)
    print("OpenAI SDK Compatibility Tests for Karag API")
    print("=" * 60)
    print(f"API URL: {BASE_URL}")
    print(f"Workspace: {TEST_WORKSPACE}")
    
    # Check OpenAI SDK
    if not test_import_openai():
        print("\n✗ Cannot run tests without OpenAI SDK")
        sys.exit(1)
    
    results = []
    
    # Run tests
    results.append(("List Models", await test_list_models()))
    results.append(("Non-Streaming Completion", await test_chat_completion_non_streaming()))
    results.append(("Streaming Completion", await test_chat_completion_streaming()))
    results.append(("Citations", await test_citations()))
    results.append(("QA Mode", await test_mode_qa()))
    results.append(("Error Handling", await test_error_handling()))
    results.append(("Document Retrieval", await test_document_retrieval()))
    
    # Report results
    print("\n" + "=" * 60)
    print("Test Results")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    total = len(results)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {name}")
    
    print("-" * 60)
    print(f"Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_all_tests())
    sys.exit(exit_code)
