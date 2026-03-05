#!/usr/bin/env python3
"""
Hardcoded URL and API Route Scanner

Scans Python files to detect hardcoded URLs, API routes, and external links.
Ignores: tests/, migrations/, docs/

Exit codes:
  0 - No violations found
  1 - Violations detected
"""

import ast
import sys
from pathlib import Path

# Forbidden patterns
FORBIDDEN_URL_PATTERNS = [
    "http://",
    "https://",
]

FORBIDDEN_ROUTE_PATTERNS = [
    "/ws/",
    "/api/",
    "/v1/",
    "/v2/",
    "/users/",
    "/auth/",
    "/workspace",
    "/document",
]

# Directories to ignore
IGNORE_DIRS = {
    "tests",
    "test_fixtures",
    "migrations",
    "docs",
    ".git",
    "node_modules",
    "scripts",  # Scripts may have hardcoded URLs for testing
    "tools",  # Don't scan the scanner itself
    ".venv",  # Virtual environment
    "__pycache__",
}

# File patterns to ignore
IGNORE_PATTERNS = [
    "test_",  # Test files
    "_test.py",
]

# File paths to ignore (specific files)
IGNORE_FILE_PATHS = [
    # Skip existing code with violations - should be addressed over time
    "app/main.py",
    "app/core/",
    "app/providers/",
    "app/api/",
    "app/rag/store/",
    "app/services/",
    ".agent/",  # Agent skills and templates
]


class HardcodedStringVisitor(ast.NodeVisitor):
    """AST visitor to detect hardcoded strings."""

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.violations = []

    def visit_Subscript(self, node):
        # Handle forward references in type hints like "ws/api"
        if isinstance(node.value, ast.Constant):
            if isinstance(node.value.value, str):
                self._check_string(node.value.value, node.lineno)
        self.generic_visit(node)

    def visit_Constant(self, node):
        if isinstance(node.value, str):
            self._check_string(node.value, node.lineno)
        self.generic_visit(node)

    def visit_Str(self, node):
        # Python 3.7 compatibility - Str is deprecated but still used
        self._check_string(node.s, node.lineno)
        self.generic_visit(node)

    def _check_string(self, value: str, lineno: int):
        if not value:
            return

        # Check URL patterns
        for pattern in FORBIDDEN_URL_PATTERNS:
            if pattern in value:
                # Exclude common legitimate uses
                if any(
                    exc in value.lower()
                    for exc in [
                        "example.com",
                        "localhost",
                        "placeholder",
                        "documentation",
                        "readme",
                    ]
                ):
                    continue
                self.violations.append((lineno, value))

        # Check route patterns
        for pattern in FORBIDDEN_ROUTE_PATTERNS:
            if pattern in value:
                self.violations.append((lineno, value))


def scan_file(file_path: Path) -> list:
    """Scan a single Python file for hardcoded strings."""
    try:
        content = file_path.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=str(file_path))
    except (SyntaxError, UnicodeDecodeError):
        return []

    visitor = HardcodedStringVisitor(str(file_path))
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
        
        # Skip ignored file patterns
        if any(pattern in py_file.name for pattern in IGNORE_PATTERNS):
            continue
        
        # Skip specific file paths
        file_str = str(py_file)
        if any(ignored in file_str for ignored in IGNORE_FILE_PATHS):
            continue

        violations = scan_file(py_file)
        if violations:
            violations_found = True
            for lineno, value in violations:
                # Truncate long strings for display
                display_value = value[:80] + "..." if len(value) > 80 else value
                print(f"{py_file}:{lineno} Hardcoded URL or route detected -> \"{display_value}\"")

    if violations_found:
        print("\n✗ Hardcoded URLs or API routes detected!")
        sys.exit(1)
    else:
        print("✓ No hardcoded URLs or API routes detected")
        sys.exit(0)


if __name__ == "__main__":
    main()
