"""
Test Isolation Verification

This module verifies that tests do not depend on:
- Previous tests
- Shared state
- Database leftovers

Hidden dependencies make tests unreliable and order-dependent.
"""

import pytest
from typing import List, Dict, Any, Optional, Callable
import hashlib
import json
from collections import defaultdict


class TestIsolationChecker:
    """
    Checks for test isolation violations.
    
    Usage:
        checker = TestIsolationChecker()
        violations = checker.check_isolation("tests/unit/")
        assert not violations, f"Found isolation violations: {violations}"
    """
    
    # Anti-patterns that indicate shared state
    SHARED_STATE_PATTERNS = [
        "global ",
        "@pytest.fixture(scope=\"session\")",
        "@pytest.fixture(scope='session')",
        "singleton",
        "_instance",
        "shared_",
    ]
    
    # Database-related patterns that may leave leftovers
    DATABASE_PATTERNS = [
        "db.",
        "database.",
        "collection.",
        "table.",
        "insert ",
        "INSERT ",
        "create_",
        "delete_",
        "update_",
    ]
    
    # Setup/teardown patterns that indicate proper cleanup
    CLEANUP_PATTERNS = [
        "@pytest.fixture(autouse=True)",
        "setUp",
        "tearDown",
        "setup_method",
        "teardown_method",
        "cleanup",
        "rollback",
    ]
    
    def __init__(self, test_dir: str):
        self.test_dir = test_dir
        self.violations = []
        self.dependencies = defaultdict(list)
    
    def check_file_for_isolation_issues(self, test_file: str) -> List[Dict[str, Any]]:
        """
        Check a single test file for isolation issues.
        
        Args:
            test_file: Path to test file
            
        Returns:
            List of isolation violations
        """
        violations = []
        
        try:
            with open(test_file, 'r') as f:
                content = f.read()
                lines = content.split('\n')
        except Exception as e:
            return [{"file": test_file, "error": str(e)}]
        
        # Check for shared state patterns
        for i, line in enumerate(lines, 1):
            for pattern in self.SHARED_STATE_PATTERNS:
                if pattern in line:
                    violations.append({
                        "file": test_file,
                        "line": i,
                        "pattern": pattern,
                        "issue": "Potential shared state detected",
                        "severity": "WARNING",
                        "context": line.strip()
                    })
        
        # Check for database operations without cleanup
        has_db_ops = False
        has_cleanup = False
        
        for i, line in enumerate(lines, 1):
            for pattern in self.DATABASE_PATTERNS:
                if pattern in line:
                    has_db_ops = True
            for pattern in self.CLEANUP_PATTERNS:
                if pattern in line:
                    has_cleanup = True
        
        if has_db_ops and not has_cleanup:
            violations.append({
                "file": test_file,
                "issue": "Database operations without cleanup fixtures",
                "severity": "ERROR",
                "recommendation": "Add @pytest.fixture(autouse=True) or setUp/tearDown for cleanup"
            })
        
        return violations
    
    def check_test_order_dependency(self, test_files: List[str]) -> List[Dict[str, Any]]:
        """
        Check if tests depend on execution order.
        
        This is done by running tests in different orders and comparing results.
        
        Args:
            test_files: List of test files to check
            
        Returns:
            List of order dependency issues
        """
        import subprocess
        import random
        
        issues = []
        
        if len(test_files) < 2:
            return issues
        
        # Run tests in original order
        result1 = self._run_test_batch(test_files)
        
        # Run tests in reverse order
        result2 = self._run_test_batch(list(reversed(test_files)))
        
        # Compare results
        if result1["passed"] != result2["passed"]:
            issues.append({
                "issue": "Tests have order dependencies",
                "severity": "ERROR",
                "details": f"Original order: {result1['passed']}/{result1['total']} passed, "
                          f"Reverse order: {result2['passed']}/{result2['total']} passed",
                "recommendation": "Ensure tests are independent and don't share state"
            })
        
        return issues
    
    def _run_test_batch(self, test_files: List[str]) -> Dict[str, int]:
        """Run a batch of tests and return results."""
        import subprocess
        
        try:
            result = subprocess.run(
                ["python", "-m", "pytest"] + test_files + ["-v", "--tb=no", "-q"],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            # Parse results
            output = result.stdout + result.stderr
            passed = output.count(" passed")
            failed = output.count(" failed")
            
            return {
                "passed": passed,
                "failed": failed,
                "total": passed + failed,
                "returncode": result.returncode
            }
        except Exception as e:
            return {"passed": 0, "failed": 0, "total": 0, "error": str(e)}


class MockIsolationVerifier:
    """
    Verifies that mocks and patches are properly isolated.
    
    Ensures:
    - Mocks don't leak between tests
    - Patches are properly cleaned up
    - Mock objects are reset between uses
    """
    
    def __init__(self):
        self.issues = []
    
    def check_mock_usage(self, test_file: str) -> List[Dict[str, Any]]:
        """Check for proper mock isolation in a test file."""
        issues = []
        
        try:
            with open(test_file, 'r') as f:
                content = f.read()
                lines = content.split('\n')
        except Exception as e:
            return [{"file": test_file, "error": str(e)}]
        
        in_test_method = False
        has_patch = False
        has_context_manager = False
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Track if we're in a test
            if stripped.startswith("def test_") or stripped.startswith("async def test_"):
                in_test_method = True
                has_patch = False
                has_context_manager = False
            
            # Check for @patch decorator
            if "@patch(" in stripped:
                has_patch = True
            
            # Check for context manager usage
            if "with patch(" in stripped:
                has_context_manager = True
            
            # Check for mock/stub without cleanup
            if "mock" in stripped.lower() and in_test_method:
                if "patch" not in stripped and "Mock" not in stripped:
                    if not has_context_manager:
                        issues.append({
                            "file": test_file,
                            "line": i,
                            "issue": "Potential mock leak",
                            "context": stripped[:80],
                            "severity": "WARNING"
                        })
        
        return issues


# pytest fixtures
@pytest.fixture
def isolation_checker():
    """Provides a TestIsolationChecker instance."""
    return TestIsolationChecker


@pytest.fixture
def mock_verifier():
    """Provides a MockIsolationVerifier instance."""
    return MockIsolationVerifier


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "isolated: Mark test as requiring strict isolation"
    )
    config.addinivalue_line(
        "markers", "no_shared_state: Mark test that must not use shared state"
    )
