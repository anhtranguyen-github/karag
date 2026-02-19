import pytest
from backend.app.core.prompt_manager import PromptManager
import yaml

@pytest.fixture
def temp_prompts(tmp_path):
    prompts = {
        "test_task": {
            "v1": {
                "system": "You are a helpful assistant names {name}.",
                "user": "Tell me about {topic}."
            }
        }
    }
    p = tmp_path / "prompts.yaml"
    with open(p, "w") as f:
        yaml.dump(prompts, f)
    return p

def test_prompt_loading_and_formatting(temp_prompts):
    pm = PromptManager(registry_path=temp_prompts)
    
    # Test retrieval
    system_template = pm.get_prompt("test_task.system", version="v1")
    assert "helpful assistant" in system_template
    
    # Test formatting
    formatted = pm.format_prompt(system_template, name="Antigravity")
    assert formatted == "You are a helpful assistant names Antigravity."

def test_missing_prompt():
    pm = PromptManager()
    assert pm.get_prompt("non_existent.key") is None
