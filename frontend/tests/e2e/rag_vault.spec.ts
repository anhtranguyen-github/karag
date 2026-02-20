import { test, expect } from '@playwright/test';

test.describe('RAG & Vault E2E', () => {

    test('should handle global vault deletion', async ({ page }) => {
        // 1. Go to Documents
        await page.goto('/documents');

        // Wait for docs to load
        await page.waitForResponse(res => res.url().includes('/documents-all') && res.status() === 200);

        // Locate document row
        const docRow = page.locator('tbody tr').first();
        const docNameEl = docRow.getByTestId('doc-name');

        if (await docNameEl.count() === 0) {
            console.log("No documents found, skipping.");
            return;
        }

        const docName = await docNameEl.getAttribute('data-doc-name') || '';

        // Find delete button WITHIN the same row
        await docRow.locator('button[data-testid^="delete-doc-"]').click();

        // Verify Modal is open
        await expect(page.getByText('Delete Document?')).toBeVisible();

        // Toggle Vault Purge
        await page.getByTestId('vault-purge-toggle').click();

        // Confirm
        const deletePromise = page.waitForResponse(res =>
            res.url().includes(`/documents/${encodeURIComponent(docName)}`) &&
            res.request().method() === 'DELETE' &&
            res.status() === 200
        );
        await page.getByTestId('confirm-purge-btn').click();

        await deletePromise;

        // Verify it's gone
        await expect(page.getByTestId('doc-name').filter({ hasText: docName })).not.toBeVisible();
    });

    test('should handle master vault management and deletion', async ({ page }) => {
        // 1. Go to Master Vault
        await page.goto('/vault');

        // Wait for docs to load
        await page.waitForResponse(res => res.url().includes('/documents-all') && res.status() === 200);

        // Locate document card
        const _docCard = page.locator('[data-testid="doc-name"]').first().locator('xpath=./../../../../..'); // Go up to the card container
        // Actually, let's just use the docNameEl to get the name and then find the button.
        const docNameEl = page.getByTestId('doc-name').first();

        if (await docNameEl.count() === 0) {
            console.log("No documents in vault, skipping.");
            return;
        }

        const docName = await docNameEl.getAttribute('data-doc-name') || '';

        // Click delete on KnowledgeBase - using a more robust selector
        await page.locator(`button[data-testid="delete-doc-${docName}"]`).first().click();

        // Verify choice modal
        await expect(page.getByText('Destructive Operation Pending')).toBeVisible();

        // Perform Global Purge
        const deletePromise = page.waitForResponse(res =>
            res.url().includes(`/documents/${encodeURIComponent(docName)}`) &&
            res.request().method() === 'DELETE' &&
            res.status() === 200
        );

        await page.getByTestId('confirm-purge-btn').click();
        await deletePromise;

        // Verify gone
        await expect(page.getByTestId('doc-name').filter({ hasText: docName })).not.toBeVisible();
    });
});
