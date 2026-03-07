import os

import pytest
from src.backend.app.providers.llm import get_llm


@pytest.mark.canary
@pytest.mark.asyncio
async def test_real_openai_smoke():
    """
    This test actually calls the real provider.
    It should only be run manually or in a nightly pipeline.
    """
    if not os.getenv("ALLOW_REAL_LLM") == "true":
        pytest.skip("ALLOW_REAL_LLM not set to true")

    if not os.getenv("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not found")

    # Force OpenAI provider for this test
    # This assumes we have a way to override settings or it's already configured
    llm = await get_llm()

    # We use a very simple and cheap call
    try:
        response = await llm.generate_chat(messages=[{"role": "user", "content": "Say 'ok'"}], max_tokens=5)
        assert "ok" in response.content.lower()
    except Exception as e:
        pytest.fail(f"Real LLM call failed: {str(e)}")

