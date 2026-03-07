#!/usr/bin/env python3
"""
Unit tests for OpenAI-compatible completions endpoint.
Tests core functions without requiring full server startup.
"""

import os

# Test the functions directly
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class TestParseModelName:
    """Test model name parsing."""

    def test_basic_workspace(self):
        from app.api.v1.completions import parse_model_name

        provider, workspace, mode = parse_model_name("karag:myworkspace")
        assert provider == "karag"
        assert workspace == "myworkspace"
        assert mode is None

    def test_workspace_with_mode(self):
        from app.api.v1.completions import parse_model_name

        provider, workspace, mode = parse_model_name("karag:myworkspace:qa")
        assert provider == "karag"
        assert workspace == "myworkspace"
        assert mode == "qa"

    def test_default_workspace(self):
        from app.api.v1.completions import parse_model_name

        provider, workspace, mode = parse_model_name("karag")
        assert provider == "karag"
        assert workspace == "default"
        assert mode is None

    def test_empty_workspace(self):
        from app.api.v1.completions import parse_model_name

        provider, workspace, mode = parse_model_name("karag:")
        assert provider == "karag"
        assert workspace == "default"
        assert mode is None


class TestExtractModeFromMessages:
    """Test mode extraction from system messages."""

    def test_mode_in_system_message(self):
        from app.api.v1.completions import extract_mode_from_messages
        from app.schemas.openai import OpenAIMessage

        messages = [
            OpenAIMessage(role="system", content="You are helpful. [mode:strict_rag]"),
            OpenAIMessage(role="user", content="Hello"),
        ]
        mode = extract_mode_from_messages(messages)
        assert mode == "strict_rag"

    def test_mode_qa(self):
        from app.api.v1.completions import extract_mode_from_messages
        from app.schemas.openai import OpenAIMessage

        messages = [
            OpenAIMessage(role="system", content="[mode:qa] Answer questions."),
        ]
        mode = extract_mode_from_messages(messages)
        assert mode == "qa"

    def test_no_mode(self):
        from app.api.v1.completions import extract_mode_from_messages
        from app.schemas.openai import OpenAIMessage

        messages = [
            OpenAIMessage(role="system", content="You are helpful."),
            OpenAIMessage(role="user", content="Hello"),
        ]
        mode = extract_mode_from_messages(messages)
        assert mode is None

    def test_no_system_message(self):
        from app.api.v1.completions import extract_mode_from_messages
        from app.schemas.openai import OpenAIMessage

        messages = [
            OpenAIMessage(role="user", content="Hello"),
        ]
        mode = extract_mode_from_messages(messages)
        assert mode is None


class TestBuildRagContextWithCitations:
    """Test RAG context building with citations."""

    def test_basic_context(self):
        from app.api.v1.completions import build_rag_context_with_citations

        search_results = [
            {"text": "The sky is blue.", "payload": {"doc_id": "doc_123"}},
            {"text": "Grass is green.", "payload": {"doc_id": "doc_456"}},
        ]

        context = build_rag_context_with_citations(search_results)

        assert "[[doc:doc_123]]" in context
        assert "[[doc:doc_456]]" in context
        assert "The sky is blue." in context
        assert "Grass is green." in context

    def test_trimming(self):
        from app.api.v1.completions import build_rag_context_with_citations

        # Create very long text
        long_text = "A" * 5000
        search_results = [
            {"text": long_text, "payload": {"doc_id": "doc_123"}},
            {"text": "Short text.", "payload": {"doc_id": "doc_456"}},
        ]

        context = build_rag_context_with_citations(search_results, max_context_chars=1000)

        # Should be truncated but still have citation
        assert "[[doc:doc_123]]" in context
        assert len(context) <= 1100  # Allow some buffer

    def test_empty_results(self):
        from app.api.v1.completions import build_rag_context_with_citations

        context = build_rag_context_with_citations([])
        assert context == ""


class TestBuildCitationPrompt:
    """Test citation prompt building."""

    def test_default_mode(self):
        from app.api.v1.completions import build_citation_prompt

        prompt = build_citation_prompt("Some context")

        assert "[[doc:<document_id>]]" in prompt
        assert "Some context" in prompt
        assert "helpful assistant" in prompt.lower()

    def test_strict_rag_mode(self):
        from app.api.v1.completions import build_citation_prompt

        prompt = build_citation_prompt("Some context", mode="strict_rag")

        assert "strict" in prompt.lower()
        assert "ONLY" in prompt

    def test_qa_mode(self):
        from app.api.v1.completions import build_citation_prompt

        prompt = build_citation_prompt("Some context", mode="qa")

        assert "Q&A" in prompt or "precise" in prompt.lower()

    def test_tutor_mode(self):
        from app.api.v1.completions import build_citation_prompt

        prompt = build_citation_prompt("Some context", mode="tutor")

        assert "tutor" in prompt.lower()


class TestExtractCitationsFromContent:
    """Test citation extraction."""

    def test_single_citation(self):
        from app.api.v1.completions import extract_citations_from_content

        content = "The answer is 42 [[doc:doc_123]]."
        result, citations = extract_citations_from_content(content)

        assert result == content
        assert "doc_123" in citations
        assert len(citations) == 1

    def test_multiple_citations(self):
        from app.api.v1.completions import extract_citations_from_content

        content = "See [[doc:doc_123]] and [[doc:doc_456]] for more."
        result, citations = extract_citations_from_content(content)

        assert "doc_123" in citations
        assert "doc_456" in citations
        assert len(citations) == 2

    def test_duplicate_citations(self):
        from app.api.v1.completions import extract_citations_from_content

        content = "See [[doc:doc_123]] and again [[doc:doc_123]]."
        result, citations = extract_citations_from_content(content)

        # Should deduplicate
        assert len(citations) == 1
        assert "doc_123" in citations

    def test_no_citations(self):
        from app.api.v1.completions import extract_citations_from_content

        content = "No citations here."
        result, citations = extract_citations_from_content(content)

        assert result == content
        assert len(citations) == 0


class TestCitationBuffer:
    """Test citation buffering for streaming."""

    def test_no_citation_flush_all(self):
        from app.api.v1.completions import CitationBuffer

        buf = CitationBuffer()
        result = buf.add("Hello world")

        assert result == "Hello world"

    def test_partial_citation_buffering(self):
        from app.api.v1.completions import CitationBuffer

        buf = CitationBuffer()

        # Text before citation should be flushed
        result = buf.add("Hello [[")
        assert result == "Hello "  # Content before [[ is flushed

        # Complete citation - should flush
        result = buf.add("doc:123]]")
        assert result == "[[doc:123]]"

    def test_citation_with_preceding_text(self):
        from app.api.v1.completions import CitationBuffer

        buf = CitationBuffer()

        # Text then citation start
        result = buf.add("See [[")
        assert result == "See "  # Flush text before citation

        result = buf.add("doc:123]]")
        assert result == "[[doc:123]]"

    def test_flush_remaining(self):
        from app.api.v1.completions import CitationBuffer

        buf = CitationBuffer()
        buf.add("[[doc")  # Just the citation start

        result = buf.flush()
        assert "[[doc" in result  # Flush returns buffered citation content


class TestOpenAICompatibility:
    """Test OpenAI API compatibility features."""

    def test_citation_format_in_content(self):
        """Ensure citations follow the [[doc:<id>]] format."""
        from app.api.v1.completions import extract_citations_from_content

        # Valid formats
        valid_citations = [
            "[[doc:abc123]]",
            "[[doc:file_1.pdf]]",
            "[[doc:uuid-123-456]]",
        ]

        for citation in valid_citations:
            content = f"See {citation}"
            _, docs = extract_citations_from_content(content)
            assert len(docs) == 1, f"Failed to extract: {citation}"

    def test_not_found_response(self):
        """Test that 'Not found' message is exact for strict modes."""
        from app.api.v1.completions import build_citation_prompt

        prompt = build_citation_prompt("context", mode="strict_rag")
        assert "Not found in the provided documents" in prompt


def run_tests():
    """Run all tests."""
    import subprocess

    result = subprocess.run(["python", "-m", "pytest", __file__, "-v"], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result.returncode


if __name__ == "__main__":
    # Run with pytest if available
    try:
        import pytest

        exit_code = pytest.main([__file__, "-v"])
        sys.exit(exit_code)
    except ImportError:
        print("pytest not available, running basic assertions...")
        # Run basic tests manually
        test_classes = [
            TestParseModelName(),
            TestExtractModeFromMessages(),
            TestBuildRagContextWithCitations(),
            TestBuildCitationPrompt(),
            TestExtractCitationsFromContent(),
            TestCitationBuffer(),
            TestOpenAICompatibility(),
        ]

        passed = 0
        failed = 0

        for test_class in test_classes:
            class_name = test_class.__class__.__name__
            print(f"\n{class_name}:")
            for method_name in dir(test_class):
                if method_name.startswith("test_"):
                    try:
                        method = getattr(test_class, method_name)
                        method()
                        print(f"  ✓ {method_name}")
                        passed += 1
                    except Exception as e:
                        print(f"  ✗ {method_name}: {e}")
                        failed += 1

        print(f"\n{passed} passed, {failed} failed")
        sys.exit(0 if failed == 0 else 1)
