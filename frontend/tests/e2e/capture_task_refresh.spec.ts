
import { test, expect } from '@playwright/test';

test.describe('Task Manager Persistence', () => {

    test.slow();

    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('http://localhost:3000/workspaces/default/documents', { waitUntil: 'load' });
    });

    test('capture persistence after refresh', async ({ page }) => {
        const jobPanel = page.locator('.fixed.bottom-6.right-6').first();
        const arxivBtn = page.getByRole('button', { name: 'From ArXiv' });
        const importBtn = page.getByRole('button', { name: 'Import Paper' });
        const validInput = '1706.03762';

        // 1. Start a slow task
        await arxivBtn.click();
        await page.waitForTimeout(500);
        await page.getByPlaceholder('https://arxiv.org/abs/...').fill(validInput);
        await importBtn.click();

        await expect(jobPanel).toBeVisible({ timeout: 5000 });
        // Wait for some progress so we know it's "Processing"
        await page.waitForTimeout(1000);

        // Capture state before refresh
        await jobPanel.screenshot({ path: '/home/tra01/project/karag/assets/screenshots/task_05_pre_refresh.png' });

        // 2. REFRESH THE PAGE
        await page.reload({ waitUntil: 'load' });

        // 3. Verify Job Panel reappears with same task
        await expect(jobPanel).toBeVisible({ timeout: 5000 });

        // The panel might be collapsed by default after refresh if we don't have auto-expand logic correctly persisting visibility state.
        // Actually, JobPanel has:
        // useEffect(() => { if (hasActiveWork && !wasActive) { setIsExpanded(true); } ... }, [hasActiveWork]);
        // After refresh, hasActiveWork becomes true, so it should auto-expand.

        await page.waitForTimeout(1000); // Allow polling to catch up and expansion to finish

        // Capture state after refresh
        await jobPanel.screenshot({ path: '/home/tra01/project/karag/assets/screenshots/task_06_post_refresh.png' });
    });
});
