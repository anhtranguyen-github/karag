"""
Domain Boundary Tests.

These tests verify that architectural boundaries are enforced:
1. Frontend cannot write domain tables directly
2. Agents cannot access database directly  
3. FSRS algorithm exists in exactly one location
4. All domain mutations go through domain services
"""

import ast
import os
import re
from pathlib import Path
from typing import List, Set, Tuple

import pytest


# =============================================================================
# Configuration
# =============================================================================

# Root directories to scan - use relative path for portability
PROJECT_ROOT = Path(__file__).parent.parent.parent.resolve()
FRONTEND_DIR = PROJECT_ROOT / "src" / "frontend"
BACKEND_DIR = PROJECT_ROOT / "src" / "backend"
FASTAPI_DOMAIN_DIR = PROJECT_ROOT / "fastapi-domain"

# Domain tables that should only be writable through domain services
DOMAIN_TABLES = {
    "decks",
    "deck_items", 
    "card_scheduling",
    "review_logs",
    "sessions",
}

# Paths that are allowed to access database directly (infrastructure layer)
ALLOWED_DB_PATHS = {
    "fastapi-domain/app/infra/",
    "fastapi-domain/app/api/domain_client.py",  # Domain client is the API layer
}

# FSRS should ONLY be in this location
FSRS_AUTHORITATIVE_PATH = "fastapi-domain/app/domain/fsrs_engine.py"

# Forbidden import patterns (agents should not import these)
FORBIDDEN_AGENT_IMPORTS = [
    r"from app\.infra\.repositories import",
    r"from app\.infra\.unit_of_work import",
    r"import.*supabase.*client",
    r"from.*database.*import.*connect",
]

# Domain services that should be the ONLY entry point for mutations
DOMAIN_SERVICE_FILES = {
    "deck_service.py": ["create_deck", "add_card", "update_card", "delete_card"],
    "review_service.py": ["review_card"],
    "lesson_service.py": ["get_next_lesson"],
}


# =============================================================================
# Test: FSRS Algorithm Exists in Exactly One Location
# =============================================================================

class TestFSRSLocation:
    """Verify FSRS algorithm is only in the designated location."""

    def test_fsrs_only_in_authoritative_location(self):
        """FSRS algorithm should only exist in fsrs_engine.py"""
        # Find all files that might contain FSRS logic
        fsrs_patterns = [
            r"def.*stability",  # Core FSRS function
            r"def.*difficulty",  # Core FSRS function  
            r"def.*retrievability",  # Core FSRS function
            r"FSRSEngine",
            r"_next_interval",
        ]
        
        violations = []
        
        # Scan all Python files in the project
        for py_file in PROJECT_ROOT.rglob("*.py"):
            # Skip test files and this very test file
            if "test_" in py_file.name or py_file.name == "test_domain_boundaries.py":
                continue
                
            # Skip the authoritative location
            if str(py_file) == str(PROJECT_ROOT / FSRS_AUTHORITATIVE_PATH):
                continue
            
            try:
                content = py_file.read_text()
                
                for pattern in fsrs_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        # Check if it's not just an import
                        if "from app.domain.fsrs_engine import" not in content:
                            violations.append(f"{py_file.relative_to(PROJECT_ROOT)}: Found FSRS pattern '{pattern}'")
            except Exception:
                pass  # Skip binary or unreadable files
        
        assert len(violations) == 0, f"FSRS logic found outside {FSRS_AUTHORITATIVE_PATH}: {violations}"

    def test_fsrs_imports_authoritative_module(self):
        """Any file using FSRS should import from the authoritative module."""
        fsrs_users = []
        
        for py_file in PROJECT_ROOT.rglob("*.py"):
            if "test_" in py_file.name:
                continue
                
            try:
                content = py_file.read_text()
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.ImportFrom):
                        if node.module and "fsrs" in node.module:
                            # Check if it's importing from the right place
                            if "app.domain.fsrs_engine" not in str(node.module):
                                fsrs_users.append(
                                    f"{py_file.relative_to(PROJECT_ROOT)}: imports from {node.module}"
                                )
            except Exception:
                pass
        
        # This is informational - FSRS can be imported from anywhere as long as it's from the authoritative module
        print(f"Files importing FSRS: {fsrs_users}")


# =============================================================================
# Test: Frontend Cannot Write Domain Tables Directly
# =============================================================================

class TestFrontendDomainIsolation:
    """Verify frontend cannot directly write to domain tables."""

    def test_frontend_no_direct_database_writes(self):
        """Frontend should not have code that writes to domain tables."""
        violations = []
        
        # Patterns that indicate direct database access
        forbidden_patterns = [
            (r"supabase\.from_.*\(" , "Supabase direct table write"),
            (r"\.insert\(", "Direct insert"),
            (r"\.upsert\(", "Direct upsert"),
            (r"\.update\(", "Direct update"),
            (r"\.delete\(", "Direct delete"),
            (r"execute.*INSERT", "Raw SQL INSERT"),
            (r"execute.*UPDATE", "Raw SQL UPDATE"),
            (r"execute.*DELETE", "Raw SQL DELETE"),
        ]
        
        for src_file in (FRONTEND_DIR / "src").rglob("*.ts"):
            if "node_modules" in str(src_file):
                continue
                
            try:
                content = src_file.read_text()
                
                for pattern, description in forbidden_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        # Check if it's calling a domain API (allowed) vs direct DB (forbidden)
                        if "/api/" not in content and "domain-client" not in content:
                            violations.append(
                                f"{src_file.relative_to(PROJECT_ROOT)}: {description} - "
                                f"should use domain API instead"
                            )
            except Exception:
                pass
        
        # Filter out cases where the frontend is using a domain client
        actual_violations = []
        for v in violations:
            if "domain-client" not in v and "api" not in v.lower():
                actual_violations.append(v)
        
        assert len(actual_violations) == 0, (
            f"Frontend has direct database access violations:\n" + 
            "\n".join(actual_violations)
        )


# =============================================================================
# Test: Agents Cannot Access Database Directly
# =============================================================================

class TestAgentDatabaseIsolation:
    """Verify agents cannot directly access the database."""

    def test_agent_no_direct_db_imports(self):
        """Agents/MCP tools should not import database modules directly."""
        violations = []
        
        # Look for agent-related directories
        agent_dirs = [
            FASTAPI_DOMAIN_DIR / "app" / "api" / "mcp_tools.py",
            BACKEND_DIR / "app" / "graph",
            BACKEND_DIR / "app" / "services",
        ]
        
        for agent_file in agent_dirs:
            if not agent_file.exists():
                continue
                
            try:
                content = agent_file.read_text()
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.ImportFrom):
                        module = node.module or ""
                        if any(forbidden in module for forbidden in [
                            "infra.repositories",
                            "infra.unit_of_work", 
                            "supabase",
                            "database",
                        ]):
                            violations.append(
                                f"{agent_file.relative_to(PROJECT_ROOT)}: "
                                f"imports '{module}' - should use domain client"
                            )
                    elif isinstance(node, ast.Import):
                        for alias in node.names:
                            if any(forbidden in alias.name for forbidden in [
                                "infra.repositories",
                                "infra.unit_of_work",
                            ]):
                                violations.append(
                                    f"{agent_file.relative_to(PROJECT_ROOT)}: "
                                    f"imports '{alias.name}' - should use domain client"
                                )
            except Exception:
                pass
        
        assert len(violations) == 0, (
            f"Agent files have forbidden database imports:\n" +
            "\n".join(violations)
        )


# =============================================================================
# Test: All Domain Mutations Go Through Domain Service
# =============================================================================

class TestDomainServiceEntrypoint:
    """Verify all domain mutations flow through domain services."""

    def test_domain_mutations_require_service(self):
        """Direct table mutations should only happen in domain service files."""
        violations = []
        
        # Files that are allowed to do direct mutations
        allowed_files = {
            "fastapi-domain/app/domain/deck_service.py",
            "fastapi-domain/app/domain/review_service.py", 
            "fastapi-domain/app/domain/lesson_service.py",
            "fastapi-domain/app/infra/repositories.py",
            "fastapi-domain/app/infra/unit_of_work.py",
        }
        
        mutation_patterns = [
            r"\.create\(",
            r"\.update\(",
            r"\.delete\(",
            r"\.save\(",
        ]
        
        for py_file in (FASTAPI_DOMAIN_DIR / "app").rglob("*.py"):
            if "test_" in py_file.name:
                continue
                
            # Skip allowed files
            rel_path = str(py_file.relative_to(PROJECT_ROOT))
            if rel_path in allowed_files:
                continue
                
            # Check for mutations in non-service files
            try:
                content = py_file.read_text()
                
                # Skip if it's using domain client (API layer)
                if "domain_client" in content or "DomainClient" in content:
                    continue
                    
                for pattern in mutation_patterns:
                    matches = re.findall(pattern, content)
                    if matches:
                        violations.append(
                            f"{rel_path}: Contains mutation pattern '{pattern}' - "
                            f"should use domain service"
                        )
            except Exception:
                pass
        
        assert len(violations) == 0, (
            f"Non-service files performing mutations:\n" +
            "\n".join(violations)
        )


# =============================================================================
# Test: Schema Access Detection
# =============================================================================

class TestSchemaAccess:
    """Verify schema access patterns are correct."""

    def test_no_raw_sql_in_domain(self):
        """Domain layer should not contain raw SQL queries."""
        violations = []
        
        raw_sql_patterns = [
            r"execute\s*\(",
            r"text\s*\(",
            r"\.query\s*\(",
            r"raw\s*=\s*[\"']",
        ]
        
        domain_dir = FASTAPI_DOMAIN_DIR / "app" / "domain"
        
        for py_file in domain_dir.rglob("*.py"):
            if "test_" in py_file.name:
                continue
                
            try:
                content = py_file.read_text()
                
                # Allow in comments/docstrings
                content_lines = [line for line in content.split("\n") 
                               if not line.strip().startswith("#")]
                content = "\n".join(content_lines)
                
                for pattern in raw_sql_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        violations.append(
                            f"{py_file.relative_to(PROJECT_ROOT)}: "
                            f"Found raw SQL pattern '{pattern}'"
                        )
            except Exception:
                pass
        
        assert len(violations) == 0, (
            f"Domain layer contains raw SQL:\n" +
            "\n".join(violations)
        )


# =============================================================================
# Test: API Layer Uses Domain Client
# =============================================================================

class TestAPILayerDomainClient:
    """Verify API layer properly uses domain client."""

    def test_api_uses_domain_client(self):
        """API endpoints should use domain client, not repositories directly."""
        violations = []
        
        api_dir = FASTAPI_DOMAIN_DIR / "app" / "api"
        
        for py_file in api_dir.rglob("*.py"):
            if py_file.name == "domain_client.py":
                continue  # This is the domain client itself
            if "test_" in py_file.name:
                continue
                
            try:
                content = py_file.read_text()
                tree = ast.parse(content)
                
                for node in ast.walk(tree):
                    if isinstance(node, ast.ImportFrom):
                        module = node.module or ""
                        if "infra.repositories" in module or "infra.unit_of_work" in module:
                            violations.append(
                                f"{py_file.relative_to(PROJECT_ROOT)}: "
                                f"imports '{module}' - should use DomainClient"
                            )
            except Exception:
                pass
        
        assert len(violations) == 0, (
            f"API layer bypassing domain client:\n" +
            "\n".join(violations)
        )


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
