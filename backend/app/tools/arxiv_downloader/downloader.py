import os
import sys
import arxiv
from typing import Optional
from pathlib import Path

# Fixed base directory for application data
DATA_DIR = Path("/home/tra01/project/karag/backend/data")
DEFAULT_DOWNLOADS_SUBDIR = "downloads"

def download_arxiv_paper(arxiv_id_or_url: str, output_subdir: str = DEFAULT_DOWNLOADS_SUBDIR) -> Optional[str]:

    """
    Download a paper from arXiv by its ID or URL.
    Saves the PDF and a citation file in a folder named after the paper ID (secure identifier).
    """
    arxiv_id = arxiv_id_or_url.split('/')[-1]
    if arxiv_id.endswith('.pdf'):
        arxiv_id = arxiv_id.replace('.pdf', '')
    
    print(f"Searching for arXiv paper: {arxiv_id}...")
    
    try:
        client = arxiv.Client()
        search = arxiv.Search(id_list=[arxiv_id])
        paper = next(client.results(search), None)
        if not paper:
            print(f"Error: No paper found with ID {arxiv_id}")
            return None
    except Exception as e:
        print(f"Error searching for paper: {e}")
        return None

    # INTERNAL ONLY: Path construction based on fixed identifiers
    # We use the canonical path validation to ensure no directory traversal occurs
    from backend.app.core.path_utils import validate_safe_path
    
    try:
        # Sanitize and validate the final path
        raw_target_path = DATA_DIR / output_subdir / arxiv_id
        target_path = validate_safe_path(raw_target_path)
    except Exception as e:
        print(f"Illegal path error: {e}")
        return None
    
    if not target_path.exists():
        target_path.mkdir(parents=True, exist_ok=True)
        print(f"Created directory: {target_path}")


    # Enforce whitelisted extensions
    pdf_filename = "paper.pdf"
    pdf_path = target_path / pdf_filename
    
    if not pdf_path.exists():
        print(f"Downloading PDF to {pdf_path}...")
        paper.download_pdf(dirpath=str(target_path), filename=pdf_filename)
    else:
        print(f"PDF already exists: {pdf_path}")

    # Generate Citation (BibTeX)
    authors_list = [author.name for author in paper.authors]
    first_author_surname = authors_list[0].split()[-1] if authors_list else "Unknown"
    year = paper.published.year
    bib_key = f"{first_author_surname}{year}{arxiv_id.split('.')[-1]}"
    
    title = paper.title
    journal = paper.journal_ref if paper.journal_ref else f"arXiv preprint arXiv:{arxiv_id}"
    doi_field = f"  doi={{{paper.doi}}}," if paper.doi else ""
    
    bibtex = f"""@article{{{bib_key},
  title={{{title}}},
  author={{{' and '.join(authors_list)}}},
  journal={{{journal}}},
  year={{{year}}},
  url={{https://arxiv.org/abs/{arxiv_id}}},
{doi_field}
}}"""

    citation_path = target_path / "citation.bib"
    with open(citation_path, "w", encoding="utf-8") as f:
        f.write(bibtex)
    print(f"Saved citation to {citation_path}")

    # Save summary/metadata
    metadata_path = target_path / "metadata.json"
    
    import json
    metadata = {
        "title": title,
        "authors": authors_list,
        "published": paper.published.isoformat(),
        "updated": paper.updated.isoformat(),
        "arxiv_id": arxiv_id,
        "url": f"https://arxiv.org/abs/{arxiv_id}",
        "primary_category": paper.primary_category,
        "categories": paper.categories,
        "abstract": paper.summary
    }
    
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}")

    return str(target_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python arxiv_downloader.py <arxiv_id_or_url> [output_subdir]")
        sys.exit(1)
    
    paper_id = sys.argv[1]
    out_subdir = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_DOWNLOADS_SUBDIR
    
    result = download_arxiv_paper(paper_id, out_subdir)
    if result:
        print(f"\nSuccessfully downloaded paper to: {result}")
    else:
        sys.exit(1)

