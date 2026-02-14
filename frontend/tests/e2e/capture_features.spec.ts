
import { test } from '@playwright/test';

/**
 * Showcase Screenshot Capture (Real App)
 * 
 * Captures key views for project showcase.
 * Prerequisites: ./run.sh turbo must be running.
 */
test.describe('Showcase Capture', () => {

    test.slow(); // Mark as slow to triple the default timeout

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
    });

    // === CORE SHOWCASE SET ===

    test('capture user dashboard', async ({ page }) => {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '../assets/screenshots/showcase_user_dashboard.png', fullPage: true });
        await page.screenshot({ path: '../assets/screenshots/ws_01_dashboard.png', fullPage: true });
    });

    test('capture chat interface', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default/chat', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '../assets/screenshots/showcase_user_chat.png', fullPage: true });
        await page.screenshot({ path: '../assets/screenshots/ux_01_empty_chat.png', fullPage: true });
    });

    test('capture master vault', async ({ page }) => {
        await page.goto('http://localhost:3000/vault', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '../assets/screenshots/showcase_user_vault.png', fullPage: true });
    });

    test('capture document management', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default/documents', { waitUntil: 'load' });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: '../assets/screenshots/showcase_user_documents.png', fullPage: true });
    });

    test('capture admin overview', async ({ page }) => {
        await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '../assets/screenshots/showcase_admin_overview.png', fullPage: true });
    });

    test('capture admin observability', async ({ page }) => {
        await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.getByText('Observability').click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: '../assets/screenshots/showcase_admin_observability.png', fullPage: true });
    });

    // === SCENARIOS ===

    test('capture workspace wizard', async ({ page }) => {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'New' }).click({ force: true });
        await page.waitForTimeout(800);
        await page.screenshot({ path: '../assets/screenshots/ws_02_wizard.png' });
    });

    test('capture workspace settings', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default', { waitUntil: 'networkidle' });
        await page.getByRole('link', { name: 'Settings Configure RAG and' }).click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '../assets/screenshots/ws_03_settings.png' });
    });

    test('capture arxiv modal', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default/documents', { waitUntil: 'networkidle' });
        await page.getByText('From ArXiv').click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: '../assets/screenshots/ux_02_arxiv_modal.png' });
        await page.screenshot({ path: '../assets/screenshots/arxiv_01_upload.png' });
    });

    test('capture active chat', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default/chat', { waitUntil: 'networkidle' });
        // Use a more generic selector for the chat input if placeholder varies
        const input = page.getByRole('textbox');
        await input.click();
        await input.fill('Summarize the key findings of the uploaded papers.');
        await page.keyboard.press('Enter');
        // Wait for some response to appear (streaming)
        await page.waitForTimeout(4000);
        await page.screenshot({ path: '../assets/screenshots/ux_04_rag_chat_active.png', fullPage: true });
    });

    test('capture unified search', async ({ page }) => {
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
        await page.keyboard.press('/');
        await page.waitForTimeout(800);
        await page.screenshot({ path: '../assets/screenshots/ux_05_unified_search.png' });
    });
});
