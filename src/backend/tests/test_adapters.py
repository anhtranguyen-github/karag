import os
import unittest
import pytest
from app.adapters.providers import LiteLLMProvider, HFProvider, LiteLLMEmbeddingProvider
from app.core.ports import ChatMessage

class TestLiteLLMProviders(unittest.TestCase):
    def test_litellm_provider_chat_real(self):
        """Test real LiteLLM chat if OPENAI_API_KEY is available."""
        if not os.getenv("OPENAI_API_KEY"):
            self.skipTest("OPENAI_API_KEY not set")
            
        provider = LiteLLMProvider()
        messages = [ChatMessage(role="user", content="Say 'Hello' and nothing else.")]
        # LiteLLM already defaults to a model like gpt-4o-mini in its init if empty
        completion = provider.chat(messages, model="gpt-4o-mini")
        
        self.assertIn("Hello", completion.content)
        self.assertGreater(completion.prompt_tokens, 0)
        self.assertGreater(completion.completion_tokens, 0)

    def test_litellm_embedding_provider_real(self):
        """Test real LiteLLM embedding if OPENAI_API_KEY is available."""
        if not os.getenv("OPENAI_API_KEY"):
            self.skipTest("OPENAI_API_KEY not set")
            
        provider = LiteLLMEmbeddingProvider()
        embeddings = provider.embed_texts(["This is a real test."], model="text-embedding-3-small")
        
        self.assertEqual(len(embeddings), 1)
        self.assertGreater(len(embeddings[0]), 0)

    def test_hf_provider_vllm_routing_real(self):
        """Test real HF/vLLM routing if VLLM_BASE_URL is accessible."""
        vllm_url = os.getenv("VLLM_BASE_URL", "http://localhost:8000/v1")
        # Quick check if vllm is reachable
        import urllib.request
        try:
            with urllib.request.urlopen(f"{vllm_url.rstrip('/')}/models", timeout=2) as res:
                 pass
        except Exception:
            self.skipTest(f"vLLM endpoint at {vllm_url} not reachable")

        provider = HFProvider()
        provider.vllm_base_url = vllm_url
        messages = [ChatMessage(role="user", content="Ping")]
        # Use a model name from hf_models.json
        model_name = "meta-llama/Llama-3.1-8B-Instruct"
        
        try:
            completion = provider.chat(messages, model=model_name)
            self.assertGreater(len(completion.content), 0)
            self.assertGreater(completion.total_tokens, 0)
        except Exception as e:
            self.fail(f"Real vLLM chat failed: {e}")

if __name__ == "__main__":
    unittest.main()
