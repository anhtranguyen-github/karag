from app.core.rag.components.generators.openai_generator import OpenAIGenerator
from app.core.rag.managers.generator_manager import GeneratorManager
from app.core.rag.schemas import ChatMessage


def test_openai_generator_test_fallback():
    rag_config = {
        "llm": {
            "model": "gpt-4o-mini",
            "api_key": "",
            "api_base": "http://127.0.0.1:9",
            "temperature": 0.2,
            "max_tokens": 700,
        }
    }
    provider = OpenAIGenerator(rag_config)
    messages = [ChatMessage(role="user", content="Unit test ping")]
    completion = provider._chat_sync(messages)
    assert isinstance(completion.content, str)
    assert "[test] Echo: Unit test ping" == completion.content


def test_generator_manager_registry_and_validation():
    manager = GeneratorManager()
    assert "openai" in manager.available_components()

    rag_config = {
        "rag": {"generator": "openai"},
        "llm": {
            "model": "gpt-4o-mini",
            "api_key": "",
            "api_base": "http://127.0.0.1:9",
        },
    }
    generator = manager.resolve(rag_config)
    assert isinstance(generator, OpenAIGenerator)

    try:
        manager.resolve({"rag": {"generator": "missing"}, "llm": {}})
    except ValueError as exc:
        assert "not registered" in str(exc)
    else:
        raise AssertionError("Expected ValueError for unregistered generator")
