
import { test, expect } from '@playwright/test';

test.describe('Feature Capture with Mocks', () => {
    test.beforeEach(async ({ page }) => {
        // Mock workspaces list
        await page.route('**/api/v1/workspaces', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'default', name: 'General Research', description: 'Primary workspace for daily analysis', stats: { thread_count: 5, doc_count: 12 } },
                    { id: 'project-x', name: 'Project X', description: 'Confidential architecture project', stats: { thread_count: 2, doc_count: 45 } }
                ])
            });
        });

        // Mock chat history with citations and reasoning
        await page.route('**/api/v1/chat/history/**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    messages: [
                        { id: '1', role: 'user', content: 'What are the core principles of the proposed architecture?' },
                        {
                            id: '2',
                            role: 'assistant',
                            content: 'The core principles are based on Scalability [1], Modularity [2], and Resilience [3]. These pillars ensure that the system can handle peak loads while remaining maintainable.',
                            reasoning_steps: [
                                'Analyzing document segments from the Project X workspace.',
                                'Identifying recurring themes in the architecture proposal.',
                                'Synthesizing the three primary technical pillars.',
                                'Cross-referencing with industry best practices for RAG systems.'
                            ],
                            tools: ['Document Retriever', 'Semantic Search Engine'],
                            sources: [
                                { id: 1, name: 'Architecture_Proposal_v2.pdf', content: 'Scalability is achieved through horizontal partitioning...' },
                                { id: 2, name: 'Design_Patterns.md', content: 'Modularity allows independent scaling of services...' },
                                { id: 3, name: 'Reliability_Report.docx', content: 'Resilience is built into the circuit breaker implementation...' }
                            ]
                        }
                    ]
                })
            });
        });

        // Mock documents for the vault
        await page.route('**/api/v1/documents/all', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'd1', name: 'Neural_Network_Baseline.pdf', extension: 'pdf', workspace_id: 'default', chunks: 145, status: 'indexed' },
                    { id: 'd2', name: 'System_Logs_Q4.txt', extension: 'txt', workspace_id: 'project-x', chunks: 56, status: 'indexed' },
                    { id: 'd3', name: 'Security_Audit_2025.pdf', extension: 'pdf', workspace_id: 'default', chunks: 89, status: 'indexed' }
                ])
            });
        });
    });

    test('capture dashboard', async ({ page }) => {
        await page.goto('http://localhost:3000/');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'public/screenshots/workspaces_dashboard.png', fullPage: true });
    });

    test('capture master vault', async ({ page }) => {
        await page.goto('http://localhost:3000/vault');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'public/screenshots/master_vault.png', fullPage: true });
    });

    test('capture workspace overview', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'public/screenshots/workspace_overview.png', fullPage: true });
    });

    test('capture chat interface', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default/chat');
        await page.waitForLoadState('networkidle');

        // Expand reasoning to show it
        const thinkingButton = page.getByRole('button', { name: /Thinking Process/i });
        if (await thinkingButton.isVisible()) {
            await thinkingButton.click();
            await page.waitForTimeout(500); // Wait for animation
        }

        await page.screenshot({ path: 'public/screenshots/chat_interface.png', fullPage: true });
    });

    test('capture document management', async ({ page }) => {
        await page.goto('http://localhost:3000/workspaces/default/documents');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'public/screenshots/document_management.png', fullPage: true });
    });
});
