const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const BASE_URL = "http://127.0.0.1:3000";
const ACTOR_ID = "dashboard-user";

async function jsonOrThrow(response) {
  const body = await response.text();
  if (!response.ok()) {
    throw new Error(`${response.status()} ${response.statusText()}\n${body}`);
  }
  return body ? JSON.parse(body) : null;
}

test("project document deletion removes linked workspace state", async ({ page, request }) => {
  const runId = `${Date.now()}`;

  const org = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/organizations`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ACTOR_ID,
      },
      data: {
        name: `Delete Flow Org ${runId}`,
        description: "Live browser delete test",
      },
    })
  );

  const project = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/organizations/${org.id}/projects`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ACTOR_ID,
      },
      data: {
        name: `Delete Flow Project ${runId}`,
        description: "Delete flow project",
      },
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
      data: {
        name: `Delete Flow Workspace ${runId}`,
        description: "Delete flow workspace",
      },
    })
  );

  const filename = `delete-flow-${runId}.txt`;
  const filePath = path.join(os.tmpdir(), filename);
  await fs.writeFile(filePath, `delete flow test ${runId}\nworkspace cleanup`);

  await page.goto(`${BASE_URL}/dashboard/project/${project.id}/documents`);
  await expect(page.getByRole("heading", { name: "Project Documents" })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.getByText(filename)).toBeVisible({ timeout: 15000 });

  const projectDocs = await jsonOrThrow(
    await request.get(`${BASE_URL}/proxy/api/v1/documents?project_id=${encodeURIComponent(project.id)}`, {
      headers: {
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
      },
    })
  );

  const uploadedDoc = projectDocs.find((doc) => doc.title === filename);
  expect(uploadedDoc).toBeTruthy();

  const ingestResponse = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/workspaces/${workspace.id}/ingest-files`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ACTOR_ID,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
        "X-Workspace-Id": workspace.id,
      },
      data: {
        document_ids: [uploadedDoc.id],
      },
    })
  );

  expect(["accepted", "started"]).toContain(ingestResponse.status);

  await expect
    .poll(async () => {
      const workspaceDocs = await jsonOrThrow(
        await request.get(`${BASE_URL}/proxy/api/v1/workspaces/${workspace.id}/documents`, {
          headers: {
            "X-Actor-Id": ACTOR_ID,
            "X-Organization-Id": org.id,
            "X-Project-Id": project.id,
            "X-Workspace-Id": workspace.id,
          },
        })
      );
      return workspaceDocs.some((doc) => doc.id === uploadedDoc.id);
    }, { timeout: 15000 })
    .toBe(true);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Delete ${filename}` }).click();
  await expect(page.getByText(filename)).toHaveCount(0, { timeout: 15000 });

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
      return docs.some((doc) => doc.id === uploadedDoc.id);
    }, { timeout: 15000 })
    .toBe(false);

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
      return docs.some((doc) => doc.id === uploadedDoc.id);
    }, { timeout: 15000 })
    .toBe(false);
});
