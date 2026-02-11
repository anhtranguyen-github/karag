from fastapi import APIRouter
from typing import List
from backend.app.tools.manager import tool_manager
from backend.app.tools.schemas import ToolDefinition

from backend.app.core.exceptions import ValidationError, NotFoundError, ConflictError
from backend.app.schemas.base import AppResponse

router = APIRouter(prefix="/tools", tags=["tools"])

@router.get("/", response_model=List[ToolDefinition])
async def list_tools():
    """List all available tools and their status."""
    return tool_manager.get_tool_definitions()

@router.post("/")
async def add_tool(tool: ToolDefinition):
    """Register a new tool (Custom/MCP)."""
    # Basic validation: ensure ID is unique
    if tool_manager.get_tool_definition(tool.id):
        return AppResponse.business_failure(
            code="DUPLICATE_TOOL",
            message=f"Tool with ID '{tool.id}' already exists"
        )
    result = tool_manager.add_tool(tool)
    return AppResponse.success_response(data=result, message=f"Tool '{tool.id}' registered")

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
        return AppResponse.business_failure(
            code="PROTECTED_TOOL",
            message="Cannot delete system protected tools"
        )
    
    tool_manager.delete_tool(tool_id)
    return AppResponse(
        code="TOOL_DELETED",
        message=f"Tool {tool_id} deleted"
    )
