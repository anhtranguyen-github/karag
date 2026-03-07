import { http, HttpResponse } from 'msw';
import { API_BASE_URL } from '@/lib/api-config';

export const handlers = [
    http.get('http://localhost:8000/', () => {
        return HttpResponse.json({
            status: 'online',
            version: '1.0.0',
        });
    }),

    http.get('http://localhost:8000/health', () => {
        return HttpResponse.json({
            status: 'online',
            version: '1.0.0',
        });
    }),

    // Workspaces Handler
    http.get(`${API_BASE_URL}/workspaces`, () => {
        return HttpResponse.json({
            success: true,
            code: "SUCCESS",
            message: "Workspaces loaded",
            data: [
                {
                    id: 'default',
                    name: 'Document Storage',
                    description: 'Primary knowledge storage',
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
            code: "SUCCESS",
            message: "Tasks loaded",
            data: []
        });
    }),

    // Chat Threads Metadata
    http.get(`${API_BASE_URL}/chat/threads/:id`, ({ params }) => {
        return HttpResponse.json({
            success: true,
            code: "SUCCESS",
            message: "Thread loaded",
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
                code: "SUCCESS",
                message: "No results",
                data: []
            });
        }
        return HttpResponse.json({
            success: true,
            code: "SUCCESS",
            message: "Search success",
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

    http.get(`${API_BASE_URL}/workspaces/:workspaceId/search/`, ({ request }) => {
        const url = new URL(request.url);
        const query = url.searchParams.get('q');
        if (query === 'nonexistent') {
            return HttpResponse.json({
                success: true,
                code: "SUCCESS",
                message: "No results",
                data: [],
            });
        }

        return HttpResponse.json({
            success: true,
            code: "SUCCESS",
            message: "Search success",
            data: [
                {
                    id: 'res-1',
                    title: 'Search Result 1',
                    snippet: `This is a mocked search result for: ${query}`,
                    workspace_id: 'default',
                },
            ],
        });
    }),

    // Chat History Handler
    http.get(`${API_BASE_URL}/chat/history/:threadId`, ({ params }) => {
        return HttpResponse.json({
            success: true,
            code: "SUCCESS",
            message: "History loaded",
            data: [
                { id: '1', role: 'user', content: 'Hello from Mock' },
                { id: '2', role: 'assistant', content: `Mock response for thread ${params.threadId}` }
            ]
        });
    }),

    http.get(`${API_BASE_URL}/workspaces/:workspaceId/chat/history/:threadId`, ({ params }) => {
        return HttpResponse.json({
            success: true,
            code: "SUCCESS",
            message: "History loaded",
            data: [
                { id: '1', role: 'user', content: 'Hello from Mock' },
                { id: '2', role: 'assistant', content: `Mock response for thread ${params.threadId}` },
            ],
        });
    }),

    // Settings Handler
    http.get(`${API_BASE_URL}/settings`, () => {
        return HttpResponse.json({
            success: true,
            code: "SUCCESS",
            message: "Settings loaded",
            data: {
                llm_providers: ["openai", "ollama"],
                embedding_providers: ["openai", "ollama"]
            }
        });
    }),

    http.get(`${API_BASE_URL}/admin/settings`, () => {
        return HttpResponse.json({
            success: true,
            code: "SUCCESS",
            message: "Admin settings loaded",
            data: {},
        });
    }),
];
