import "./client";
import {
    globalSearchApiV1WorkspacesWorkspaceIdSearchGet,
    vectorSearchApiV1WorkspacesWorkspaceIdSearchVectorGet,
    type GlobalSearchApiV1WorkspacesWorkspaceIdSearchGetData,
    type VectorSearchApiV1WorkspacesWorkspaceIdSearchVectorGetData
} from "./generated";

export const search = {
    global(data: GlobalSearchApiV1WorkspacesWorkspaceIdSearchGetData | Record<string, unknown>) {
        return globalSearchApiV1WorkspacesWorkspaceIdSearchGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            query: (data as any)?.query ?? { q: (data as any)?.q, limit: (data as any)?.limit },
        });
    },
    vector(data: VectorSearchApiV1WorkspacesWorkspaceIdSearchVectorGetData | Record<string, unknown>) {
        return vectorSearchApiV1WorkspacesWorkspaceIdSearchVectorGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            query: (data as any)?.query ?? { q: (data as any)?.q, limit: (data as any)?.limit },
        });
    }
};
