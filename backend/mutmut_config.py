"""
Mutmut Configuration for Python Mutation Testing

This configuration defines mutation testing rules for the backend codebase.
Mutation testing ensures tests actually validate behavior by introducing
small code changes and verifying tests fail.

Minimum mutation score: 80%
"""

import os

# Paths to mutate
paths_to_mutate = [
    "app/services/",
    "app/core/",
    "app/schemas/",
    "app/api/",
]

# Tests to run
tests_dir = "tests/"

# Files to exclude from mutation
excluded_files = [
    "app/main.py",  # Application entry point
    "app/core/config.py",  # Configuration
    "app/core/telemetry.py",  # Telemetry/logging
    "**/conftest.py",  # Test fixtures
]

# Mutation operators to apply
mutation_operators = [
    "AOR",  # Arithmetic Operator Replacement
    "ROR",  # Relational Operator Replacement
    "COR",  # Conditional Operator Replacement
    "SOR",  # Shift Operator Replacement
    "OROR",  # Logical Operator Replacement
    "ASR",  # Assignment Operator Replacement
    "UOI",  # Unary Operator Insertion
    "SDL",  # Statement Deletion
    "CDI",  # Constant Data Interpretation
]

# Coverage configuration
use_coverage = True

coverage_config = {
    "source": ["app"],
    "omit": [
        "*/tests/*",
        "*/test_*",
        "*/__pycache__/*",
        "app/main.py",
    ],
}

# Reporting
report_output = "mutmut_report.json"
html_report = "mutmut_html"


def pre_mutation_hook(context):
    """
    Hook called before each mutation.
    Can be used to skip certain mutations.
    """
    # Skip mutations in specific functions that are hard to test
    if context.current_source_line.strip().startswith("logger."):
        context.skip = True


def post_mutation_hook(context):
    """
    Hook called after each mutation.
    Can be used for additional verification.
    """
    pass
