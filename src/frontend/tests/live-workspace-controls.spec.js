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

test("workspace controls route correctly and remove documents", async ({ page, request }) => {
  const runId = `${Date.now()}`;

  const org = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/organizations`, {
      headers: { "Content-Type": "application/json", "X-Actor-Id": ACTOR_ID },
      data: { name: `Workspace Controls Org ${runId}` },
    })
  );

  const project = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/organizations/${org.id}/projects`, {
      headers: { "Content-Type": "application/json", "X-Actor-Id": ACTOR_ID },
      data: { name: `Workspace Controls Project ${runId}` },
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
      data: { name: `Workspace Controls Workspace ${runId}` },
    })
  );

  await page.goto(`${BASE_URL}/dashboard/workspace/${workspace.id}`);
  await page.getByRole("button", { name: "View Config" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/workspace/${workspace.id}/settings$`));

  await page.goto(`${BASE_URL}/dashboard/workspace/${workspace.id}`);
  await page.getByRole("button", { name: "View Audit Log" }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/workspace/${workspace.id}/history$`));

  await page.goto(`${BASE_URL}/dashboard/workspace/${workspace.id}/chat`);
  await page.getByRole("button", { name: /Session/i }).click();
  await expect(page).toHaveURL(new RegExp(`/dashboard/workspace/${workspace.id}/history$`));

  const filename = `workspace-delete-${runId}.txt`;
  const filePath = path.join(os.tmpdir(), filename);
  await fs.writeFile(filePath, `workspace delete flow ${runId}`);

  await page.goto(`${BASE_URL}/dashboard/workspace/${workspace.id}/context-docs`);
  await expect(page.getByText("Knowledge Base")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await expect(page.getByText(filename)).toBeVisible({ timeout: 15000 });

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: `Remove ${filename} from workspace` }).click();
  await expect(page.getByText(filename)).toHaveCount(0, { timeout: 15000 });

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
      return docs.some((doc) => doc.title === filename);
    }, { timeout: 15000 })
    .toBe(false);
});
