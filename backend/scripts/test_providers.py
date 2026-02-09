
import asyncio
import httpx
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings

async def test_provider(name, llm_url, embed_url, model="qwen2.5:0.5b", is_ollama=False):
    print(f"\n--- Testing Provider: {name} ---")
    
    # Test LLM
    try:
        print(f"Testing LLM at {llm_url}...")
        if is_ollama:
            llm = ChatOllama(base_url=llm_url.replace("/v1", ""), model=model)
        else:
            llm = ChatOpenAI(base_url=llm_url, api_key="EMPTY", model=model)
        
        response = await llm.ainvoke("Hi, who are you?")
        print(f"LLM Response: {response.content[:100]}...")
        print("✅ LLM Test Passed")
    except Exception as e:
        print(f"❌ LLM Test Failed: {str(e)}")

    # Test Embedding
    try:
        print(f"Testing Embedding at {embed_url}...")
        if is_ollama:
            embeddings = OllamaEmbeddings(base_url=embed_url.replace("/v1", ""), model=model)
        else:
            embeddings = OpenAIEmbeddings(base_url=embed_url, api_key="EMPTY", model=model)
        
        vector = await embeddings.aembed_query("Hello world")
        print(f"Embedding Vector Length: {len(vector)}")
        print("✅ Embedding Test Passed")
    except Exception as e:
        print(f"❌ Embedding Test Failed: {str(e)}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True)
    parser.add_argument("--llm_url", required=True)
    parser.add_argument("--embed_url", required=True)
    parser.add_argument("--model", default="qwen2.5:0.5b")
    parser.add_argument("--ollama", action="store_true")
    args = parser.parse_args()
    
    asyncio.run(test_provider(args.name, args.llm_url, args.embed_url, args.model, args.ollama))
