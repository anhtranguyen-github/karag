import { test, expect } from '@playwright/test';

test.describe('Chat Persistence and Streaming', () => {
    test.beforeEach(async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));
        // Go to the "New Chat" page
        await page.goto('/chats/new');
    });

    test('should persist message state during URL redirect on first message', async ({ page }) => {
        const input = page.getByPlaceholder('Type your message...');

        // 1. Initial State Check
        await expect(page.getByText('Ask anything about your documents')).toBeVisible();
        await expect(input).toBeVisible();

        // 2. Send Message
        const testMessage = 'Hello, this is a persistence test ' + Date.now();
        await input.fill(testMessage);
        await page.keyboard.press('Enter');

        // 3. Validate URL Redirect
        // The URL should change from /chats/new to a UUID-based path
        // We rely on the default timeout now as requested.
        await expect(page).toHaveURL(/\/chats\/[0-9a-f-]{36}/);

        // 4. Verify State Retention
        await expect(page.getByText(testMessage)).toBeVisible();

        // 5. Verify Streaming Initialization
        await expect(page.getByText('Searching and processing...')).toBeVisible();

        // 6. Verify Assistant Content Streaming
        const assistantBubble = page.locator('.bg-card').first();
        await expect(assistantBubble).toBeVisible();

        // The bubble should eventually contain text (streaming)
        await expect(assistantBubble).not.toHaveText('');
    });

    test('should handle mode switching during active stream', async ({ page }) => {
        const input = page.getByPlaceholder('Type your message...');

        await input.fill('Write a long essay about AI safety');
        await page.keyboard.press('Enter');

        // Switch to "Thinking" mode while it's still processing
        // Using regex for flexibility with case
        const thinkingMode = page.getByRole('button', { name: /thinking/i });
        await expect(thinkingMode).toBeVisible();

        // Even if we click it, it should be disabled if isLoading is true
        await expect(thinkingMode).toBeDisabled();

        await expect(page.getByText('Searching and processing...')).toBeVisible();
    });
});
