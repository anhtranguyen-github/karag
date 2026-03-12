# Marker Documentation – Comprehensive Overview

**Marker** is an open-source Python library/tool that converts PDF, images, PPTX, DOCX, XLSX, HTML, and EPUB files into high-quality Markdown, JSON, HTML, or chunks. It excels at handling complex elements (tables, equations, inline math, code blocks, forms, images, links, references) across **all languages**, removes headers/footers/artifacts, and supports optional LLM post-processing for better accuracy. It is modular, extensible, and optimized for speed (especially on GPU).

Developed by Vik Paruchuri / datalab-to. Actively maintained (high stars: ~33k as of 2026), GPL-3.0 license. Strong benchmarks show it outperforming many alternatives (e.g., LlamaParse, Mathpix, Docling) in accuracy and speed.

## 1. Supported Formats

### Input Formats
- PDF (digital & scanned)
- Images (various formats)
- PPTX
- DOCX
- XLSX
- HTML
- EPUB

### Output Formats
| Format   | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| Markdown | Clean, readable text with fenced tables, $$ LaTeX equations, fenced code, image links, superscripts for footnotes |
| HTML     | Semantic markup with `<img>`, `<math>`, `<pre>`, etc.                       |
| JSON     | Hierarchical tree of blocks (Page, SectionHeader, Text, Table, etc.) with `id`, `block_type`, `html`, `polygon`, `children`, `images` (base64), `section_hierarchy` |
| Chunks   | Flattened top-level blocks with full HTML – ideal for RAG/vector search     |

Additional metadata: `table_of_contents`, `page_stats` (block counts, extraction method).

## 2. Pipeline & Architecture

Modular deep-learning + heuristic pipeline:

1. **Providers** → Extract raw content (text, images) from file.
2. **Builders** → Create initial document blocks and populate text.
3. **Processors** → Refine with models/heursitics (layout, OCR, table formatting, equation detection, etc.).
4. **Renderers** → Output to Markdown/JSON/HTML/chunks.
5. **Optional LLM Post-processing** → Fix tables, inline math, forms, etc.

Core models:
- **OCR & Layout**: Surya (multi-language, detects reading order, blocks).
- **Table Recognition**: Built-in + optional LLM enhancement.
- **Equations/Inline Math**: Surya + Texify + optional LLM (`--redo_inline_math` for best quality).
- **Image Extraction**: Saves images (links in MD/HTML, base64 in JSON).

Only needed models are loaded → efficient.

## 3. Models & LLM Integration

- **OCR/Layout**: Surya (supports 90+ languages; see Surya repo for full list).
- **LLM Boost** (`--use_llm`): Improves tables (0.816 → 0.907), inline math, forms.
  - Backends: Gemini (default flash), Vertex, Ollama (local), Claude, OpenAI-compatible, Azure OpenAI.
  - Custom prompt via `--block_correction_prompt`.
  - Services configured via flags (`--gemini_api_key`, `--ollama_model`, etc.).

No built-in VLM for description (unlike Docling); focuses on structure + optional LLM refinement.

## 4. Installation

```bash
# PDF only (fastest)
pip install marker-pdf

# Full (images, Office, EPUB, etc.)
pip install marker-pdf[full]
From source (dev/benchmarks):
Bashgit clone https://github.com/datalab-to/marker.git
poetry install
Requires: Python 3.10+, PyTorch (auto-detects GPU/CPU/MPS).
5. Usage Examples
CLI – Single File
Bashmarker_single input.pdf --output_format markdown --output_dir out/
Key flags:

--page_range "0,5-10,20"
--output_format markdown|json|html|chunks
--use_llm (LLM refinement)
--force_ocr / --strip_existing_ocr
--redo_inline_math
--disable_image_extraction
--debug (saves layout visualizations)
--paginate_output
--html_tables_in_markdown (use HTML tables in MD output)

CLI – Batch / Folder
Bashmarker input_folder/ --workers 8
Multi-GPU batch:
BashNUM_DEVICES=4 NUM_WORKERS=15 marker_chunk_convert pdf_in/ md_out/
Python API – Basic
Pythonfrom marker.converters.pdf import PdfConverter
from marker.models import create_model_dict
from marker.output import text_from_rendered

converter = PdfConverter(artifact_dict=create_model_dict())
rendered = converter("input.pdf")
text, _, images = text_from_rendered(rendered)
print(text)
Custom Config / LLM
Pythonfrom marker.config.parser import ConfigParser
from marker.converters.pdf import PdfConverter

config = {"use_llm": True, "llm_service": "marker.services.ollama.OllamaService"}
config_parser = ConfigParser(config)
converter = PdfConverter(
    config=config_parser.generate_config_dict(),
    artifact_dict=create_model_dict(),
    llm_service=config_parser.get_llm_service()
)
rendered = converter("file.pdf")
Specialized converters: TableConverter, OCRConverter, ExtractionConverter (structured JSON schema extraction – beta).
API Server
Bashmarker_server --port 8000
→ FastAPI docs at http://localhost:8000/docs
6. Advanced Options & Configuration

--processors "module1.proc1,module2.proc2": Custom processor list.
--config_json path.json: Load full config.
--converter_cls marker.converters.table.TableConverter: Use specialized converter.
--force_layout_block Table: Target specific block types.
Structured extraction (beta): Pass Pydantic schema → LLM extracts matching data.
Env vars: TORCH_DEVICE=cuda|mps|cpu

7. GPU / Performance

Auto-detects CUDA/MPS/CPU.
Multi-GPU: Set NUM_DEVICES + NUM_WORKERS.
VRAM: ~3.5–5 GB per worker.
Benchmarks (H100 GPU):
Single page: ~2.8s (vs Docling ~3.7s, LlamaParse ~23s).
Throughput: Up to 25–122 pages/sec in batch (parallel workers).
Accuracy: 95.67% heuristic / 4.24 LLM judge score (outperforms Docling 86.7/3.7, Mathpix, etc.).
Tables: LLM boost → 0.907 score.


Marker is generally faster and more accurate than Docling on many benchmarks, especially with --use_llm, but Docling may edge out in some layout-heavy or vision-model scenarios.
For latest updates, see: https://github.com/datalab-to/marker
Hosted API: https://www.datalab.to
Benchmarks/datasets: Hugging Face datalab-to/marker_benchmark, Google Drive links in repo.