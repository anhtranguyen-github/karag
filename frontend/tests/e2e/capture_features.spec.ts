
import { test, expect } from '@playwright/test';

test.describe('Feature Capture', () => {
    test('capture dashboard', async ({ page }) => {
        await page.goto('http://localhost:3000/');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'public/screenshots/workspaces_dashboard.png', fullPage: true });
    });

    test('capture master vault', async ({ page }) => {
        await page.goto('http://localhost:3000/vault');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'public/screenshots/master_vault.png', fullPage: true });
    });

    test('capture workspace overview', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'public/screenshots/workspace_overview.png', fullPage: true });
    });

    test('capture chat interface', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default/chat');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'public/screenshots/chat_interface.png', fullPage: true });
    });

    test('capture document management', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default/documents');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'public/screenshots/document_management.png', fullPage: true });
    });

    test('capture tools manager', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default');
        await page.waitForLoadState('networkidle');
        // Click the Hammer/Tools icon. Based on tools-manager.tsx, it's a button with Hammer icon.
        // Looking at workspace-header.tsx or similar might help, but let's try to find it by role or title.
        // In tools-manager.tsx it's titled "Capability Forge" but that's inside the modal.
        // Let's look for a button that might open it.
        const toolsButton = page.locator('button:has(svg.lucide-hammer), button:has-text("Tools")').first();
        if (await toolsButton.isVisible()) {
            await toolsButton.click();
            await page.waitForSelector('h2:has-text("Capability Forge")');
            await page.screenshot({ path: 'public/screenshots/tools_manager.png' });
        }
    });
});
