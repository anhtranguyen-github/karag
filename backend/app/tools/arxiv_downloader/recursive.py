#!/usr/bin/env python3
import os
import sys
import re
import pypdf
from typing import List, Set

from downloader import download_arxiv_paper

def extract_content_from_pdf(pdf_path: str) -> str:
    """Extracts text from the last part of the PDF where references usually are."""
    try:
        reader = pypdf.PdfReader(pdf_path)
        num_pages = len(reader.pages)
        full_text = ""
        # Typically references are in the last 20% or last 10 pages
        start_page = max(0, num_pages - 10)
        for i in range(start_page, num_pages):
            full_text += reader.pages[i].extract_text() + "\n"
        return full_text
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return ""

def find_references_section(text: str) -> str:
    """Heuristic to find the start of the references section."""
    patterns = [r'\nReferences\n', r'\nREFERENCES\n', r'\nBibliography\n']
    for p in patterns:
        match = re.search(p, text, re.IGNORECASE)
        if match:
            return text[match.start():]
    return text # Fallback to full text if section not found

def get_arxiv_ids(text: str) -> Set[str]:
    """Extracts arXiv IDs using common patterns."""
    # Pattern for YYMM.NNNNN
    ids = set(re.findall(r'(\d{4}\.\d{4,5})', text))
    # Pattern for explicit arXiv: prefix
    explicit = re.findall(r'arxiv:?\s*(\d{4}\.\d{4,5})', text, re.IGNORECASE)
    ids.update(explicit)
    # Pattern for URLs
    urls = re.findall(r'arxiv\.org/abs/(\d{4}\.\d{4,5})', text)
    ids.update(urls)
    return ids

def parse_non_arxiv_references(text: str) -> List[str]:
    """Heuristic to identify reference entries that don't mention arXiv."""
    # Split by what looks like start of a new citation (New line + Author Name)
    # This is a very rough heuristic: citations often end with a year and a period.
    entries = []
    current = ""
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        current += " " + line
        if re.search(r'\.\s+(19|20)\d{2}\.$', line) or re.search(r'\.(19|20)\d{2}$', line) or "http" in line:
            if "arxiv" not in current.lower():
                entries.append(current.strip())
            current = ""
    return entries

DEFAULT_OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "downloads")

def run_recursive_downloader(main_id: str, max_refs: int = 10, output_dir: str = DEFAULT_OUTPUT_DIR):
    print(f"=== Starting Recursive Downloader for {main_id} ===")
    
    # 1. Download Main Paper
    main_dir = download_arxiv_paper(main_id, output_dir)
    if not main_dir:
        print("Failed to download main paper.")
        return

    pdf_files = [f for f in os.listdir(main_dir) if f.endswith('.pdf')]
    if not pdf_files:
        print("No PDF found in download directory.")
        return
    
    main_pdf_path = os.path.join(main_dir, pdf_files[0])
    
    # 2. Extract Citations
    print(f"Extracting citations from {main_pdf_path}...")
    ref_text = extract_content_from_pdf(main_pdf_path)
    ref_section = find_references_section(ref_text)
    
    arxiv_ids = get_arxiv_ids(ref_section)
    # Filter out the main ID itself if it appears
    clean_main_id = main_id.split('/')[-1].replace('.pdf', '')
    if clean_main_id in arxiv_ids:
        arxiv_ids.remove(clean_main_id)
    
    non_arxiv_refs = parse_non_arxiv_references(ref_section)
    
    # 3. Download ArXiv Citations
    print(f"Found {len(arxiv_ids)} ArXiv citations. Downloading up to {max_refs}...")
    downloaded_count = 0
    for aid in sorted(list(arxiv_ids)):
        if downloaded_count >= max_refs:
            print(f"Reached limit of {max_refs} citation downloads.")
            break
        try:
            print(f"  -> Downloading citation: {aid}")
            download_arxiv_paper(aid, output_dir)
            downloaded_count += 1
        except Exception as e:
            print(f"  ERR: Failed to download {aid}: {e}")

    # 4. Generate Report
    report_path = os.path.join(main_dir, "citation_report.md")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"# Citation Report for {main_id}\n\n")
        f.write(f"## ArXiv Citations Detected ({len(arxiv_ids)})\n")
        for aid in sorted(list(arxiv_ids)):
            f.write(f"- [arXiv:{aid}](https://arxiv.org/abs/{aid})\n")
        
        f.write("\n## Non-ArXiv Citations Identified\n")
        if not non_arxiv_refs:
            f.write("*No non-arXiv citations were clearly identified via heuristic.*\n")
        for ref in non_arxiv_refs:
            f.write(f"- {ref}\n")
            
    print("\n=== Process Complete ===")
    print(f"Report saved to: {report_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python recursive.py <arxiv_id_or_url> [max_downloads]")
        sys.exit(1)
    
    input_id = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    run_recursive_downloader(input_id, limit, DEFAULT_OUTPUT_DIR)
