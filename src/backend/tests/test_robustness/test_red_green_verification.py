"""
Red-Green Verification Loop

This module implements the Red-Green verification cycle that ensures
tests can actually fail when the system is wrong.

The process:
1. Introduce a controlled failure
2. Confirm tests fail (RED phase)
3. Restore correct implementation
4. Confirm tests pass (GREEN phase)

If tests don't fail during RED phase, they are invalid.
"""

import subprocess
import sys
from pathlib import Path

import pytest


class RedGreenVerifier:
    """
    Verifies that tests follow the Red-Green cycle.

    Usage:
        verifier = RedGreenVerifier("tests/unit/test_example.py")
        result = verifier.verify_red_green_cycle()
        assert result.valid, "Tests do not properly fail on bugs"
    """

    # Mutations that should cause tests to fail
    CONTROLLED_FAILURES = [
        ("==", "!="),  # Equality to inequality
        ("!=", "=="),  # Inequality to equality
        (">=", "<"),  # Greater-equal to less
        ("<=", ">"),  # Less-equal to greater
        ("and", "or"),  # And to or
        ("or", "and"),  # Or to and
        ("True", "False"),  # True to False
        ("False", "True"),  # False to True
        ("return True", "return False"),
        ("return False", "return True"),
        ("+ 1", "- 1"),  # Arithmetic
        ("- 1", "+ 1"),
        ("* 2", "/ 2"),
        ("/ 2", "* 2"),
    ]

    def __init__(self, test_file: str, source_file: str | None = None):
        """
        Initialize verifier.

        Args:
            test_file: Path to test file
            source_file: Path to source file being tested (auto-detected if None)
        """
        self.test_file = Path(test_file)
        self.source_file = source_file
        self.red_phase_passed = False
        self.green_phase_passed = False
        self.mutations_tested = []

    def verify_red_green_cycle(self) -> "RedGreenResult":
        """
        Execute the full Red-Green verification cycle.

        Returns:
            RedGreenResult with validation status
        """
        results = []

        # Try each controlled failure
        for original, mutation in self.CONTROLLED_FAILURES:
            result = self._try_mutation(original, mutation)
            results.append(result)

            if result.red_phase_passed and result.green_phase_passed:
                return RedGreenResult(
                    valid=True,
                    message=f"Red-Green cycle verified with mutation: {original} -> {mutation}",
                    mutation=f"{original} -> {mutation}",
                    details=results,
                )

        # If no mutation caused tests to fail, tests are invalid
        return RedGreenResult(
            valid=False,
            message="Tests did not fail for any controlled mutation. Tests may be weak.",
            mutation=None,
            details=results,
        )

    def _try_mutation(self, original: str, mutation: str) -> "MutationResult":
        """
        Try a specific mutation and verify Red-Green cycle.

        Args:
            original: Original code string
            mutation: Mutated code string

        Returns:
            MutationResult with phase outcomes
        """
        # Read source file
        if not self.source_file:
            # Auto-detect based on test file name
            self.source_file = self._detect_source_file()

        source_path = Path(self.source_file)
        if not source_path.exists():
            return MutationResult(
                mutation=f"{original} -> {mutation}",
                red_phase_passed=False,
                green_phase_passed=False,
                error=f"Source file not found: {source_path}",
            )

        original_source = source_path.read_text()

        # Check if mutation applies
        if original not in original_source:
            return MutationResult(
                mutation=f"{original} -> {mutation}",
                red_phase_passed=False,
                green_phase_passed=False,
                error="Mutation pattern not found in source",
            )

        # Apply mutation
        mutated_source = original_source.replace(original, mutation, 1)

        # RED PHASE: Tests should fail with mutation
        source_path.write_text(mutated_source)
        red_result = self._run_tests()

        # GREEN PHASE: Tests should pass without mutation
        source_path.write_text(original_source)
        green_result = self._run_tests()

        return MutationResult(
            mutation=f"{original} -> {mutation}",
            red_phase_passed=not red_result,  # Tests should fail (return False)
            green_phase_passed=green_result,  # Tests should pass (return True)
            error=None,
        )

    def _run_tests(self) -> bool:
        """
        Run the test file and return True if tests pass.

        Returns:
            True if tests pass, False if they fail
        """
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", str(self.test_file), "-v", "--tb=no"],
                capture_output=True,
                text=True,
                timeout=60,
            )
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            return False
        except Exception:
            return False

    def _detect_source_file(self) -> str:
        """Auto-detect source file from test file name."""
        # test_module.py -> module.py
        test_name = self.test_file.stem
        if test_name.startswith("test_"):
            module_name = test_name[5:]
        else:
            module_name = test_name

        # Look in common locations
        possible_paths = [
            self.test_file.parent.parent / "app" / f"{module_name}.py",
            self.test_file.parent.parent / f"{module_name}.py",
        ]

        for path in possible_paths:
            if path.exists():
                return str(path)

        return str(possible_paths[0])  # Return first guess even if not found


class RedGreenResult:
    """Result of Red-Green verification."""

    def __init__(self, valid: bool, message: str, mutation: str | None, details: list):
        self.valid = valid
        self.message = message
        self.mutation = mutation
        self.details = details

    def __str__(self):
        status = "✓ VALID" if self.valid else "✗ INVALID"
        return f"{status}: {self.message}"


class MutationResult:
    """Result of a single mutation attempt."""

    def __init__(self, mutation: str, red_phase_passed: bool, green_phase_passed: bool, error: str | None):
        self.mutation = mutation
        self.red_phase_passed = red_phase_passed
        self.green_phase_passed = green_phase_passed
        self.error = error

    @property
    def valid_cycle(self) -> bool:
        """Returns True if both RED and GREEN phases passed."""
        return self.red_phase_passed and self.green_phase_passed


def verify_test_file(test_file: str, source_file: str | None = None) -> RedGreenResult:
    """
    Convenience function to verify a test file follows Red-Green cycle.

    Usage:
        result = verify_test_file("tests/unit/test_auth.py")
        assert result.valid, result.message
    """
    verifier = RedGreenVerifier(test_file, source_file)
    return verifier.verify_red_green_cycle()


# pytest integration


@pytest.fixture
def red_green_verifier():
    """Provides a RedGreenVerifier instance."""
    return RedGreenVerifier


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "red_green: Mark test for Red-Green verification")
