from __future__ import annotations
import logging
import os
import tempfile
from typing import Any

from app.rag.components.base import BaseReader
from app.rag.schemas.documents import Document
from app.rag.schemas.schemas import FileConfig

logger = logging.getLogger(__name__)

try:
    from docling.document_converter import DocumentConverter
    from docling.datamodel.pipeline_options import PdfPipelineOptions
except ImportError as e:
    logger.warning(f"docling not installed or incomplete, DoclingReader will be unavailable. Error: {e}")
    DocumentConverter = None
    PdfPipelineOptions = None

class DoclingReader(BaseReader):
    """AI-powered document converter using IBM Docling."""

    name = "docling"
    description = "AI-powered document converter for various formats (PDF, DOCX, HTML)."
    requirement = ["docling"]
    config = {
        "do_ocr": "bool",
        "do_table_structure": "bool",
        "do_formula_enrichment": "bool",
        "do_code_enrichment": "bool",
        "device": "str",
        "artifacts_path": "str"
    }

    _converter: Any = None

    def __init__(self, rag_config: dict[str, Any]) -> None:
        reader_cfg = rag_config.get("reader", {})
        self.do_ocr = reader_cfg.get("do_ocr", True)
        self.do_table_structure = reader_cfg.get("do_table_structure", True)
        self.do_formula_enrichment = reader_cfg.get("do_formula_enrichment", False)
        self.do_code_enrichment = reader_cfg.get("do_code_enrichment", False)
        self.device = reader_cfg.get("device", "auto")
        self.artifacts_path = reader_cfg.get("artifacts_path") or os.getenv("DOCLING_ARTIFACTS_PATH")

    def _get_converter(self) -> Any:
        if DoclingReader._converter is None:
            if DocumentConverter is None:
                raise RuntimeError("Missing dependency: docling. DoclingReader is unavailable.")

            from docling.datamodel.pipeline_options import AcceleratorOptions, AcceleratorDevice
            
            from docling.datamodel.base_models import InputFormat
            from docling.document_converter import PdfFormatOption
            
            pipeline_options = PdfPipelineOptions()
            pipeline_options.do_ocr = self.do_ocr
            pipeline_options.do_table_structure = self.do_table_structure
            pipeline_options.do_formula_enrichment = self.do_formula_enrichment
            pipeline_options.do_code_enrichment = self.do_code_enrichment
            
            if self.artifacts_path:
                pipeline_options.artifacts_path = self.artifacts_path
            
            if self.device != "auto":
                try:
                    pipeline_options.accelerator_options = AcceleratorOptions(
                        device=AcceleratorDevice(self.device)
                    )
                except Exception:
                    logger.warning("Invalid accelerator device: %s, falling back to auto.", self.device)

            DoclingReader._converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
                }
            )
        return DoclingReader._converter

    async def read(self, content_bytes: bytes, file_config: FileConfig, rag_config: dict[str, Any]) -> list[Document]:
        from io import BytesIO
        from docling.datamodel.document import DocumentStream
        
        converter = self._get_converter()

        try:
            source = DocumentStream(name=file_config.filename, stream=BytesIO(content_bytes))
            result = converter.convert(source)
            raw_text = result.document.export_to_markdown()
            
            return [Document(
                file_id=file_config.file_id,
                content=raw_text,
                title=file_config.filename,
                source=file_config.source,
                labels=file_config.labels_json,
                metadata={
                    "extension": file_config.extension,
                    "file_size": file_config.file_size,
                    "engine": "docling",
                    "ocr_enabled": self.do_ocr,
                    "formula_enrichment": self.do_formula_enrichment,
                    "code_enrichment": self.do_code_enrichment
                }
            )]
        except Exception as e:
            logger.error("Docling conversion failed: %s", e)
            raise RuntimeError(f"Docling conversion failed: {e}") from e