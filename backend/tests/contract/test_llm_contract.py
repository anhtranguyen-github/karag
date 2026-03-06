from pathlib import Path

import pytest
import yaml
from backend.app.providers.base import LLMResponse
from jsonschema import validate


def load_schema():
    schema_path = Path(__file__).parent / "llm_provider_schema.yaml"
    with open(schema_path) as f:
        return yaml.safe_load(f)


@pytest.mark.contract
def test_llm_response_schema():
    schema = load_schema()

    # Example response from our provider
    response = LLMResponse(
        content="Hello world",
        model="gpt-4o",
        provider="openai",
        usage={"input_tokens": 5, "output_tokens": 2},
        metadata={"model": "gpt-4o"},
    )

    # Validate against schema
    validate(instance=response.model_dump(), schema=schema["llm_response"])


@pytest.mark.contract
def test_llm_request_schema():
    schema = load_schema()

    request = {
        "messages": [
            {"role": "system", "content": "You are helpful"},
            {"role": "user", "content": "Hi"},
        ],
        "temperature": 0.7,
    }

    validate(instance=request, schema=schema["llm_request"])
