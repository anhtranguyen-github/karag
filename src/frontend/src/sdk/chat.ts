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
        return chatCompletionsApiV1V1ChatCompletionsPost(data);
    },
    listThreads(data: ListChatThreadsApiV1WorkspacesWorkspaceIdChatThreadsGetData) {
        return listChatThreadsApiV1WorkspacesWorkspaceIdChatThreadsGet(data);
    },
    getThread(data: GetThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdGetData) {
        return getThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdGet(data);
    },
    deleteThread(data: DeleteThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdDeleteData) {
        return deleteThreadApiV1WorkspacesWorkspaceIdChatThreadsThreadIdDelete(data);
    },
    getHistory(data: GetChatHistoryApiV1WorkspacesWorkspaceIdChatHistoryThreadIdGetData) {
        return getChatHistoryApiV1WorkspacesWorkspaceIdChatHistoryThreadIdGet(data);
    },
    stream(data: ChatStreamApiV1WorkspacesWorkspaceIdChatStreamPostData) {
        return chatStreamApiV1WorkspacesWorkspaceIdChatStreamPost(data);
    },
    updateTitle(data: UpdateThreadTitleApiV1WorkspacesWorkspaceIdChatThreadsThreadIdTitlePatchData) {
        return updateThreadTitleApiV1WorkspacesWorkspaceIdChatThreadsThreadIdTitlePatch(data);
    }
};
