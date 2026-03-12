const { test, expect } = require("@playwright/test");
const path = require("node:path");

const BASE_URL = "http://127.0.0.1:3000";
const ACTOR_ID = "dashboard-user";
const DOCS_DIR = "/home/tra01/project/karag/.docs";

const PROJECT_ONLY_DOC = path.join(DOCS_DIR, "1906.05799v4.pdf");
const IMPORT_DOC = path.join(DOCS_DIR, "Supervised_Machine_Learning_Models.pdf");
const WORKSPACE_DOC = path.join(DOCS_DIR, "2508.15260v1.pdf");

function basename(filePath) {
  return path.basename(filePath);
}

async function jsonOrThrow(response) {
  const body = await response.text();
  if (!response.ok()) {
    throw new Error(`${response.status()} ${response.statusText()}\n${body}`);
  }
  return body ? JSON.parse(body) : null;
}

async function setTenant(page, tenant) {
  await page.goto(`${BASE_URL}/dashboard`);
  await page.evaluate((value) => {
    window.localStorage.setItem("karag.tenant.selection", JSON.stringify(value));
  }, tenant);
}

test("verify scopes, three upload scenarios, ingestion, retrieval, and generation using .docs PDFs", async ({ page, request }) => {
  test.setTimeout(240000);
  const runId = `${Date.now()}`;

  const org = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/organizations`, {
      headers: { "Content-Type": "application/json", "X-Actor-Id": ACTOR_ID },
      data: { name: `RAG Verify Org ${runId}` },
    })
  );
  const project = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/organizations/${org.id}/projects`, {
      headers: { "Content-Type": "application/json", "X-Actor-Id": ACTOR_ID },
      data: { name: `RAG Verify Project ${runId}` },
    })
  );
  const workspace = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/workspaces`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
      },
      data: { name: `RAG Verify Workspace ${runId}` },
    })
  );

  const tenant = {
    actorId: ACTOR_ID,
    organizationId: org.id,
    projectId: project.id,
    workspaceId: workspace.id,
  };
  await setTenant(page, tenant);

  const currentConfig = await jsonOrThrow(
    await request.get(`${BASE_URL}/proxy/api/v1/workspaces/${workspace.id}/rag-config`, {
      headers: {
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
        "X-Workspace-Id": workspace.id,
      },
    })
  );

  expect(currentConfig.embedding.component).toBe("multi_vector");
  expect(currentConfig.chunking.component).toBe("semantic");
  expect(currentConfig.vectorstore.component).toBe("qdrant");
  expect(currentConfig.retriever.component).toBe("multi_stage");
  expect(currentConfig.reranker.component).toBe("colbert");
  expect(currentConfig.rag.reader).toBe("marker");
  expect(currentConfig.rag.query_transformer).toBe("hyde");
  expect(currentConfig.rag.self_query).toBe("openai_self_query");
  expect(currentConfig.rag.generator).toBe("openai");
  expect(currentConfig.llm.provider).toBe("omniroute");
  expect(currentConfig.rag.use_llm).toBe(true);
  expect(currentConfig.rag.force_ocr).toBe(true);
  expect(currentConfig.rag.redo_inline_math).toBe(true);
  expect(currentConfig.rag.html_tables_in_markdown).toBe(true);
  expect(currentConfig.rag.paginate_output).toBe(true);

  const pipelineAudit = await jsonOrThrow(
    await request.get(`${BASE_URL}/proxy/api/v1/workspaces/${workspace.id}/rag-pipeline/audit`, {
      headers: {
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
        "X-Workspace-Id": workspace.id,
      },
    })
  );
  expect(pipelineAudit.valid).toBe(true);
  expect(pipelineAudit.current_pipeline.reader).toBe("marker");
  expect(pipelineAudit.current_pipeline.embedder).toBe("multi_vector");
  expect(pipelineAudit.current_pipeline.chunker).toBe("semantic");
  expect(pipelineAudit.current_pipeline.vectorstore).toBe("qdrant");
  expect(pipelineAudit.current_pipeline.retriever).toBe("multi_stage");
  expect(pipelineAudit.current_pipeline.reranker).toBe("colbert");
  expect(pipelineAudit.current_pipeline.query_transformer).toBe("hyde");
  expect(pipelineAudit.current_pipeline.generator).toBe("openai");

  await page.goto(`${BASE_URL}/dashboard/project/${project.id}/documents`);
  await expect(page.getByRole("heading", { name: "Project Documents" })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles([PROJECT_ONLY_DOC, IMPORT_DOC]);
  await expect(page.getByText(basename(PROJECT_ONLY_DOC))).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(basename(IMPORT_DOC))).toBeVisible({ timeout: 20000 });

  await expect
    .poll(async () => {
      const docs = await jsonOrThrow(
        await request.get(`${BASE_URL}/proxy/api/v1/documents?project_id=${encodeURIComponent(project.id)}`, {
          headers: {
            "X-Actor-Id": ACTOR_ID,
            "X-Organization-Id": org.id,
            "X-Project-Id": project.id,
          },
        })
      );
      return Array.isArray(docs) ? docs.length : 0;
    }, { timeout: 20000 })
    .toBeGreaterThanOrEqual(2);

  const initialProjectDocs = await jsonOrThrow(
    await request.get(`${BASE_URL}/proxy/api/v1/documents?project_id=${encodeURIComponent(project.id)}`, {
      headers: {
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
      },
    })
  );
  const projectOnly = initialProjectDocs.find((doc) => doc.title === basename(PROJECT_ONLY_DOC));
  const importable = initialProjectDocs.find((doc) => doc.title === basename(IMPORT_DOC));
  expect(projectOnly).toBeTruthy();
  expect(importable).toBeTruthy();

  await page.goto(`${BASE_URL}/dashboard/workspace/${workspace.id}/context-docs`);
  await expect(page.getByRole("heading", { name: "Knowledge Base", exact: true })).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(WORKSPACE_DOC);

  await expect
    .poll(async () => {
      const docs = await jsonOrThrow(
        await request.get(`${BASE_URL}/proxy/api/v1/workspaces/${workspace.id}/documents`, {
          headers: {
            "X-Actor-Id": ACTOR_ID,
            "X-Organization-Id": org.id,
            "X-Project-Id": project.id,
            "X-Workspace-Id": workspace.id,
          },
        })
      );
      const directDoc = Array.isArray(docs) ? docs.find((doc) => doc.title === basename(WORKSPACE_DOC)) : null;
      return {
        exists: Boolean(directDoc),
        status: directDoc?.status ?? null,
      };
    }, { timeout: 180000 })
    .toEqual({
      exists: true,
      status: "completed",
    });

  await expect
    .poll(async () => {
      const docs = await jsonOrThrow(
        await request.get(`${BASE_URL}/proxy/api/v1/workspaces/${workspace.id}/documents`, {
          headers: {
            "X-Actor-Id": ACTOR_ID,
            "X-Organization-Id": org.id,
            "X-Project-Id": project.id,
            "X-Workspace-Id": workspace.id,
          },
        })
      );
      return Array.isArray(docs) && docs.some((doc) => doc.title === basename(WORKSPACE_DOC));
    }, { timeout: 180000 })
    .toBeTruthy();

  const docsBeforeImport = await jsonOrThrow(
    await request.get(`${BASE_URL}/proxy/api/v1/workspaces/${workspace.id}/documents`, {
      headers: {
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
        "X-Workspace-Id": workspace.id,
      },
    })
  );
  expect(docsBeforeImport.some((doc) => doc.title === basename(IMPORT_DOC))).toBe(false);
  expect(docsBeforeImport.some((doc) => doc.title === basename(PROJECT_ONLY_DOC))).toBe(false);

  await page.getByRole("button", { name: "Import Library" }).click();
  await expect(page.getByRole("heading", { name: "Import from Project", exact: true })).toBeVisible();
  await page.getByRole("button", { name: new RegExp(basename(IMPORT_DOC).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
  await page.getByRole("button", { name: /Ingest 1 Document/i }).click();

  await expect
    .poll(async () => {
      const docs = await jsonOrThrow(
        await request.get(`${BASE_URL}/proxy/api/v1/workspaces/${workspace.id}/documents`, {
          headers: {
            "X-Actor-Id": ACTOR_ID,
            "X-Organization-Id": org.id,
            "X-Project-Id": project.id,
            "X-Workspace-Id": workspace.id,
          },
        })
      );
      const importDoc = docs.find((doc) => doc.title === basename(IMPORT_DOC));
      const directDoc = docs.find((doc) => doc.title === basename(WORKSPACE_DOC));
      return {
        count: docs.length,
        importStatus: importDoc?.status,
        directStatus: directDoc?.status,
        hasImportDoc: Boolean(importDoc),
        hasDirectDoc: Boolean(directDoc),
      };
    }, { timeout: 180000 })
    .toEqual({
      count: 2,
      importStatus: "completed",
      directStatus: "completed",
      hasImportDoc: true,
      hasDirectDoc: true,
    });

  const projectDocsFinal = await jsonOrThrow(
    await request.get(`${BASE_URL}/proxy/api/v1/documents?project_id=${encodeURIComponent(project.id)}`, {
      headers: {
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
      },
    })
  );

  const finalProjectOnly = projectDocsFinal.find((doc) => doc.title === basename(PROJECT_ONLY_DOC));
  const finalImportable = projectDocsFinal.find((doc) => doc.title === basename(IMPORT_DOC));
  const finalWorkspaceUpload = projectDocsFinal.find((doc) => doc.title === basename(WORKSPACE_DOC));

  expect(finalProjectOnly).toBeTruthy();
  expect(finalImportable).toBeTruthy();
  expect(finalWorkspaceUpload).toBeTruthy();
  expect(finalProjectOnly.workspace_count ?? 0).toBe(0);
  expect(finalImportable.status).toBe("completed");
  expect(finalWorkspaceUpload.status).toBe("completed");

  const ragResponse = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/v1/rag/query`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
        "X-Workspace-Id": workspace.id,
      },
      data: {
        workspace_id: workspace.id,
        knowledge_dataset_id: "default",
        query: "Supervised machine learning models",
      },
    })
  );

  expect(typeof ragResponse.answer).toBe("string");
  expect(ragResponse.answer.length).toBeGreaterThan(40);
  expect(ragResponse.answer).toContain("supervised");
  expect(Array.isArray(ragResponse.chunks)).toBe(true);
  expect(ragResponse.chunks.length).toBeGreaterThan(0);

  const session = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/chat/sessions`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
        "X-Workspace-Id": workspace.id,
      },
      data: {
        title: `RAG Verify Session ${runId}`,
      },
    })
  );

  const assistantMessage = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/chat/sessions/${session.id}/messages`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
        "X-Workspace-Id": workspace.id,
      },
      data: {
        message: "Supervised machine learning models",
      },
    })
  );

  expect(typeof assistantMessage.content).toBe("string");
  expect(assistantMessage.content.length).toBeGreaterThan(40);
  expect(Array.isArray(assistantMessage.metadata?.sources)).toBe(true);
  expect(assistantMessage.metadata.sources.length).toBeGreaterThan(0);
});
