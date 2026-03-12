const { test, expect } = require("@playwright/test");

const BASE_URL = "http://127.0.0.1:3000";
const ADMIN = "dashboard-user";
const MEMBER = "role-member-user";
const VIEWER = "role-viewer-user";

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

test("rbac integration covers membership management and role-aware UI", async ({ page, request }) => {
  const runId = `${Date.now()}`;

  const org = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/organizations`, {
      headers: { "Content-Type": "application/json", "X-Actor-Id": ADMIN },
      data: { name: `RBAC Org ${runId}` },
    })
  );
  const project = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/organizations/${org.id}/projects`, {
      headers: { "Content-Type": "application/json", "X-Actor-Id": ADMIN },
      data: { name: `RBAC Project ${runId}` },
    })
  );
  const workspace = await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/workspaces`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ADMIN,
        "X-Organization-Id": org.id,
        "X-Project-Id": project.id,
      },
      data: { name: `RBAC Workspace ${runId}` },
    })
  );

  const adminTenant = {
    actorId: ADMIN,
    organizationId: org.id,
    projectId: project.id,
    workspaceId: workspace.id,
  };
  await setTenant(page, adminTenant);
  await page.goto(`${BASE_URL}/dashboard/project/${project.id}/members`);
  await expect(page.getByRole("heading", { name: "Project Members" })).toBeVisible();

  await page.getByPlaceholder("Actor ID or email").fill("role-temp-user");
  await page.locator("select").first().selectOption("viewer");
  await page.getByRole("button", { name: "Add Member" }).click();
  const tempRow = page.locator("div.rounded-2xl").filter({ hasText: "role-temp-user" }).first();
  await expect(tempRow).toBeVisible();
  await tempRow.locator("select").selectOption("member");
  await tempRow.getByRole("button", { name: "Update Role" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await tempRow.getByRole("button", { name: "Remove" }).click();

  await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/memberships?organization_id=${encodeURIComponent(org.id)}&project_id=${encodeURIComponent(project.id)}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ADMIN,
      },
      data: { user_id: MEMBER, role: "member" },
    })
  );
  await jsonOrThrow(
    await request.post(`${BASE_URL}/proxy/api/v1/memberships?organization_id=${encodeURIComponent(org.id)}&project_id=${encodeURIComponent(project.id)}`, {
      headers: {
        "Content-Type": "application/json",
        "X-Actor-Id": ADMIN,
      },
      data: { user_id: VIEWER, role: "viewer" },
    })
  );

  const viewerPermissions = await jsonOrThrow(
    await request.get(`${BASE_URL}/proxy/api/v1/auth/permissions?organization_id=${encodeURIComponent(org.id)}&project_id=${encodeURIComponent(project.id)}`, {
      headers: { "X-Actor-Id": VIEWER },
    })
  );
  expect(viewerPermissions.permissions).toContain("project.view");
  expect(viewerPermissions.permissions).toContain("workspace.view");
  expect(viewerPermissions.permissions).toContain("doc.view");
  expect(viewerPermissions.permissions).toContain("chat.ask");
  expect(viewerPermissions.permissions).not.toContain("workspace.create");
  expect(viewerPermissions.permissions).not.toContain("chat.session");
  expect(viewerPermissions.permissions).not.toContain("project.edit");

  const memberPermissions = await jsonOrThrow(
    await request.get(`${BASE_URL}/proxy/api/v1/auth/permissions?organization_id=${encodeURIComponent(org.id)}&project_id=${encodeURIComponent(project.id)}`, {
      headers: { "X-Actor-Id": MEMBER },
    })
  );
  expect(memberPermissions.permissions).toContain("workspace.create");
  expect(memberPermissions.permissions).toContain("workspace.edit");
  expect(memberPermissions.permissions).toContain("doc.upload");
  expect(memberPermissions.permissions).toContain("chat.session");
  expect(memberPermissions.permissions).not.toContain("workspace.delete");
  expect(memberPermissions.permissions).not.toContain("project.edit");
});
