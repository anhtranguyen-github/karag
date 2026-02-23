import requests
import time
import json
import itertools

BASE_URL = "http://localhost:8000"

# Define permutations
embedding_providers = ["openai", "huggingface", "ollama"]
chunking_strategies = ["recursive", "sentence", "token", "semantic"]

def create_workspace(name, embedding_provider, chunking_strategy):
    # Mapping to exact model names from schemas/embedding.py
    models = {
        "openai": "text-embedding-3-small",
        "huggingface": "sentence-transformers/all-MiniLM-L6-v2",
        "ollama": "mxbai-embed-large"
    }
    
    payload = {
        "name": name,
        "description": f"Test workspace with {embedding_provider} and {chunking_strategy}",
        "embedding_provider": embedding_provider,
        "embedding_model": models.get(embedding_provider, "text-embedding-3-small"),
        "chunking_strategy": chunking_strategy,
        "rag_engine": "basic",
        "llm_provider": "openai",
        "llm_model": "gpt-4o",
        "search_limit": 5,
        "recall_k": 20,
        "hybrid_alpha": 0.5
    }
        
    response = requests.post(f"{BASE_URL}/workspaces", json=payload)
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            return data["data"]["id"]
    print(f"Failed to create workspace: {response.text}")
    return None

def get_vault_documents():
    response = requests.get(f"{BASE_URL}/vault")
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            return data["data"]
    return []

def add_doc_to_workspace(doc_id, workspace_id):
    payload = {
        "document_id": doc_id,
        "target_workspace_id": workspace_id,
        "action": "link", # Using link to create a fresh copy in the workspace
        "force_reindex": True
    }
    response = requests.post(f"{BASE_URL}/documents/update-workspaces", json=payload)
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            return data["data"]["task_id"]
    print(f"Failed to add doc to workspace: {response.text}")
    return None

def wait_for_task(task_id, timeout=300):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(f"{BASE_URL}/tasks/{task_id}")
            if response.status_code == 200:
                data = response.json()
                status = data["data"]["status"]
                if status == "completed":
                    return True
                if status == "failed":
                    print(f"Task {task_id} failed: {data['data'].get('message') or data['data'].get('error')}")
                    return False
        except Exception as e:
            print(f"Error polling task: {e}")
        time.sleep(5)
    print(f"Task {task_id} timed out")
    return False

def test_retrieval(workspace_id, query="What are agentic design patterns?"):
    params = {
        "q": query,
        "workspace_id": workspace_id
    }
    # Using the new vector search endpoint
    try:
        response = requests.get(f"{BASE_URL}/search/vector", params=params)
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                results = data.get("data", [])
                return len(results) > 0, results
    except Exception as e:
        print(f"Retrieval error: {e}")
    return False, []

def test_chat(workspace_id, mode, message="What are agentic design patterns?"):
    """Test chat response using the streaming endpoint."""
    payload = {
        "message": message,
        "thread_id": f"test-thread-{int(time.time())}",
        "workspace_id": workspace_id,
        "execution": {
            "execution_mode": mode,
            "stream_thoughts": True
        }
    }
    
    try:
        # We use a POST request to /chat/stream. 
        # Since it's a stream, we'll just read the first few chunks to verify it's working.
        response = requests.post(f"{BASE_URL}/chat/stream", json=payload, stream=True, timeout=30)
        if response.status_code == 200:
            content_received = False
            for line in response.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith("data:"):
                        data = json.loads(decoded_line[5:])
                        if data.get("type") in ["content", "reasoning"]:
                            content_received = True
                            break
            return content_received
    except Exception as e:
        print(f"Chat error ({mode}): {e}")
    return False

def main():
    print("Starting Comprehensive Workspace Permutation Testing...")
    
    vault_docs = get_vault_documents()
    if not vault_docs:
        print("No documents found in vault. Please upload some docs first.")
        return
    
    test_doc = vault_docs[0]
    print(f"Using test document: {test_doc['filename']} (ID: {test_doc['id']})")
    
    results_report = []
    
    scenarios = list(itertools.product(embedding_providers, chunking_strategies))
    print(f"Generating {len(scenarios)} scenarios...")
    
    runtime_modes = ["auto", "fast", "think", "deep"]
    run_id = int(time.time())
    
    for i, (emb, chunk) in enumerate(scenarios):
        # Pick a mode for this scenario to test diversity without exponential growth
        mode = runtime_modes[i % len(runtime_modes)]
        scenario_name = f"Test_{emb}_{chunk}_{run_id}"
        print(f"\n>>> Scenario: {scenario_name} (Mode: {mode})")
        
        ws_id = create_workspace(scenario_name, emb, chunk)
        if not ws_id:
            results_report.append({"scenario": scenario_name, "stage": "workspace_creation", "status": "failed"})
            continue
            
        print(f"Created Workspace ID: {ws_id}")
        
        task_id = add_doc_to_workspace(test_doc['id'], ws_id)
        if not task_id:
            results_report.append({"scenario": scenario_name, "stage": "ingestion_trigger", "status": "failed"})
            continue
            
        print(f"Ingestion started. Task ID: {task_id}. Waiting...")
        
        success = wait_for_task(task_id)
        if not success:
            results_report.append({"scenario": scenario_name, "stage": "ingestion_process", "status": "failed"})
            continue
            
        print("Ingestion complete. Testing retrieval...")
        
        found, search_results = test_retrieval(ws_id)
        if found:
            print(f"Retrieval success! Found {len(search_results)} results.")
            results_report.append({"scenario": scenario_name, "stage": "retrieval", "status": "passed", "results_count": len(search_results)})
        else:
            print("Retrieval failed to find results.")
            results_report.append({"scenario": scenario_name, "stage": "retrieval", "status": "failed"})
            
        print(f"Testing chat with mode: {mode}...")
        chat_success = test_chat(ws_id, mode)
        if chat_success:
            print(f"Chat success with mode {mode}!")
            results_report.append({"scenario": scenario_name, "stage": f"chat_{mode}", "status": "passed"})
        else:
            print(f"Chat failed with mode {mode}.")
            results_report.append({"scenario": scenario_name, "stage": f"chat_{mode}", "status": "failed"})

    print("\n" + "="*50)
    print("FINAL REPORT")
    print("="*50)
    for r in results_report:
        status_icon = "✅" if r["status"] == "passed" else "❌"
        res_count = f" ({r.get('results_count')} results)" if "results_count" in r else ""
        print(f"{status_icon} {r['scenario']}: {r['stage']} - {r['status']}{res_count}")
    print("="*50)

if __name__ == "__main__":
    main()
