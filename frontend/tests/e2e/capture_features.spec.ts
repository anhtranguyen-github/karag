
import { test, expect } from '@playwright/test';

/**
 * Screenshot Capture from REAL Running Application
 * 
 * These tests connect to the real backend (localhost:8000) and frontend (localhost:3000).
 * No mocks — all data comes from the actual running services.
 * 
 * Prerequisites: ./run.sh turbo must be running.
 */
test.describe('Feature Capture (Real App)', () => {

    test('capture dashboard', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 });
        // Extra wait for animations to settle
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '../assets/screenshots/workspaces_dashboard.png', fullPage: true });
    });

    test('capture master vault', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('http://localhost:3000/vault', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '../assets/screenshots/master_vault.png', fullPage: true });
    });

    test('capture workspace overview', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('http://localhost:3000/workspaces/default', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '../assets/screenshots/workspace_overview.png', fullPage: true });
    });

    test('capture chat interface', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('http://localhost:3000/workspaces/default/chat', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '../assets/screenshots/chat_interface.png', fullPage: true });
    });

    test('capture document management', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('http://localhost:3000/workspaces/default/documents', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '../assets/screenshots/document_management.png', fullPage: true });
    });

    test('capture admin panel', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('http://localhost:3000/admin', { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: '../assets/screenshots/admin_panel.png', fullPage: true });
    });
});
