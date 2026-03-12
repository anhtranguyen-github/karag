import asyncio
import os
import sys
import glob
import logging
from datetime import datetime

# Setup logging to both file and console
log_file = "scripts/docs_test_run.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("DocsTest")

# Ensure we can import modules from the app directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.config import PlatformSettings
from app.karag_manager import KaragManager
from app.core.tenancy import TenantContext
from app.modules.workspaces.setting_manager import WorkspaceSettingManager
from app.rag.schemas.schemas import FileConfig
from app.rag.schemas.types import RagContext

async def run_full_docs_test():
    logger.info("Starting End-to-End Documentation Pipeline Test")
    
    settings = PlatformSettings()
    manager = KaragManager(settings)
    
    tenant = TenantContext(
        organization_id="real-org",
        project_id="real-project",
        workspace_id="docs-workspace",
        actor_id="test-admin",
    )
    workspace_id = tenant.workspace_id
    
    # 1. Setup default "Ultimate Cascade" stack
    ws_setting = WorkspaceSettingManager.build_default(workspace_id=workspace_id)
    # Ensure LLM points to OmniRoute
    ws_setting.llm.api_base = "http://127.0.0.1:20128/v1"
    ws_setting.llm.model = "cost-saver"
    
    # 2. Setup Context
    context = RagContext(
        workspace_id=workspace_id,
        project_id=tenant.project_id,
        organization_id=tenant.organization_id,
        collection_name="cascade_collection",
    )
    
    # 2. Ingestion Phase
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.docs"))
    pdf_files = [os.path.join(docs_dir, "tiny_test.pdf")]
    
    if not pdf_files:
        logger.error(f"No PDF files found in {docs_dir}")
        return

    logger.info(f"Found {len(pdf_files)} files: {[os.path.basename(f) for f in pdf_files]}")
    
    for pdf_path in pdf_files:
        filename = os.path.basename(pdf_path)
        logger.info(f"Ingesting: {filename}")
        
        with open(pdf_path, "rb") as f:
            content = f.read()
            
        file_config = FileConfig(
            file_id=f"file_{filename.replace('.', '_')}",
            filename=filename,
            extension="pdf",
            file_size=len(content),
            source="local_docs",
            storage_path=pdf_path,
            project_id=tenant.project_id,
            organization_id=tenant.organization_id,
            status="pending",
        )
        
        try:
            start_time = datetime.now()
            # Perform ingestion
            docs = await manager.rag_manager.import_document(
                setting=ws_setting,
                file_config=file_config,
                content_bytes=content,
                context=context
            )
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Successfully ingested {filename} in {duration:.2f}s. Extracted {len(docs)} segments.")
        except Exception as e:
            logger.error(f"Failed to ingest {filename}: {e}", exc_info=True)

    # 3. Retrieval & Inference Phase
    test_queries = [
        "What is the main topic of 1906.05799v4?",
        "Compare different supervised machine learning models mentioned in the documents.",
        "What are the key findings in 2508.15260v1?",
        "Explain the importance of self-attention in transformers if mentioned."
    ]
    
    logger.info("Starting Validation Queries...")
    
    for query in test_queries:
        logger.info(f"Query: '{query}'")
        try:
            start_time = datetime.now()
            # Set top_k in context as expected by RagManager
            context.top_k = 5
            
            result = await manager.rag_manager.retrieve(
                query=query,
                context=context,
                setting=ws_setting,
                conversation_history=[]
            )
            duration = (datetime.now() - start_time).total_seconds()
            
            logger.info(f"Answer received in {duration:.2f}s:")
            logger.info("-" * 40)
            logger.info(result.answer)
            logger.info("-" * 40)
            logger.info(f"Source Chunks: {len(result.chunks)}")
            for i, chunk in enumerate(result.chunks):
                logger.info(f" [{i+1}] {chunk.document_title} (score: {chunk.score:.4f})")
            
        except Exception as e:
            logger.error(f"Query failed for '{query}': {e}", exc_info=True)

    logger.info("End-to-End Documentation Pipeline Test Completed")

if __name__ == "__main__":
    asyncio.run(run_full_docs_test())
