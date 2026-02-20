
import { test, expect } from '@playwright/test';

test.describe('Document Upload Failure Handling', () => {

    test('should show error modal when background processing fails', async ({ page }) => {
        // Mock the upload endpoint to return success (initial 200 OK)
        await page.route('**/upload**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: "Upload accepted", task_id: "task_123" })
            });
        });

        // Mock the tasks polling endpoint to simulate a FAILED task
        // First poll: Pending
        // Second poll: Failed
        let pollCount = 0;
        await page.route('**/tasks/?type=ingestion', async route => {
            pollCount++;
            if (pollCount === 1) {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        tasks: [{
                            id: "task_123",
                            status: "pending",
                            progress: 0,
                            metadata: { workspace_id: "default", filename: "corrupt_file.pdf" }
                        }]
                    })
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        tasks: [{
                            id: "task_123",
                            status: "failed",
                            progress: 0,
                            message: "Corrupt PDF structure detected",
                            metadata: { workspace_id: "default", filename: "corrupt_file.pdf" }
                        }]
                    })
                });
            }
        });

        // Go to documents page
        await page.goto('/workspaces/default/documents');

        // Trigger upload interaction
        // Note: In a real test we'd attach a file, but since we mocked the network, 
        // we just need to trigger the frontend logic.
        // Locate the file input based on the label structure we know exists
        // The input is hidden with class "hidden", but Playwright can interact with it using setInputFiles if we target it correctly.
        // We target the input specifically, regardless of visibility.
        const fileInput = page.locator('input[type="file"]');

        // Wait for the button to be visible to ensure the component is mounted
        const uploadButton = page.getByRole('button', { name: 'Upload Document' });
        await expect(uploadButton).toBeVisible();

        // Create a dummy file object for the input
        await fileInput.setInputFiles({
            name: 'corrupt_file.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('invalid pdf content')
        });

        // Wait for polling to pick up the failure (approx 2-3 seconds based on interval)
        // We expect the error modal to appear
        await expect(page.getByText('Ingestion Failed')).toBeVisible();
        await expect(page.getByText('Corrupt PDF structure detected')).toBeVisible();
    });

    test('should show error modal when upload endpoint fails immediately (400/500)', async ({ page }) => {
        // Mock immediate failure from upload endpoint
        await page.route('**/upload**', async route => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({ detail: "File too large" })
            });
        });

        // Go to documents page
        await page.goto('/workspaces/default/documents');

        // Wait for upload button to ensure page is loaded
        const uploadButton = page.getByRole('button', { name: 'Upload Document' });
        await expect(uploadButton).toBeVisible();

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles({
            name: 'large_file.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('fake content')
        });

        // Expect immediate error modal
        await expect(page.getByText('Ingestion Rejected')).toBeVisible();
        await expect(page.getByText('File too large')).toBeVisible();
    });

    test('should show user-friendly error for invalid filenames (illegal path)', async ({ page }) => {
        // Since we have optimistic validation, we expect the UI to catch it immediately.
        // We'll also test the backend fallback just in case.
        await page.route('**/upload**', async route => {
            await route.fulfill({
                status: 400,
                contentType: 'application/json',
                body: JSON.stringify({
                    code: "VALIDATION_ERROR",
                    detail: "Filename contains illegal characters: :"
                })
            });
        });

        await page.goto('/workspaces/default/documents');

        const fileInput = page.locator('input[type="file"]');
        await expect(page.getByRole('button', { name: 'Upload Document' })).toBeVisible();

        await fileInput.setInputFiles({
            name: 'invalid:file.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('fake content')
        });

        // The specific text is now slightly different based on the structured params/message
        await expect(page.getByText('Invalid Filename')).toBeVisible();
        await expect(page.getByText('contains characters that are not allowed')).toBeVisible();
    });
    test('should show error for duplicate document (CONFLIT_ERROR)', async ({ page }) => {
        await page.route('**/upload**', async route => {
            await route.fulfill({
                status: 409,
                contentType: 'application/json',
                body: JSON.stringify({
                    code: "CONFLICT_ERROR",
                    detail: "Document already exists"
                })
            });
        });

        await page.goto('/workspaces/default/documents');

        const fileInput = page.locator('input[type="file"]');
        await expect(page.getByRole('button', { name: 'Upload Document' })).toBeVisible();

        await fileInput.setInputFiles({
            name: 'duplicate.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('content')
        });

        await expect(page.getByText('Duplicate Document')).toBeVisible();
        await expect(page.getByText('already exists')).toBeVisible();
    });

});
