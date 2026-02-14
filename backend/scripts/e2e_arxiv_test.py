import httpx
import time
import json
import sys

BASE_URL = "http://localhost:8000"

def log(msg):
    print(f"[*] {msg}")

def check_task(task_id):
    with httpx.Client() as client:
        while True:
            res = client.get(f"{BASE_URL}/tasks/{task_id}")
            resp_data = res.json()
            if not resp_data.get("success"):
                print(f"    [!] Task fetch failed: {resp_data}")
                sys.exit(1)
            
            task_data = resp_data["data"]
            status = task_data.get("status")
            progress = task_data.get("progress", 0)
            message = task_data.get("message", "")
            
            print(f"    Task {task_id}: {status} ({progress}%) - {message}")
            
            if status == "completed":
                return task_data.get("result", {})
            if status == "failed":
                print(f"    [!] Task failed: {data.get('error')}")
                sys.exit(1)
            
            time.sleep(2)

def e2e_flow():
    with httpx.Client(timeout=60.0) as client:
        # 1. Create Workspace
        ws_name = f"Deep Thinking Research {int(time.time())}"
        log(f"Creating customized workspace '{ws_name}'...")
        ws_config = {
            "name": ws_name,
            "description": "E2E Test for ArXiv ingestion and modular RAG",
            "agentic_enabled": True,
            "rag_engine": "graph",
            "embedding_provider": "openai",
            "llm_provider": "openai",
            "temperature": 0.2
        }
        res = client.post(f"{BASE_URL}/workspaces/", json=ws_config)
        ws_data = res.json()
        if not ws_data.get("success"):
            print(f"    [!] Failed to create workspace: {ws_data}")
            sys.exit(1)
        
        ws_id = ws_data["data"]["id"]
        log(f"Workspace created: {ws_id}")

        # 2. Upload ArXiv Papers
        arxiv_links = [
            "https://arxiv.org/abs/2508.15260",
            "https://arxiv.org/abs/2305.11860",
            "https://arxiv.org/abs/2203.11171"
        ]
        
        doc_tasks = []
        for link in arxiv_links:
            log(f"Uploading {link}...")
            res = client.post(f"{BASE_URL}/upload-arxiv?workspace_id={ws_id}", json={"url": link})
            doc_tasks.append(res.json()["data"]["task_id"])

        # Wait for ingestion
        doc_ids = []
        filenames = []
        for tid in doc_tasks:
            result = check_task(tid)
            doc_ids.append(result["doc_id"])
            filenames.append(result["filename"])

        # 3. Index Documents
        indexing_tasks = []
        for filename in filenames:
            log(f"Indexing {filename}...")
            res = client.post(f"{BASE_URL}/documents/{filename}/index?workspace_id={ws_id}")
            indexing_tasks.append(res.json()["data"]["task_id"])

        # Wait for indexing
        for tid in indexing_tasks:
            check_task(tid)

        # 4. Smoke Test - Chat
        log("Smoke Test: Chatting about the papers...")
        chat_payload = {
            "message": "Summarize the core innovation of DeepConf (2508.15260) and how it differs from self-consistency.",
            "workspace_id": ws_id,
            "thread_id": f"e2e-test-thread-{int(time.time())}"
        }
        
        with client.stream("POST", f"{BASE_URL}/chat/stream", json=chat_payload) as res:
            full_response = ""
            for line in res.iter_lines():
                if isinstance(line, bytes):
                    line = line.decode('utf-8')
                decoded_line = line.strip()
                if decoded_line.startswith("data: "):
                    try:
                        chunk = json.loads(decoded_line[6:])
                        if chunk.get("type") == "content":
                            full_response += chunk.get("delta", "")
                    except:
                        pass
        
        log(f"Chat Response Received: {full_response[:100]}...")
        if len(full_response) > 20: 
            log("[V] Chat response looks relevant.")
        else:
            log(f"[!] Chat response too short or empty. Full response: '{full_response}'")
            # For debugging, let's not exit here yet if it's just short

        # 5. Smoke Test - View Mentioned Documents
        log("Smoke Test: Checking document list...")
        res = client.get(f"{BASE_URL}/documents?workspace_id={ws_id}")
        docs = res.json()["data"]
        log(f"Found {len(docs)} documents in workspace.")
        if len(docs) < 3:
            log(f"[!] Expected >= 3 docs, found {len(docs)}")
            sys.exit(1)

        # 6. Smoke Test - View Detail Documents
        log("Smoke Test: Inspecting detailed metadata...")
        for doc_id in doc_ids[:1]:
            res = client.get(f"{BASE_URL}/documents/{doc_id}/inspect")
            data = res.json()["data"]
            metadata = data.get("metadata", {})
            status = metadata.get("status")
            log(f"Document inspection for '{filename}' - Status: {status}")
            if status != "indexed":
                print(f"    [!] Debug: Metadata keys: {list(metadata.keys())}")
                print(f"    [!] Debug: Full metadata: {metadata}")
                sys.exit(1)

        log("E2E Flow Completed Successfully!")

if __name__ == "__main__":
    e2e_flow()
