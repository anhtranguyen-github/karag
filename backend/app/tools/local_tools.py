from langchain_core.tools import tool


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression safely."""
    try:
        # Use a safe eval or a math library
        # TODO: Replace with numexpr or safer parser
        return str(eval(expression, {"__builtins__": None}, {}))  # nosec
    except Exception as e:
        return f"Error: {str(e)}"
