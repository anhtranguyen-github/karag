import pytest
import os
from backend.app.core.settings_manager import SettingsManager
from backend.app.core.schemas import AppSettings

@pytest.mark.asyncio
async def test_settings_persistence():
    test_path = os.path.join(os.getcwd(), "backend/data/test_settings.json")
    if os.path.exists(test_path):
        os.remove(test_path)
        
    mgr = SettingsManager(config_path=test_path)
    
    # Check default
    settings = await mgr.get_settings()
    assert settings.llm_provider == "openai"
    
    # Update
    await mgr.update_settings({"llm_provider": "anthropic", "search_limit": 10})
    
    # Re-init manager to check disk persistence
    mgr2 = SettingsManager(config_path=test_path)
    settings2 = await mgr2.get_settings()
    assert settings2.llm_provider == "anthropic"
    assert settings2.search_limit == 10
    
    print("Settings persistence test passed!")
    if os.path.exists(test_path):
        os.remove(test_path)

@pytest.mark.asyncio
async def test_settings_metadata():
    mgr = SettingsManager()
    metadata = mgr.get_settings_metadata()
    
    assert "llm_provider" in metadata
    assert "options" in metadata["llm_provider"]
    assert "openai" in metadata["llm_provider"]["options"]
    assert "ollama" in metadata["llm_provider"]["options"]
    
    assert "embedding_provider" in metadata
    assert "options" in metadata["embedding_provider"]
    assert "openai" in metadata["embedding_provider"]["options"]
    assert "local" in metadata["embedding_provider"]["options"]
    
    # Non-literal fields should not have options
    assert "search_limit" in metadata
    assert "options" not in metadata["search_limit"]

@pytest.mark.asyncio
async def test_invalid_settings_update():
    from backend.app.core.exceptions import ValidationError
    mgr = SettingsManager()
    
    # Test invalid literal value
    with pytest.raises(ValidationError) as excinfo:
        await mgr.update_settings({"llm_provider": "invalid-provider"})
    assert "Invalid settings configuration" in str(excinfo.value)
    
    # Test invalid type for numeric field
    with pytest.raises(ValidationError) as excinfo:
        await mgr.update_settings({"search_limit": "not-a-number"})
    assert "Invalid settings configuration" in str(excinfo.value)


