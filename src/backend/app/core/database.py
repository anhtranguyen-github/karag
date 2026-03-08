from __future__ import annotations

from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any, Generator

from sqlalchemy import JSON, DateTime, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool


def utcnow() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class OrganizationRow(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProjectRow(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class WorkspaceRow(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    project_id: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class WorkspaceRagConfigRow(Base):
    __tablename__ = "workspace_rag_configs"

    workspace_id: Mapped[str] = mapped_column(String(120), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    project_id: Mapped[str] = mapped_column(String(120), index=True)
    embedding_provider: Mapped[str] = mapped_column(String(120), default="openai")
    embedding_model: Mapped[str] = mapped_column(String(255), default="text-embedding-3-small")
    embedding_dimension: Mapped[int | None] = mapped_column(Integer(), nullable=True)
    embedding_batch_size: Mapped[int] = mapped_column(Integer(), default=16)
    vector_store_type: Mapped[str] = mapped_column(String(120), default="qdrant")
    vector_store_config_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    retrieval_config_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    reading_config_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    llm_config_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    prompt_template: Mapped[str] = mapped_column(Text(), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class KnowledgeDatasetRow(Base):
    __tablename__ = "knowledge_datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    project_id: Mapped[str] = mapped_column(String(120), index=True)
    workspace_id: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    embedding_model: Mapped[str] = mapped_column(String(255))
    chunk_strategy: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DocumentRow(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    dataset_id: Mapped[str] = mapped_column(String(36), index=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    project_id: Mapped[str] = mapped_column(String(120), index=True)
    workspace_id: Mapped[str] = mapped_column(String(120), index=True)
    title: Mapped[str] = mapped_column(String(255))
    storage_path: Mapped[str] = mapped_column(String(512))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ChunkRow(Base):
    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(36), index=True)
    dataset_id: Mapped[str] = mapped_column(String(36), index=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    project_id: Mapped[str] = mapped_column(String(120), index=True)
    workspace_id: Mapped[str] = mapped_column(String(120), index=True)
    text: Mapped[str] = mapped_column(Text())
    token_count: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EvaluationDatasetRow(Base):
    __tablename__ = "evaluation_datasets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    project_id: Mapped[str] = mapped_column(String(120), index=True)
    workspace_id: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EvaluationQuestionRow(Base):
    __tablename__ = "evaluation_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    evaluation_dataset_id: Mapped[str] = mapped_column(String(36), index=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    project_id: Mapped[str] = mapped_column(String(120), index=True)
    workspace_id: Mapped[str] = mapped_column(String(120), index=True)
    question: Mapped[str] = mapped_column(Text())
    expected_answer: Mapped[str] = mapped_column(Text())
    expected_context: Mapped[str | None] = mapped_column(Text(), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class EvaluationRunRow(Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    evaluation_dataset_id: Mapped[str] = mapped_column(String(36), index=True)
    knowledge_dataset_id: Mapped[str] = mapped_column(String(36), index=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    project_id: Mapped[str] = mapped_column(String(120), index=True)
    workspace_id: Mapped[str] = mapped_column(String(120), index=True)
    total_questions: Mapped[int]
    average_score: Mapped[float]
    question_results_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ModelRow(Base):
    __tablename__ = "models"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(120))
    framework: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text(), nullable=True)
    lifecycle_state: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ModelVersionRow(Base):
    __tablename__ = "model_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    model_id: Mapped[str] = mapped_column(String(36), index=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    version: Mapped[str] = mapped_column(String(120))
    release_notes: Mapped[str | None] = mapped_column(Text(), nullable=True)
    lifecycle_state: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ModelArtifactRow(Base):
    __tablename__ = "model_artifacts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    model_version_id: Mapped[str] = mapped_column(String(36), index=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    name: Mapped[str] = mapped_column(String(255))
    artifact_type: Mapped[str] = mapped_column(String(120))
    storage_backend: Mapped[str] = mapped_column(String(120))
    storage_path: Mapped[str] = mapped_column(String(512))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ModelDeploymentRow(Base):
    __tablename__ = "model_deployments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    model_version_id: Mapped[str] = mapped_column(String(36), index=True)
    organization_id: Mapped[str] = mapped_column(String(120), index=True)
    project_id: Mapped[str] = mapped_column(String(120), index=True)
    workspace_id: Mapped[str] = mapped_column(String(120), index=True)
    target: Mapped[str] = mapped_column(String(120))
    inference_url: Mapped[str] = mapped_column(String(512))
    configuration_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    lifecycle_state: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class DatabaseManager:
    def __init__(self, database_url: str) -> None:
        engine_kwargs: dict[str, Any] = {"future": True}
        if database_url.startswith("sqlite"):
            engine_kwargs["connect_args"] = {"check_same_thread": False}
        if database_url.endswith(":memory:"):
            engine_kwargs["poolclass"] = StaticPool
        self.engine = create_engine(database_url, **engine_kwargs)
        self._session_factory = sessionmaker(self.engine, expire_on_commit=False)

    def initialize(self) -> None:
        Base.metadata.create_all(self.engine)

    @contextmanager
    def session(self) -> Generator[Session, None, None]:
        session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def counts(self) -> dict[str, int]:
        with self.session() as session:
            return {
                "organizations": len(session.scalars(select(OrganizationRow)).all()),
                "projects": len(session.scalars(select(ProjectRow)).all()),
                "workspaces": len(session.scalars(select(WorkspaceRow)).all()),
                "workspace_rag_configs": len(session.scalars(select(WorkspaceRagConfigRow)).all()),
                "knowledge_datasets": len(session.scalars(select(KnowledgeDatasetRow)).all()),
                "documents": len(session.scalars(select(DocumentRow)).all()),
                "chunks": len(session.scalars(select(ChunkRow)).all()),
                "evaluation_datasets": len(session.scalars(select(EvaluationDatasetRow)).all()),
                "evaluation_questions": len(session.scalars(select(EvaluationQuestionRow)).all()),
                "models": len(session.scalars(select(ModelRow)).all()),
                "model_versions": len(session.scalars(select(ModelVersionRow)).all()),
            }
