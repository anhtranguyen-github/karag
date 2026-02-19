from pydantic import BaseModel, Field, computed_field
from typing import List, Literal, Union, Annotated, Optional


class BaseGenerationConfig(BaseModel):
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=1.0, ge=0.0, le=1.0)
    max_output_tokens: int = Field(default=2048, ge=1, le=128000)
    streaming: bool = True
    stop_sequences: List[str] = Field(default_factory=list)


class OpenAIGenerationConfig(BaseGenerationConfig):
    provider: Literal["openai"] = "openai"
    model: Literal["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4.1"] = "gpt-4o-mini"
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)


class AzureOpenAIGenerationConfig(BaseGenerationConfig):
    provider: Literal["azure"] = "azure"
    model: Literal["gpt-4", "gpt-4o"] = "gpt-4o"
    deployment_name: str
    api_version: str = "2024-02-15-preview"
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0)


class LlamaGenerationConfig(BaseGenerationConfig):
    provider: Literal["llama"] = "llama"
    model: Literal["llama-3-8b-instruct", "llama-3-70b-instruct"] = (
        "llama-3-8b-instruct"
    )
    top_k: int = Field(default=40, ge=1, le=100)
    repeat_penalty: float = Field(default=1.1, ge=0.0, le=2.0)
    device: Literal["cpu", "cuda", "mps"] = "cpu"
    quantization: Literal["fp16", "int8", "int4"] = "fp16"

    @computed_field
    @property
    def context_window(self) -> int:
        return 8192 if "8b" in self.model else 32768


class CDP2GenerationConfig(BaseGenerationConfig):
    provider: Literal["cdp2"] = "cdp2"
    model: Literal["cdp2-llm-base", "cdp2-llm-large"] = "cdp2-llm-base"
    top_k: int = Field(default=40, ge=1, le=100)
    repeat_penalty: float = Field(default=1.1, ge=0.0, le=2.0)
    checkpoint_path: Optional[str] = None


class VLMGenerationConfig(BaseGenerationConfig):
    provider: Literal["vlm"] = "vlm"
    model: Literal["llava-1.6", "llava-next", "gpt-4o"] = "gpt-4o"
    input_modalities: Literal["text", "image", "both"] = "both"
    image_max_resolution: int = Field(default=1024, ge=256, le=2048)


GenerationConfig = Annotated[
    Union[
        OpenAIGenerationConfig,
        AzureOpenAIGenerationConfig,
        LlamaGenerationConfig,
        CDP2GenerationConfig,
        VLMGenerationConfig,
    ],
    Field(discriminator="provider"),
]
