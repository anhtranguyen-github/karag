from __future__ import annotations

import base64
import json
from io import BytesIO
from typing import Annotated, List

import PIL
import requests
from pydantic import BaseModel

from marker.schema.blocks import Block
from marker.services import BaseService


class OmniRouteService(BaseService):
    omniroute_base_url: Annotated[
        str,
        "OpenAI-compatible OmniRoute base URL. No trailing slash.",
    ] = "http://127.0.0.1:20128/v1"
    omniroute_model: Annotated[
        str,
        "OmniRoute model name to use for Marker LLM processors.",
    ] = "cost-saver"
    omniroute_api_key: Annotated[
        str,
        "API key for OmniRoute's OpenAI-compatible endpoint.",
    ] = "omniroute-local"

    def _image_to_data_url(self, img: PIL.Image.Image) -> str:
        image_bytes = BytesIO()
        img.save(image_bytes, format="WEBP")
        encoded = base64.b64encode(image_bytes.getvalue()).decode("utf-8")
        return f"data:image/webp;base64,{encoded}"

    def _parse_response_content(self, content: str, response_schema: type[BaseModel]) -> dict:
        content = content.strip()
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        try:
            return response_schema.model_validate_json(content).model_dump()
        except Exception:
            return json.loads(content)

    def __call__(
        self,
        prompt: str,
        image: PIL.Image.Image | List[PIL.Image.Image],
        block: Block,
        response_schema: type[BaseModel],
        max_retries: int | None = None,
        timeout: int | None = None,
    ):
        if max_retries is None:
            max_retries = self.max_retries
        if timeout is None:
            timeout = self.timeout

        images = image if isinstance(image, list) else [image]

        system_prompt = (
            "Follow the user prompt exactly and return valid JSON only. "
            f"The JSON must match this schema: {json.dumps(response_schema.model_json_schema())}"
        )

        content = [{"type": "text", "text": prompt}]
        content.extend(
            {"type": "image_url", "image_url": {"url": self._image_to_data_url(img)}}
            for img in images
        )

        payload = {
            "model": self.omniroute_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0,
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.omniroute_api_key}",
        }
        url = f"{self.omniroute_base_url.rstrip('/')}/chat/completions"

        for attempt in range(max_retries):
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=timeout)
                response.raise_for_status()
                body = response.json()
                usage = body.get("usage", {})
                block.update_metadata(
                    llm_tokens_used=usage.get("total_tokens", 0),
                    llm_request_count=1,
                )
                message = body["choices"][0]["message"]["content"]
                return self._parse_response_content(message, response_schema)
            except Exception as exc:
                if attempt == max_retries - 1:
                    print(f"OmniRoute inference failed: {exc}")
                continue

        return {}
