import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/lib/api-config';

export const handlers = [
    // Workspaces Handler
    http.get(`${API_BASE_URL}/workspaces`, () => {
        return HttpResponse.json({
            success: true,
            data: [
                {
                    id: 'default',
                    name: 'Default Workspace',
                    description: 'Mocked Default Workspace',
                    llm_provider: 'openai',
                    embedding_provider: 'openai',
                    rag_engine: 'simple',
                    stats: { thread_count: 5, doc_count: 10 },
                },
                {
                    id: 'mock-ws-1',
                    name: 'Project Alpha',
                    description: 'Mocked Project Alpha',
                    llm_provider: 'openai',
                    embedding_provider: 'openai',
                    rag_engine: 'chroma',
                    stats: { thread_count: 2, doc_count: 3 },
                },
            ]
        });
    }),

    // Tasks Handler
    http.get(`${API_BASE_URL}/tasks`, () => {
        return HttpResponse.json({
            success: true,
            data: []
        });
    }),

    // Chat Threads Metadata
    http.get(`${API_BASE_URL}/chat/threads/:id`, ({ params }) => {
        return HttpResponse.json({
            success: true,
            data: {
                id: params.id,
                workspace_id: 'default',
                title: 'Mock Thread'
            }
        });
    }),

    // Documents Handler
    http.get(`${API_BASE_URL}/documents`, () => {
        return HttpResponse.json({
            success: true,
            data: [
                {
                    id: 'doc-1',
                    name: 'research_paper.pdf',
                    workspace_id: 'default',
                    status: 'indexed',
                    size_bytes: 102400,
                    created_at: new Date().toISOString()
                }
            ]
        });
    }),

    // Search Handler
    http.get(`${API_BASE_URL}/search`, ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('q');
        if (query === 'nonexistent') {
            return HttpResponse.json({
                success: true,
                data: []
            });
        }
        return HttpResponse.json({
            success: true,
            data: [
                {
                    id: 'res-1',
                    title: 'Search Result 1',
                    snippet: 'This is a mocked search result for: ' + query,
                    workspace_id: 'default'
                }
            ]
        });
    }),

    // Chat History Handler
    http.get(`${API_BASE_URL}/chat/history/:threadId`, ({ params }) => {
        return HttpResponse.json({
            success: true,
            data: [
                { id: '1', role: 'user', content: 'Hello from Mock' },
                { id: '2', role: 'assistant', content: `Mock response for thread ${params.threadId}` }
            ]
        });
    })
];
