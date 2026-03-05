#!/usr/bin/env python3
"""
Mock and Placeholder Data Scanner

Scans Python files to detect mock, fake, or placeholder data in production code.
Ignores: tests/, test_fixtures/, examples/, dev_tools/

Exit codes:
  0 - No violations found
  1 - Violations detected
"""

import ast
import re
import sys
from pathlib import Path

# Forbidden placeholder patterns
MOCK_DATA_PATTERNS = [
    # Common fake names
    r'\bJohn Doe\b',
    r'\bJane Doe\b',
    r'\bTest User\b',
    r'\bFoo Bar\b',
    r'\bLorem Ipsum\b',
    r'\bDummy\b',
    # Fake emails
    r'test@example\.com',
    r'admin@example\.com',
    r'example@example\.com',
    # Common test values
    r'\b123456\b',
    r'\babcdef\b',
    # Keywords
    r'\bmock data\b',
    r'\bfake data\b',
    r'\bdummy data\b',
    r'\bplaceholder\b',
    r'\btodo\b',  # in data context, not comments
    # Generic API keys / secrets placeholders
    r'YOUR_API_KEY',
    r'YOUR_SECRET',
    r'INSERT_KEY_HERE',
]

# Directories to ignore
IGNORE_DIRS = {
    "tests",
    "test_fixtures",
    "examples",
    "dev_tools",
    ".git",
    "node_modules",
    "__pycache__",
}


class MockDataVisitor(ast.NodeVisitor):
    """AST visitor to detect mock/placeholder data."""

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.violations = []
        self._in_docstring = False

    def visit_Constant(self, node):
        if isinstance(node.value, str):
            self._check_string(node.value, node.lineno)
        self.generic_visit(node)

    def visit_Str(self, node):
        # Python 3.7 compatibility
        self._check_string(node.s, node.s_lineno if hasattr(node, "s_lineno") else node.lineno)
        self.generic_visit(node)

    def visit_Docstring(self, node):
        # Don't flag docstrings - they can contain examples
        self._in_docstring = True
        self.generic_visit(node)
        self._in_docstring = False

    def _check_string(self, value: str, lineno: int):
        if not value or self._in_docstring:
            return

        for pattern in MOCK_DATA_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                # Truncate for display
                display_value = value[:60] + "..." if len(value) > 60 else value
                self.violations.append((lineno, display_value, pattern))
                break


def scan_file(file_path: Path) -> list:
    """Scan a single Python file for mock/placeholder data."""
    try:
        content = file_path.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=str(file_path))
    except (SyntaxError, UnicodeDecodeError):
        return []

    visitor = MockDataVisitor(str(file_path))
    visitor.visit(tree)
    return visitor.violations


def main():
    """Main entry point."""
    root = Path.cwd()
    violations_found = False

    # Find all Python files
    for py_file in root.rglob("*.py"):
        # Skip ignored directories
        if any(ignored in py_file.parts for ignored in IGNORE_DIRS):
            continue

        violations = scan_file(py_file)
        if violations:
            violations_found = True
            for lineno, value, pattern in violations:
                print(f"{py_file}:{lineno} Mock or placeholder data detected -> \"{value}\"")

    if violations_found:
        print("\n✗ Mock or placeholder data detected in production code!")
        sys.exit(1)
    else:
        print("✓ No mock or placeholder data detected")
        sys.exit(0)


if __name__ == "__main__":
    main()
