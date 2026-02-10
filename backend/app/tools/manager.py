import os
import json
import structlog
from typing import List, Optional
from langchain_core.tools import BaseTool
from langchain_community.tools.tavily_search import TavilySearchResults

from backend.app.tools.local_tools import calculator
from backend.app.tools.schemas import ToolDefinition

logger = structlog.get_logger(__name__)

DATA_FILE = "backend/data/tools.json"

class ToolManager:
    def __init__(self):
        self._tools: List[ToolDefinition] = []
        self._ensure_data_file()
        self.load_tools()
        self._sync_system_tools()

    def _ensure_data_file(self):
        if not os.path.exists(os.path.dirname(DATA_FILE)):
            os.makedirs(os.path.dirname(DATA_FILE))
        if not os.path.exists(DATA_FILE):
            with open(DATA_FILE, "w") as f:
                json.dump([], f)

    def load_tools(self):
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
                self._tools = [ToolDefinition(**item) for item in data]
        except Exception as e:
            logger.error("tools_load_failed", error=str(e))
            self._tools = []

    def save_tools(self):
        try:
            with open(DATA_FILE, "w") as f:
                data = [t.model_dump() for t in self._tools]
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error("tools_save_failed", error=str(e))

    def _sync_system_tools(self):
        """Ensure system tools (calculator, tavily) exist in the config."""
        system_tools = [
            {
                "id": "calculator",
                "name": "calculator",
                "description": "Evaluate a mathematical expression safely.",
                "type": "system"
            }
        ]
        
        if os.getenv("TAVILY_API_KEY"):
            system_tools.append({
                "id": "tavily_search",
                "name": "tavily_search",
                "description": "Search the web using Tavily.",
                "type": "system"
            })

        changed = False
        existing_ids = {t.id for t in self._tools}
        
        for st in system_tools:
            if st["id"] not in existing_ids:
                logger.info("system_tool_added", tool=st['name'])
                self._tools.append(ToolDefinition(**st))
                changed = True
        
        if changed:
            self.save_tools()

    def get_tool_definitions(self) -> List[ToolDefinition]:
        return self._tools

    def get_tool_definition(self, tool_id: str) -> Optional[ToolDefinition]:
        for t in self._tools:
            if t.id == tool_id:
                return t
        return None

    def toggle_tool(self, tool_id: str, enabled: bool):
        tool = self.get_tool_definition(tool_id)
        if tool:
            tool.enabled = enabled
            self.save_tools()
            return tool
        return None
    
    def add_tool(self, tool: ToolDefinition):
        self._tools.append(tool)
        self.save_tools()
        return tool

    def delete_tool(self, tool_id: str):
        self._tools = [t for t in self._tools if t.id != tool_id]
        self.save_tools()

    def get_active_tools(self) -> List[BaseTool]:
        """Instantiate and return enabled tools."""
        active_tools = []
        for t in self._tools:
            if not t.enabled:
                continue
            
            if t.id == "calculator":
                active_tools.append(calculator)
            elif t.id == "tavily_search" and os.getenv("TAVILY_API_KEY"):
                active_tools.append(TavilySearchResults(max_results=3))
            # Future: Handle 'custom' and 'mcp' types here
        
        return active_tools

tool_manager = ToolManager()
