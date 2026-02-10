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
    await mgr.update_settings({"llm_provider": "anthropic", "retrieval_mode": "vector"})
    
    # Re-init manager to check disk persistence
    mgr2 = SettingsManager(config_path=test_path)
    settings2 = await mgr2.get_settings()
    assert settings2.llm_provider == "anthropic"
    assert settings2.retrieval_mode == "vector"
    
    print("Settings persistence test passed!")
    if os.path.exists(test_path):
        os.remove(test_path)
