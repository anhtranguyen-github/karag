#!/usr/bin/env python3
"""
Debug and Temporary Code Artifact Scanner

Scans Python files to detect debug print statements, temporary code, and other artifacts.
Ignores: tests/, test_fixtures/, examples/, dev_tools/

Exit codes:
  0 - No violations found
  1 - Violations detected
"""

import ast
import re
import sys
from pathlib import Path

# Forbidden debug patterns
DEBUG_PATTERNS = [
    # Print statements (not in tests)
    (r'\bprint\s*\(', "print() statement"),
    (r'\bpprint\s*\(', "pprint() statement"),
    (r'\bconsole\.log\b', "console.log statement"),
    # Debug imports
    (r'\bimport\s+pdb\b', "pdb import"),
    (r'\bimport\s+ipdb\b', "ipdb import"),
    (r'\bimport\s+debugpy\b', "debugpy import"),
    (r'\bfrom\s+ipdb\s+import\b', "ipdb import"),
    # Breakpoints
    (r'\bbreakpoint\s*\(', "breakpoint() call"),
    (r'\bpdb\.set_trace\s*\(', "pdb.set_trace() call"),
    (r'\bipdb\.set_trace\s*\(', "ipdb.set_trace() call"),
    # Temporary/quick fix markers in code (not comments)
    (r'""".*?temporary.*?"""', "temporary code block"),
    (r"'''.*?temporary.*?'''", "temporary code block"),
    (r'""".*?quick fix.*?"""', "quick fix code block"),
    (r"'''.*?quick fix.*?'''", "quick fix code block"),
    (r'""".*?hack.*?"""', "hack code block"),
    (r"'''.*?hack.*?'''", "hack code block"),
    # Debug variables
    (r'\bdebug\s*=\s*True', "debug=True flag"),
    (r'\bDEBUG\s*=\s*True', "DEBUG=True flag"),
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


class DebugArtifactVisitor(ast.NodeVisitor):
    """AST visitor to detect debug artifacts."""

    def __init__(self, file_path: str):
        self.file_path = file_path
        self.violations = []

    def visit_Call(self, node):
        # Check for print/pprint calls
        if isinstance(node.func, ast.Name):
            if node.func.id in ("print", "pprint"):
                self.violations.append((node.lineno, f"{node.func.id}() call"))
        elif isinstance(node.func, ast.Attribute):
            if node.func.attr in ("log", "debug", "trace"):
                if isinstance(node.func.value, ast.Name):
                    if node.func.value.id == "console":
                        self.violations.append((node.lineno, f"console.{node.func.attr}() call"))
        
        self.generic_visit(node)

    def visit_Import(self, node):
        for alias in node.names:
            if alias.name in ("pdb", "ipdb", "debugpy"):
                self.violations.append((node.lineno, f"import {alias.name}"))
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module in ("ipdb", "pdb", "debugpy"):
            self.violations.append((node.lineno, f"from {node.module} import"))
        self.generic_visit(node)

    def visit_Name(self, node):
        # Check for breakpoint
        if node.id == "breakpoint":
            self.violations.append((node.lineno, "breakpoint() call"))
        self.generic_visit(node)

    def visit_Assign(self, node):
        # Check for debug flags
        for target in node.targets:
            if isinstance(target, ast.Name):
                if target.id.lower() in ("debug", "debug_mode"):
                    if isinstance(node.value, ast.Constant) and node.value.value is True:
                        self.violations.append((node.lineno, f"{target.id}=True flag"))
        self.generic_visit(node)


def scan_file(file_path: Path) -> list:
    """Scan a single Python file for debug artifacts."""
    try:
        content = file_path.read_text(encoding="utf-8")
        tree = ast.parse(content, filename=str(file_path))
    except (SyntaxError, UnicodeDecodeError):
        return []

    visitor = DebugArtifactVisitor(str(file_path))
    visitor.visit(tree)

    # Also scan for pattern-based violations (docstrings, comments)
    for lineno, line in enumerate(content.splitlines(), 1):
        # Skip comment-only lines
        stripped = line.strip()
        if stripped.startswith("#"):
            continue

        for pattern, description in DEBUG_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                # Avoid duplicates
                if not any(v[0] == lineno for v in visitor.violations):
                    visitor.violations.append((lineno, description))

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
            for lineno, description in violations:
                print(f"{py_file}:{lineno} Debug artifact detected -> {description}")

    if violations_found:
        print("\n✗ Debug or temporary code detected in production!")
        sys.exit(1)
    else:
        print("✓ No debug artifacts detected")
        sys.exit(0)


if __name__ == "__main__":
    main()
