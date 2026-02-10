import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/lib/api-config';

export const handlers = [
    // Workspaces Handler
    http.get(`${API_BASE_URL}/workspaces`, () => {
        return HttpResponse.json([
            {
                id: 'default',
                name: 'Default Workspace',
                description: 'Mocked Default Workspace',
                stats: { thread_count: 5, doc_count: 10 },
            },
            {
                id: 'mock-ws-1',
                name: 'Project Alpha',
                description: 'Mocked Project Alpha',
                stats: { thread_count: 2, doc_count: 3 },
            },
        ]);
    }),

    // Documents Handler
    http.get(`${API_BASE_URL}/documents`, () => {
        return HttpResponse.json([
            {
                id: 'doc-1',
                name: 'research_paper.pdf',
                workspace_id: 'default',
                status: 'indexed',
                size_bytes: 102400,
                created_at: new Date().toISOString()
            }
        ])
    }),

    // Chat History Handler
    http.get(`${API_BASE_URL}/chat/history/:threadId`, ({ params }) => {
        return HttpResponse.json({
            messages: [
                { role: 'user', content: 'Hello from Mock' },
                { role: 'assistant', content: `Mock response for thread ${params.threadId}` }
            ]
        })
    })
];
