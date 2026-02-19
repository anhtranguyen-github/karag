from backend.app.tools.manager import tool_manager


def get_tools():
    """Return the list of active tools from the manager."""
    return tool_manager.get_active_tools()
