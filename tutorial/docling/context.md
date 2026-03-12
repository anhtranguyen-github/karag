# Docling Documentation – Comprehensive Overview

**Docling** is an open-source document conversion library that transforms various document formats (PDF, Office files, images, etc.) into a unified structured representation (`DoclingDocument`). It supports advanced PDF understanding, layout analysis, table extraction, OCR, enrichments, and vision-language model (VLM) pipelines.

This document summarizes the most important usage aspects: supported formats, advanced options, enrichments, vision models, model catalog, and GPU support.

## 1. Supported Formats

### Input Formats
Docling supports a wide range of input formats:

| Format                  | Description                                                                 |
|-------------------------|-----------------------------------------------------------------------------|
| PDF                     | Scanned and digital PDFs (main focus)                                       |
| DOCX, XLSX, PPTX        | Microsoft Office Open XML formats                                           |
| Markdown                | Plain-text markup                                                           |
| AsciiDoc                | Structured technical content markup                                         |
| LaTeX                   | Scientific documents                                                        |
| HTML, XHTML             | Web documents                                                               |
| CSV                     | Tabular data                                                                |
| PNG, JPEG, TIFF, BMP, WEBP | Image formats (single-page conversion)                                   |
| WAV, MP3, M4A, AAC, OGG, FLAC | Audio (requires `asr` extra)                                             |
| MP4, AVI, MOV           | Video (audio track transcribed, requires `asr` + ffmpeg)                    |
| WebVTT                  | Timed text tracks                                                           |

**Schema-specific**:
- USPTO XML, JATS XML, XBRL XML
- Docling JSON (native serialized format)

### Output Formats
| Format     | Description                                      |
|------------|--------------------------------------------------|
| HTML       | With embedded or referenced images               |
| Markdown   | Structured text                                  |
| JSON       | Lossless `DoclingDocument` serialization         |
| Text       | Plain text (no Markdown)                         |
| Doctags    | Layout-aware markup (efficient for AI)           |
| WebVTT     | Timed text output                                |

## 2. Advanced Options

### Model Prefetching & Offline Usage
Models are auto-downloaded on first use. For offline/air-gapped environments:

- CLI prefetch: `docling-tools models download`
- Download specific HF repo: `docling-tools models download-hf-repo ds4sd/SmolDocling-256M-preview`
- Use prefetched models:

```python
artifacts_path = "/path/to/models"
pipeline_options = PdfPipelineOptions(artifacts_path=artifacts_path)
# Pass to DocumentConverter format_options
Or via env var: DOCLING_ARTIFACTS_PATH=/path/to/models
Remote Services
Explicit opt-in required (enable_remote_services=True) for cloud OCR, VLMs, etc.
Pythonpipeline_options = PdfPipelineOptions(enable_remote_services=True)
Raises exception if not enabled.
Pipeline Adjustments

Table structure cell matching: table_structure_options.do_cell_matching = False
TableFormer mode: table_structure_options.mode = TableFormerMode.ACCURATE (or .FAST)
Size limits: converter.convert(..., max_num_pages=100, max_file_size=20*1024*1024)
Binary stream input:

Pythonfrom io import BytesIO
source = DocumentStream(name="doc.pdf", stream=BytesIO(pdf_bytes))

Limit CPU threads: export OMP_NUM_THREADS=4 (default: 4)

3. Enrichments
Enrichments add value to document elements (code, formulas, pictures) but increase processing time. Disabled by default.



































FeatureParameterTargetModel / NotesCode understandingdo_code_enrichment=TrueCodeItemCodeFormula (sets language)Formula understandingdo_formula_enrichment=TrueFORMULA TextCodeFormula → LaTeX + MathML in HTMLPicture classificationdo_picture_classification=TruePictureItemDocumentFigureClassifier (chart types, etc.)Picture descriptiondo_picture_description=TruePictureItemVLM captioning (local or remote)
Picture Description Options:

Granite Vision: granite_picture_description
SmolVLM: smolvlm_picture_description
Custom HF model: PictureDescriptionVlmOptions(repo_id="...")
Remote API: PictureDescriptionApiOptions(url="...", params=..., enable_remote_services=True)

CLI flags: --enrich-code, --enrich-formula, --enrich-picture-classes
4. Vision Models (VLM Pipeline)
Use VlmPipeline for end-to-end page conversion (DocTags, Markdown, HTML) with vision-language models.
CLI: docling --pipeline vlm FILE
Pythonfrom docling.pipeline.vlm_pipeline import VlmPipeline
format_options={InputFormat.PDF: PdfFormatOption(pipeline_cls=VlmPipeline)}
Available Local Models (selection via vlm_options=vlm_model_specs.<PRESET>):

SMOLDOCLING_MLX / SMOLDOCLING_TRANSFORMERS (DocTags)
GRANITEDOCLING_MLX / Transformers variants
Larger models: Pixtral-12B, Qwen2.5-VL-3B, Gemma-3, Phi-4, etc. (mostly Markdown)

Supports Transformers and MLX (Apple MPS) frameworks. Remote inference via OpenAI-compatible APIs (vLLM, Ollama, LM Studio).
5. Model Catalog Overview
Core Stages & Models

Layout: RT-DETR based (docling-layout-heron, egret-*, etc.)
OCR: EasyOCR, RapidOCR, Tesseract, SuryaOCR, macOS Vision, Auto
Table Structure: TableFormer (Accurate / Fast modes)
Picture Classifier: DocumentFigureClassifier-v2.0 (ViT)
VLM Convert: Granite-Docling-258M, SmolDocling-256M (DocTags), Pixtral-12B, Qwen2.5-VL-3B, etc. (Markdown)
Picture Description: SmolVLM, Granite-Vision, etc.
Code & Formula: CodeFormulaV2, Granite-Docling

Inference engines: docling-ibm-models, Transformers, MLX, ONNX/OpenVINO, llama.cpp (via Ollama/LM Studio), vLLM, etc.
Presets simplify selection (e.g., from_preset("smoldocling")).
6. GPU Support & Performance
Standard Pipeline
Enable GPU:
Pythonaccelerator_options = AcceleratorOptions(device=AcceleratorDevice.CUDA)  # or AUTO
Batch inference:
Pythonpipeline_options = ThreadedPdfPipelineOptions(
    ocr_batch_size=64,
    layout_batch_size=64,
    # table_batch_size limited
)
OCR GPU: RapidOCR with backend="torch"
VLM Pipeline (Best GPU Usage)
Use local inference server (vLLM recommended on Linux):
Bashvllm serve ibm-granite/granite-docling-258M --gpu-memory-utilization 0.9 ...
Docling config:
Pythonvlm_options = VlmPipelineOptions(
    enable_remote_services=True,
    vlm_options={"url": "http://localhost:8000/v1/chat/completions", "concurrency": 64, ...}
)
settings.perf.page_batch_size = 64
Performance examples (RTX 5090 / L40S class GPUs): ~3–8 pages/second depending on pipeline and batching.
For the latest updates, refer to the official Docling site: https://docling-project.github.io/docling/