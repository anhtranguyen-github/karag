import json
from typing import Dict, Any

def parse_json_response(content: str) -> Dict[str, Any]:
    """Simple parser with cleaning."""
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:-3].strip()
    elif content.startswith("```"):
        content = content[3:-3].strip()
    
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Invalid JSON", "raw": content}

def test_parse_json_success():
    raw = '{"name": "test", "value": 123}'
    parsed = parse_json_response(raw)
    assert parsed["name"] == "test"
    assert parsed["value"] == 123

def test_parse_json_markdown():
    raw = '```json\n{"name": "test"}\n```'
    parsed = parse_json_response(raw)
    assert parsed["name"] == "test"

def test_parse_json_failure():
    raw = 'not a json'
    parsed = parse_json_response(raw)
    assert "error" in parsed
    assert parsed["raw"] == "not a json"
