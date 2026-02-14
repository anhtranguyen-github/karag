
import { test, expect } from '@playwright/test';

test.describe('Task Manager Capture Sequenced', () => {

    test.slow();

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('http://localhost:3000/workspaces/default/documents', { waitUntil: 'load' });
    });

    test('capture all task states', async ({ page }) => {
        const jobPanel = page.locator('.fixed.bottom-6.right-6').first();
        const arxivBtn = page.getByRole('button', { name: 'From ArXiv' });
        const importBtn = page.getByRole('button', { name: 'Import Paper' });
        const invalidInput = '9999.99999';
        const failInput = '0000.00000'; // Or just something invalid
        const validInput = '1706.03762'; // Attention Is All You Need

        // --- 1. Failed State and Retry ---
        await arxivBtn.click();
        await page.waitForTimeout(500);
        await page.getByPlaceholder('https://arxiv.org/abs/...').fill(failInput);
        await importBtn.click();

        await expect(jobPanel).toBeVisible({ timeout: 5000 });
        // Wait for failure (red text or failure indicator)
        // We'll wait a bit longer for the backend to process the invalid ID
        await page.waitForTimeout(3000);

        // Screenshot Failed
        await jobPanel.screenshot({ path: '/home/tra01/project/karag/assets/screenshots/task_01_failed_focused.png' });

        // --- 2. Retry ---
        const retryBtn = jobPanel.locator('button[title="Retry Operation"]');
        if (await retryBtn.isVisible()) {
            await retryBtn.click();
            await page.waitForTimeout(500); // Wait for transition
            await jobPanel.screenshot({ path: '/home/tra01/project/karag/assets/screenshots/task_02_retrying_focused.png' });
        }

        // Clean slate: Reload to clear the failed task or just ignore it
        await page.reload({ waitUntil: 'networkidle' });

        // --- 3. Running State ---
        await arxivBtn.click();
        await page.waitForTimeout(500);
        await page.getByPlaceholder('https://arxiv.org/abs/...').fill(validInput);
        await importBtn.click();

        await expect(jobPanel).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(500); // Wait for progress

        // Screenshot Running
        await jobPanel.screenshot({ path: '/home/tra01/project/karag/assets/screenshots/task_03_running_focused.png' });

        // --- 4. Cancelled State ---
        const cancelBtn = jobPanel.locator('button[title="Stop Current Progress"]');
        if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
            await page.waitForTimeout(1000); // Wait for cancellation

            // Screenshot Cancelled
            await jobPanel.screenshot({ path: '/home/tra01/project/karag/assets/screenshots/task_04_cancelled_focused.png' });
        }
    });

});
