
import { test } from '@playwright/test';

/**
 * Showcase Screenshot Capture (Real App)
 * 
 * Captures key views for project showcase:
 * - Admin Console (Overview, Observability)
 * - User Experience (Dashboard, Chat, Vault)
 * 
 * Prerequisites: ./run.sh turbo must be running.
 */
test.describe('Showcase Capture', () => {

    // === USER FEATURES (3 Screens) ===

    test('capture user dashboard', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 }); // High-res for showcase
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000); // Animations
        await page.screenshot({ path: '../assets/screenshots/showcase_user_dashboard.png', fullPage: true });
    });

    test('capture chat interface', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('http://localhost:3000/workspaces/default/chat', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '../assets/screenshots/showcase_user_chat.png', fullPage: true });
    });

    test('capture master vault', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('http://localhost:3000/vault', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: '../assets/screenshots/showcase_user_vault.png', fullPage: true });
    });

    // === ADMIN CONSOLE (2 Screens) ===

    test('capture admin overview', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Ensure Overview tab is active (default)
        await page.screenshot({ path: '../assets/screenshots/showcase_admin_overview.png', fullPage: true });
    });

    test('capture admin observability', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        // Click the Observability tab
        await page.getByText('Observability').click();
        await page.waitForTimeout(500); // Tab transition

        await page.screenshot({ path: '../assets/screenshots/showcase_admin_observability.png', fullPage: true });
    });

});
