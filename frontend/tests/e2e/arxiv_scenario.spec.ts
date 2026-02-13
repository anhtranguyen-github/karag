
import { test, expect } from '@playwright/test';

const WORKSPACE_NAME = "DeepThink Research (ArXiv 2508.15260)";

test.describe('ArXiv Workflow Scenario', () => {

    test('End-to-End Analysis of DeepThink Papers', async ({ page }) => {
        // Set viewport to ensure desktop layout and visible elements
        await page.setViewportSize({ width: 1440, height: 900 });

        // 1. Dashboard & Selection
        await page.goto('http://localhost:3000/');
        await expect(page.getByText('Workspaces')).toBeVisible();

        // Search for the workspace
        await page.getByPlaceholder('Search workspaces...').fill('DeepThink');
        await page.waitForTimeout(1000); // Wait for list filter

        // Click the card
        const card = page.getByText(WORKSPACE_NAME, { exact: false }).locator('..').locator('..').locator('..'); // Navigate up to card container if text is inside generic div
        // Actually, let's just use the card selector from homepage more robustly
        // The card contains the name.
        // Let's click the name.
        await page.getByText(WORKSPACE_NAME).click();

        // 2. Workspace Overview
        await expect(page.getByRole('heading', { name: WORKSPACE_NAME })).toBeVisible();

        // Verify documents count > 0 (wait for async load)
        // Check Documents tab
        await page.getByRole('link', { name: 'Documents', exact: true }).click();
        await expect(page).toHaveURL(/.*\/documents/);

        // Wait for list to populate
        await page.waitForTimeout(5000);
        // Reload in case of cache
        await page.reload();
        await page.waitForTimeout(2000);
        // Expect at least one row (DeepThink pdf)
        const rows = page.locator('tbody tr');
        // If not table, maybe cards?
        // Let's just check for text "Deep_Think_with_Confidence.pdf"
        await expect(page.getByText('Deep_Think_with_Confidence', { exact: false })).toBeVisible();

        // Let's start a Chat
        await page.getByRole('link', { name: 'Chat', exact: true }).click();
        await expect(page).toHaveURL(/.*\/chat/);

        // Mark as slow since RAG retrieval and indexing can be time consuming
        test.slow();

        // Send a message
        const question = "What is the core idea of DeepThink with Confidence?";
        // Placeholder is dynamic based on mode
        await page.getByPlaceholder(/Message in .* mode/).fill(question);

        // Click Send (icon button)
        // Button usually has type="submit" or aria-label="Send message"
        await page.getByLabel('Send message').click();

        // Wait for response (might take time for RAG)
        // We look for any message content from the bot
        const assistantMessage = page.locator('div').filter({ hasText: /DeepThink|confidence/i }).last();
        await expect(assistantMessage).toBeVisible();

        // Verify citations
        // Citation component usually renders source markers [1], etc.
        await expect(page.locator('button').filter({ hasText: /^\d+$/ }).first()).toBeVisible({ timeout: 15000 });
    });

});
