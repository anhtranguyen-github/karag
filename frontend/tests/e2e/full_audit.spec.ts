import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Full Frontend Audit', () => {
    // Save screenshots relative to project root
    const SS_DIR = path.resolve(__dirname, '../../../screenshots');

    test.beforeEach(async ({ page }) => {
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`BROWSER ERROR: ${msg.text()}`);
            }
        });
    });

    test('capture all screens', async ({ page }) => {
        // 1. Home Page
        await page.goto('/');
        await expect(page).toHaveTitle(/Karag/i); // Assuming title contains app name
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(SS_DIR, '01_home.png'), fullPage: true });

        // 2. Global Search
        const searchInput = page.getByPlaceholder('Search documents, chats, workspaces...', { exact: false }).first();
        if (await searchInput.isVisible()) {
            // Just capture home with search bar if it's there
        } else {
            // Maybe search is on a separate page or hidden?
        }
        // Let's go to /search explicitly if it exists
        await page.goto('/search');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(SS_DIR, '02_search_page.png'), fullPage: true });

        // 3. Admin Page
        await page.goto('/admin');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(SS_DIR, '03_admin_page.png'), fullPage: true });

        // 4. Create Workspace Modal
        await page.goto('/');
        const newWsBtn = page.getByRole('button', { name: /New Workspace/i });
        await expect(newWsBtn).toBeVisible();
        await newWsBtn.click();

        // Wait for modal content
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(500); // Wait for modal animation
        await page.screenshot({ path: path.join(SS_DIR, '04_create_workspace_modal.png') });

        // Create workspace for flow
        const wsName = `Audit WS ${Date.now()}`;
        await page.getByLabel(/^Name$/i).fill(wsName);
        await page.getByRole('button', { name: 'Create Workspace' }).click();

        // 5. Chat Page (New Thread)
        const wsCard = page.getByText(wsName);
        await expect(wsCard).toBeVisible({ timeout: 15000 });
        await wsCard.click();
        await expect(page).toHaveURL(/\/chat/);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(SS_DIR, '05_chat_page_empty.png'), fullPage: true });

        // 6. Chat Interaction
        const chatInput = page.getByPlaceholder('Type your message...');
        await chatInput.fill('Hello Karag!');
        await page.keyboard.press('Enter');
        // Wait for user message
        await expect(page.getByText('Hello Karag!')).toBeVisible();
        // Wait for bot response (even just "Thinking...")
        await expect(page.getByText('Thinking...').or(page.locator('.prose'))).toBeVisible({ timeout: 10000 });
        await page.screenshot({ path: path.join(SS_DIR, '06_chat_interaction.png'), fullPage: true });

        // 7. Documents Page
        await page.getByRole('link', { name: "Documents" }).click();
        await expect(page).toHaveURL(/\/documents/);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(SS_DIR, '07_documents_empty.png'), fullPage: true });

        // 8. Upload Modal
        // Assuming there is an upload button
        const uploadBtn = page.getByRole('button', { name: /Upload/i });
        if (await uploadBtn.isVisible()) {
            await uploadBtn.click();
            await expect(page.getByRole('dialog')).toBeVisible();
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(SS_DIR, '08_upload_modal.png') });
            // Close modal
            await page.keyboard.press('Escape');
        }

        // 9. Knowledge Page / Vault (if exists in nav)
        // Check sidebar or header for Vault/Knowledge link
        // Based on file structure, there is /vault page
        await page.goto('/vault');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(SS_DIR, '09_vault_page.png'), fullPage: true });

        // 10. Settings Page
        // Go back to workspace settings
        // Need ID or just navigate via UI
        await page.goBack(); // Back to Documents?
        await page.goBack(); // Back to Chat? 
        // Safer to click the link if visible, or construct URL
        // We are inside a workspace context if we just navigated back. Let's force navigate to the workspace we created.
        // We don't have the ID easily unless we parse URL.
        // Let's go home and click the card again to be safe
        await page.goto('/');
        await page.getByText(wsName).click();
        await page.getByRole('link', { name: "Settings" }).click();
        await expect(page).toHaveURL(/\/settings/);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: path.join(SS_DIR, '10_settings_page.png'), fullPage: true });

        console.log('All screenshots captured successfully in /screenshots');
    });
});
