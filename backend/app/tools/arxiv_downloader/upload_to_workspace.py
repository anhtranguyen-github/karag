#!/usr/bin/env python3
"""
Upload all PDFs from the arxiv_downloader/downloads folder to a specific workspace via the backend API.
"""
import os
import sys
import requests
import mimetypes
from pathlib import Path

DOWNLOADS_DIR = Path(__file__).parent / "downloads"
API_BASE = "http://localhost:8000"

def upload_pdf(pdf_path: Path, workspace_id: str) -> dict:
    """Upload a single PDF to the specified workspace."""
    url = f"{API_BASE}/upload?workspace_id={workspace_id}"
    filename = pdf_path.name
    
    # Determine MIME type
    mime_type, _ = mimetypes.guess_type(str(pdf_path))
    if not mime_type:
        mime_type = "application/pdf"
    
    with open(pdf_path, 'rb') as f:
        files = {'file': (filename, f, mime_type)}
        response = requests.post(url, files=files)
    
    return response.json() if response.ok else {"error": response.text, "status_code": response.status_code}

def find_pdfs(directory: Path) -> list[Path]:
    """Recursively find all PDFs in the given directory."""
    return list(directory.rglob("*.pdf"))

def main():
    if len(sys.argv) < 2:
        print("Usage: python upload_to_workspace.py <workspace_id> [paper_filter]")
        print("Example: python upload_to_workspace.py 585ea767")
        print("Example: python upload_to_workspace.py 585ea767 Pooling")
        sys.exit(1)
    
    workspace_id = sys.argv[1]
    paper_filter = sys.argv[2].lower() if len(sys.argv) > 2 else None
    
    print(f"Uploading PDFs to workspace: {workspace_id}")
    print(f"Scanning directory: {DOWNLOADS_DIR}")
    
    pdfs = find_pdfs(DOWNLOADS_DIR)
    
    if paper_filter:
        pdfs = [p for p in pdfs if paper_filter in p.name.lower()]
        print(f"Filtered to {len(pdfs)} PDFs containing '{paper_filter}'")
    else:
        print(f"Found {len(pdfs)} PDFs")
    
    for i, pdf in enumerate(pdfs, 1):
        print(f"[{i}/{len(pdfs)}] Uploading: {pdf.name}")
        result = upload_pdf(pdf, workspace_id)
        if "error" in result:
            print(f"  ERROR: {result}")
        else:
            print(f"  -> Task ID: {result.get('task_id', 'N/A')}, Status: {result.get('status', 'unknown')}")
    
    print("\nAll uploads initiated. Ingestion is running in background.")

if __name__ == "__main__":
    main()
