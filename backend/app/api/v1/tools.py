from fastapi import APIRouter
from typing import List
from backend.app.tools.manager import tool_manager
from backend.app.tools.schemas import ToolDefinition

from backend.app.core.exceptions import ValidationError, NotFoundError, ConflictError

router = APIRouter(prefix="/tools", tags=["tools"])

@router.get("/", response_model=List[ToolDefinition])
async def list_tools():
    """List all available tools and their status."""
    return tool_manager.get_tool_definitions()

@router.post("/", response_model=ToolDefinition)
async def add_tool(tool: ToolDefinition):
    """Register a new tool (Custom/MCP)."""
    # Basic validation: ensure ID is unique
    if tool_manager.get_tool_definition(tool.id):
        raise ConflictError(f"Tool with ID '{tool.id}' already exists")
    return tool_manager.add_tool(tool)

@router.post("/{tool_id}/toggle", response_model=ToolDefinition)
async def toggle_tool(tool_id: str, enabled: bool):
    """Enable or disable a tool."""
    tool = tool_manager.toggle_tool(tool_id, enabled)
    if not tool:
        raise NotFoundError(f"Tool '{tool_id}' not found")
    return tool

@router.delete("/{tool_id}")
async def delete_tool(tool_id: str):
    """Delete a custom tool."""
    # Check if system tool
    tool = tool_manager.get_tool_definition(tool_id)
    if not tool:
        raise NotFoundError(f"Tool '{tool_id}' not found")
    if tool.type == "system":
        raise ValidationError("Cannot delete system protected tools")
    
    tool_manager.delete_tool(tool_id)
    return {"status": "success", "message": f"Tool {tool_id} deleted"}
