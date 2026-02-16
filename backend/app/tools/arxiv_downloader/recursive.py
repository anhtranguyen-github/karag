import os
import sys
import re
import pypdf
from typing import List, Set
from pathlib import Path

# Identifiers for tools
from downloader import download_arxiv_paper


def extract_content_from_pdf(pdf_path: Path) -> str:
    """Extracts text from the entire PDF using safe Path object."""
    try:
        reader = pypdf.PdfReader(str(pdf_path))
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() + "\n"
        return full_text
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return ""

def find_references_section(text: str) -> str:
    """Heuristic to find the start of the references section."""
    patterns = [
        r'\n\s*References\s*\n', 
        r'\n\s*REFERENCES\s*\n', 
        r'\n\s*Bibliography\s*\n',
        r'\n\s*[0-9]*\.?\s*References\s*\n' 
    ]
    
    best_idx = -1
    for p in patterns:
        matches = list(re.finditer(p, text, re.IGNORECASE))
        if matches:
            best_idx = max(best_idx, matches[-1].start())
    
    if best_idx != -1:
         return text[best_idx:]
    return text[-50000:] if len(text) > 50000 else text

def get_arxiv_ids(text: str) -> Set[str]:
    """Extracts arXiv IDs using common patterns."""
    ids = set(re.findall(r'(\d{4}\.\d{4,5})', text))
    explicit = re.findall(r'arxiv:?\s*(\d{4}\.\d{4,5})', text, re.IGNORECASE)
    ids.update(explicit)
    urls = re.findall(r'arxiv\.org/abs/(\d{4}\.\d{4,5})', text)
    ids.update(urls)
    return ids

def parse_non_arxiv_references(text: str) -> List[str]:
    """Heuristic to identify reference entries that don't mention arXiv."""
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

DEFAULT_DOWNLOADS_SUBDIR = "downloads"

def run_recursive_downloader(main_id: str, max_refs: int = 10, output_subdir: str = DEFAULT_DOWNLOADS_SUBDIR):
    print(f"=== Starting Recursive Downloader for {main_id} ===")
    
    # 1. Download Main Paper
    main_dir_str = download_arxiv_paper(main_id, output_subdir)
    if not main_dir_str:
        print("Failed to download main paper.")
        return

    main_dir = Path(main_dir_str)
    pdf_files = [f for f in main_dir.iterdir() if f.suffix == '.pdf']
    if not pdf_files:
        print("No PDF found in download directory.")
        return
    
    main_pdf_path = pdf_files[0]
    
    # 2. Extract Citations
    print(f"Extracting citations from {main_pdf_path}...")
    ref_text = extract_content_from_pdf(main_pdf_path)
    ref_section = find_references_section(ref_text)
    
    arxiv_ids = get_arxiv_ids(ref_section)
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
            download_arxiv_paper(aid, output_subdir)
            downloaded_count += 1
        except Exception as e:
            print(f"  ERR: Failed to download {aid}: {e}")

    # 4. Generate Report
    report_path = main_dir / "citation_report.md"
    
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
    run_recursive_downloader(input_id, limit, DEFAULT_DOWNLOADS_SUBDIR)

