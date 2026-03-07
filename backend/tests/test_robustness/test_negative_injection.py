"""
Negative Test Injection Framework

This module provides utilities for injecting negative test scenarios
to verify that APIs properly reject invalid inputs and edge cases.
"""

import random
from typing import Any

import pytest


class NegativeTestInjector:
    """
    Generates negative test cases for API endpoints.

    Usage:
        injector = NegativeTestInjector()
        invalid_payloads = injector.generate_invalid_payloads(valid_payload)
    """

    def __init__(self):
        self.fuzz_chars = [
            "",  # Empty string
            "   ",  # Whitespace
            "\x00",  # Null byte
            "<script>alert('xss')</script>",  # XSS attempt
            "' OR '1'='1",  # SQL injection attempt
            "../",  # Path traversal
            "A" * 10000,  # Very long string
            "🎉🔥💀",  # Emojis
            "\n\r\t",  # Special characters
            "null",
            "undefined",
            "None",  # Type confusion
        ]

    def generate_invalid_payloads(self, valid_payload: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Generate variations of invalid payloads based on a valid payload.

        Returns:
            List of invalid payload dictionaries
        """
        invalid_payloads = []

        # Remove required fields one by one
        for key in valid_payload.keys():
            payload = valid_payload.copy()
            del payload[key]
            invalid_payloads.append(
                {
                    "description": f"Missing required field: {key}",
                    "payload": payload,
                    "expected_error": "validation_error",
                }
            )

        # Inject fuzz values into each field
        for key in valid_payload.keys():
            for fuzz in self.fuzz_chars:
                payload = valid_payload.copy()
                payload[key] = fuzz
                invalid_payloads.append(
                    {
                        "description": f"Invalid value for {key}: {repr(fuzz[:50])}...",
                        "payload": payload,
                        "expected_error": "validation_error",
                    }
                )

        # Wrong types
        for key in valid_payload.keys():
            for wrong_type in [123, True, [], {}, None]:
                payload = valid_payload.copy()
                payload[key] = wrong_type
                invalid_payloads.append(
                    {
                        "description": f"Wrong type for {key}: {type(wrong_type).__name__}",
                        "payload": payload,
                        "expected_error": "type_error",
                    }
                )

        return invalid_payloads

    def generate_edge_cases(self, field_type: str) -> list[Any]:
        """
        Generate edge case values for specific field types.

        Args:
            field_type: Type of field (string, int, email, uuid, etc.)

        Returns:
            List of edge case values
        """
        edge_cases = {
            "string": [
                "",
                "a",
                "A" * 10000,
                "\x00",
                "\n",
                " ",
                "  ",
                "<>",
                "'\"",
                "\\",
                "/",
                "//",
                "///",
            ],
            "int": [
                0,
                -1,
                -999999,
                1,
                999999,
                2147483647,
                -2147483648,
                999999999999999999,
                0.1,
                -0.1,
                float("inf"),
                float("-inf"),
            ],
            "email": [
                "",
                "not-an-email",
                "@nodomain.com",
                "spaces in@email.com",
                "<script>@test.com",
                "a@b.c",
                "very.long.email.address@example.domain.com",
            ],
            "uuid": [
                "",
                "not-a-uuid",
                "123",
                "550e8400-e29b-41d4-a716-44665544000",  # Missing char
                "550e8400-e29b-41d4-a716-446655440000g",  # Invalid char
                "g550e8400-e29b-41d4-a716-446655440000",  # Invalid char at start
            ],
            "url": [
                "",
                "not-a-url",
                "http://",
                "https://",
                "ftp://invalid",
                "javascript:alert(1)",
                "//example.com",
                "/local/path",
            ],
        }
        return edge_cases.get(field_type, [])


class ContractViolationSimulator:
    """
    Simulates REST API contract violations to test response validation.
    """

    @staticmethod
    def remove_required_fields(response_schema: dict[str, Any]) -> dict[str, Any]:
        """Simulate missing required fields in response."""
        if "required" in response_schema:
            modified = response_schema.copy()
            del modified["required"]
            return modified
        return response_schema

    @staticmethod
    def alter_response_types(response_schema: dict[str, Any]) -> dict[str, Any]:
        """Simulate wrong types in response."""
        modified = response_schema.copy()
        if "properties" in modified:
            for prop in modified["properties"]:
                if modified["properties"][prop].get("type") == "string":
                    modified["properties"][prop]["type"] = "integer"
                elif modified["properties"][prop].get("type") == "integer":
                    modified["properties"][prop]["type"] = "string"
        return modified

    @staticmethod
    def change_status_codes(valid_codes: list[int]) -> list[int]:
        """Return different status codes to test error handling."""
        wrong_codes = [404, 500, 502, 503, 504]
        return random.sample(wrong_codes, min(2, len(wrong_codes)))


class AssertionStrengthChecker:
    """
    Checks test assertions for weakness.

    Flags tests that only check:
    - HTTP status codes
    - Response existence
    - Superficial fields

    Requires tests to validate:
    - Response structure
    - Semantic correctness
    - Business logic outcomes
    """

    WEAK_PATTERNS = [
        "assert response.status_code == 200",
        "assert response is not None",
        "assert len(response) > 0",
        "assert response",
    ]

    STRONG_PATTERNS = [
        "assert response.data",
        "assert response.json()[",
        "assert result == expected",
        "assert isinstance(",
        "assert all(",
    ]

    @classmethod
    def check_assertion_strength(cls, test_source: str) -> dict[str, Any]:
        """
        Analyze test source code for assertion strength.

        Returns:
            Dict with strength score and recommendations
        """
        weak_count = sum(1 for pattern in cls.WEAK_PATTERNS if pattern in test_source)
        strong_count = sum(1 for pattern in cls.STRONG_PATTERNS if pattern in test_source)

        # Calculate score
        total_assertions = weak_count + strong_count
        if total_assertions == 0:
            return {
                "score": 0,
                "strength": "NO_ASSERTIONS",
                "recommendations": ["Add meaningful assertions to this test"],
            }

        score = (strong_count / total_assertions) * 100

        recommendations = []
        if weak_count > 0:
            recommendations.append(f"Replace {weak_count} weak assertion(s) with specific value checks")
        if "assert True" in test_source:
            recommendations.append("Remove assert True - it always passes")

        return {
            "score": score,
            "strength": "STRONG" if score >= 70 else "MODERATE" if score >= 40 else "WEAK",
            "weak_count": weak_count,
            "strong_count": strong_count,
            "recommendations": recommendations,
        }


# Fixtures for use in tests
@pytest.fixture
def negative_injector():
    """Provides a NegativeTestInjector instance."""
    return NegativeTestInjector()


@pytest.fixture
def contract_simulator():
    """Provides a ContractViolationSimulator instance."""
    return ContractViolationSimulator()
