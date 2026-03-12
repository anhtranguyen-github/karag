from __future__ import annotations
import logging
import os
import tempfile
from typing import Any

from app.rag.components.base import BaseReader
from app.rag.schemas.documents import Document
from app.rag.schemas.schemas import FileConfig

logger = logging.getLogger(__name__)

OMNIROUTE_MARKER_SERVICE = "app.rag.components.readers.marker_omniroute_service.OmniRouteService"

try:
    from marker.converters.pdf import PdfConverter
    from marker.models import create_model_dict
    from marker.output import text_from_rendered
except ImportError:
    logger.warning("marker-pdf not installed, MarkerReader will be unavailable.")
    PdfConverter = None
    create_model_dict = None
    text_from_rendered = None

# Compatibility shims for surya/marker against newer transformers releases.
try:
    from surya.recognition.model.config import SuryaOCRConfig
    _original_surya_init = SuryaOCRConfig.__init__
    def _patched_surya_init(self, *args, **kwargs):
        encoder_defaults = {"model_type": "vit", "projection_dim": 768, "hidden_size": 768}
        decoder_defaults = {
            "model_type": "vit",
            "projection_dim": 768,
            "hidden_size": 768,
            "bos_token_id": 1,
            "eos_token_id": 2,
            "pad_token_id": 0,
        }
        defaults = {
            "encoder": encoder_defaults,
            "decoder": decoder_defaults,
            "bos_token_id": 1,
            "eos_token_id": 2,
            "pad_token_id": 0,
            "decoder_start_token_id": 1,
        }
        if "encoder" in kwargs and isinstance(kwargs["encoder"], dict):
            kwargs["encoder"] = {**encoder_defaults, **kwargs["encoder"]}
        if "decoder" in kwargs and isinstance(kwargs["decoder"], dict):
            kwargs["decoder"] = {**decoder_defaults, **kwargs["decoder"]}
        for key, val in defaults.items():
            if key not in kwargs and not args:
                kwargs[key] = val
        _original_surya_init(self, *args, **kwargs)


    SuryaOCRConfig.__init__ = _patched_surya_init

    _original_get_text_config = SuryaOCRConfig.get_text_config

    def _patched_get_text_config(self, decoder=None, encoder=None):
        if decoder is None and encoder is None:
            return self.decoder
        if decoder:
            return self.decoder
        if encoder:
            return getattr(self, "text_encoder", self.encoder)
        return _original_get_text_config(self, decoder=decoder, encoder=encoder)

    SuryaOCRConfig.get_text_config = _patched_get_text_config
except (ImportError, AttributeError):
    pass


class MarkerReader(BaseReader):
    """High-accuracy PDF-to-Markdown conversion using Marker."""

    name = "marker"
    description = "High-accuracy PDF-to-Markdown conversion using depth models."
    requirement = ["marker-pdf"]
    config = {
        "use_llm": "bool",
        "redo_inline_math": "bool",
        "device": "str"
    }

    _converter: Any = None

    def __init__(self, rag_config: dict[str, Any]) -> None:
        self.rag_config = rag_config
        reader_cfg = (
            rag_config.get("reading", {})
            or rag_config.get("reader", {})
            or rag_config.get("rag", {})
        )
        
        # Defaults: Prefer LLM-based layout refinement via OmniRoute if possible.
        self.use_llm = reader_cfg.get("use_llm", True)
        self.force_ocr = reader_cfg.get("force_ocr", True)


        self.redo_inline_math = reader_cfg.get("redo_inline_math", True)
        self.html_tables_in_markdown = reader_cfg.get("html_tables_in_markdown", True)
        self.paginate_output = reader_cfg.get("paginate_output", True)
        self.device = reader_cfg.get("device", "auto")

    def _get_converter(self) -> Any:
        if MarkerReader._converter is None:
            if PdfConverter is None:
                raise RuntimeError("Missing dependency: marker-pdf. MarkerReader is unavailable.")

            config_dict = {
                "output_format": "markdown",
                "use_llm": self.use_llm,
                "force_ocr": self.force_ocr,
                "redo_inline_math": self.redo_inline_math,
                "html_tables_in_markdown": self.html_tables_in_markdown,
                "paginate_output": self.paginate_output,
            }

            llm_service = None
            if self.use_llm:
                llm_cfg = self.rag_config.get("llm", {})
                api_key = llm_cfg.get("api_key") or os.getenv("OPENAI_API_KEY", "omniroute-local")
                api_base = llm_cfg.get("api_base") or os.getenv("LLM_BASE_URL") or "http://127.0.0.1:20128/v1"
                model = llm_cfg.get("model") or os.getenv("DEFAULT_LLM_MODEL") or "cost-saver"

                config_dict["omniroute_api_key"] = api_key
                config_dict["omniroute_base_url"] = api_base
                config_dict["omniroute_model"] = model
                llm_service = OMNIROUTE_MARKER_SERVICE

                for env_var in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "LLM_SERVICE", "VLM_SERVICE"):
                    os.environ.pop(env_var, None)

            if self.device != "auto":
                os.environ["TORCH_DEVICE"] = self.device

            MarkerReader._converter = PdfConverter(
                config=config_dict,
                artifact_dict=create_model_dict(),
                llm_service=llm_service,
            )
        return MarkerReader._converter

    async def read(self, content_bytes: bytes, file_config: FileConfig, rag_config: dict[str, Any]) -> list[Document]:
        converter = self._get_converter()

        if not content_bytes:
            return [Document(
                file_id=file_config.file_id,
                content="",
                title=file_config.filename,
                source=file_config.source
            )]

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tf:
                tf.write(content_bytes)
                temp_path = tf.name

            try:
                rendered = converter(temp_path)
                full_text, _, _ = text_from_rendered(rendered)
            except Exception as e:
                logger.warning("Marker conversion with LLM failed, retrying without LLM: %s", e)
                config_dict = {
                    "output_format": "markdown",
                    "use_llm": False,
                    "force_ocr": self.force_ocr,
                    "redo_inline_math": self.redo_inline_math,
                    "html_tables_in_markdown": self.html_tables_in_markdown,
                    "paginate_output": self.paginate_output,
                }
                fallback_converter = PdfConverter(
                    config=config_dict,
                    artifact_dict=create_model_dict()
                )
                rendered = fallback_converter(temp_path)
                full_text, _, _ = text_from_rendered(rendered)
            
            return [Document(
                file_id=file_config.file_id,
                content=full_text,
                title=file_config.filename,
                source=file_config.source,
                labels=file_config.labels_json,
                metadata={
                    "extension": file_config.extension,
                    "file_size": file_config.file_size,
                    "engine": "marker",
                    "use_llm": self.use_llm,
                    "redo_inline_math": self.redo_inline_math
                }
            )]
        except Exception as e:
            logger.error("Marker conversion failed: %s", e)
            raise RuntimeError(f"Marker conversion failed: {e}") from e
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
