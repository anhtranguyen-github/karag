import "./client";
import {
    chatCompletionsApiV1V1ChatCompletionsPost,
    listChatThreadsApiV1WorkspacesWorkspaceIdChatThreadsGet,
    getThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdGet,
    deleteThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdDelete,
    getChatHistoryApiV1WorkspacesWorkspaceIdChatHistoryThreadIdGet,
    chatStreamApiV1WorkspacesWorkspaceIdChatStreamPost,
    updateThreadTitleApiV1WorkspacesWorkspaceIdChatThreadsThreadIdTitlePatch,
    type ChatCompletionsApiV1V1ChatCompletionsPostData,
    type ListChatThreadsApiV1WorkspacesWorkspaceIdChatThreadsGetData,
    type GetThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdGetData,
    type DeleteThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdDeleteData,
    type GetChatHistoryApiV1WorkspacesWorkspaceIdChatHistoryThreadIdGetData,
    type ChatStreamApiV1WorkspacesWorkspaceIdChatStreamPostData,
    type UpdateThreadTitleApiV1WorkspacesWorkspaceIdChatThreadsThreadIdTitlePatchData
} from "./generated";

export const chat = {
    completions(data: ChatCompletionsApiV1V1ChatCompletionsPostData) {
        return chatCompletionsApiV1V1ChatCompletionsPost({
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    listThreads(data: ListChatThreadsApiV1WorkspacesWorkspaceIdChatThreadsGetData | Record<string, unknown>) {
        return listChatThreadsApiV1WorkspacesWorkspaceIdChatThreadsGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
        });
    },
    getThread(data: GetThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdGetData | Record<string, unknown>) {
        return getThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdGet({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                thread_id: (data as any)?.threadId ?? (data as any)?.thread_id,
            },
        });
    },
    deleteThread(data: DeleteThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdDeleteData | Record<string, unknown>) {
        return deleteThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdDelete({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                thread_id: (data as any)?.threadId ?? (data as any)?.thread_id,
            },
        });
    },
    getHistory(data: GetChatHistoryApiV1WorkspacesWorkspaceIdChatHistoryThreadIdGetData | Record<string, unknown>) {
        return getChatHistoryApiV1WorkspacesWorkspaceIdChatHistoryThreadIdGet({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                thread_id: (data as any)?.threadId ?? (data as any)?.thread_id,
            },
        });
    },
    stream(data: ChatStreamApiV1WorkspacesWorkspaceIdChatStreamPostData | Record<string, unknown>) {
        return chatStreamApiV1WorkspacesWorkspaceIdChatStreamPost({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    updateTitle(data: UpdateThreadTitleApiV1WorkspacesWorkspaceIdChatThreadsThreadIdTitlePatchData | Record<string, unknown>) {
        return updateThreadTitleApiV1WorkspacesWorkspaceIdChatThreadsThreadIdTitlePatch({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                thread_id: (data as any)?.threadId ?? (data as any)?.thread_id,
            },
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    }
};
