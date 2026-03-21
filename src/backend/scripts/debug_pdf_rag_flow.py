from __future__ import annotations

import os
from pathlib import Path


def main() -> None:
    os.environ["RAG_DEFAULT_EMBEDDER"] = "dense"

    from app.karag_manager import KaragManager
    from app.core.tenancy import TenantContext
    from app.modules.organizations.schemas import OrganizationCreate, ProjectCreate
    from app.modules.workspaces.schemas import WorkspaceCreate, WorkspaceSettingUpdate
    from app.modules.workspaces.services import WorkspaceService

    repo_root = Path(__file__).resolve().parents[3]
    pdf_path = repo_root / ".docs" / "1906.05799v4.pdf"
    if not pdf_path.exists():
        raise FileNotFoundError(pdf_path)

    manager = KaragManager.startup()
    manager.database.recreate_schema()

    org_id = "debug-org"
    project_id = "debug-project"
    workspace_id = "debug-workspace"
    dataset_id = "default"

    manager.organization_service.create_organization(
        OrganizationCreate(id=org_id, name="Debug Org", description="PDF debug org")
    )
    manager.organization_service.create_project(
        org_id,
        ProjectCreate(id=project_id, name="Debug Project", description="PDF debug project"),
    )

    tenant = TenantContext(
        actor_id="debug-user",
        organization_id=org_id,
        project_id=project_id,
        workspace_id=workspace_id,
        permissions={
            "workspace.create",
            "workspace.view",
            "workspace.update",
            "doc.upload",
            "doc.view",
            "chat.ask",
            "chat.session",
        },
    )

    workspace_service = WorkspaceService(manager)
    workspace_service.create_workspace(
        tenant,
        WorkspaceCreate(
            id=workspace_id,
            name="Debug Workspace",
            description="Quick PDF debug workspace",
        ),
    )

    workspace_service.update_rag_config(
        tenant,
        workspace_id,
        WorkspaceSettingUpdate(
            embedding={
                "component": "dense",
                "provider": "jina",
                "model": "jina-embeddings-v3",
                "dimension": 1024,
                "batch_size": 8,
                "api_key": manager.settings.jina_api_key,
                "api_base": "https://api.jina.ai/v1",
            },
            vectorstore={
                "component": "qdrant",
                "url": manager.settings.qdrant_url,
                "api_key": manager.settings.qdrant_api_key,
                "distance_metric": "cosine",
                "index_type": "hnsw",
                "vector_dimension": 1024,
            },
            retriever={
                "component": "vector",
                "top_k": 3,
                "score_threshold": 0.0,
            },
            reranker={
                "component": "none",
                "provider": "none",
                "model": "none",
            },
            rag={
                "reader": "simple_pdf",
                "query_transformer": "identity",
                "generator": "openai",
                "prompt_template": "Context:\n{{context}}\n\nQuestion:\n{{question}}\n\nAnswer:",
                "max_context_tokens": 4000,
                "context_compression": False,
                "citation_mode": "inline",
                "context_formatting_template": "[{index}] {text}",
            },
            llm={
                "provider": "omniroute",
                "model": "cost-saver",
                "temperature": 0.0,
                "max_tokens": 400,
                "streaming": False,
                "api_key": manager.settings.openai_api_key,
                "api_base": "http://localhost:20128/v1",
            },
        ),
    )

    pdf_bytes = pdf_path.read_bytes()
    import asyncio

    asyncio.run(
        manager.ingest_document(
            tenant=tenant,
            project_id=project_id,
            workspace_id=workspace_id,
            filename=pdf_path.name,
            content=pdf_bytes,
            extension="pdf",
        )
    )

    result = manager.execute_rag_query(
        tenant=tenant,
        workspace_id=workspace_id,
        query="Summarize the main topic of this paper in 3 sentences.",
        dataset_id=dataset_id,
    )

    print("ANSWER:\n")
    print(result.answer)
    print("\nCHUNKS:", len(result.chunks))
    for chunk in result.chunks[:3]:
        print("-", chunk.document_title, chunk.score)


if __name__ == "__main__":
    main()