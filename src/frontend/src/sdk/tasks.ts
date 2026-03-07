import {
    listTasksApiV1WorkspacesWorkspaceIdTasksGet,
    getTaskStatusApiV1WorkspacesWorkspaceIdTasksTaskIdGet,
    retryTaskApiV1WorkspacesWorkspaceIdTasksTaskIdRetryPost,
    cancelTaskApiV1WorkspacesWorkspaceIdTasksTaskIdCancelPost,
    cleanupTasksApiV1WorkspacesWorkspaceIdTasksCleanupDelete,
    type ListTasksApiV1WorkspacesWorkspaceIdTasksGetData,
    type GetTaskStatusApiV1WorkspacesWorkspaceIdTasksTaskIdGetData,
    type RetryTaskApiV1WorkspacesWorkspaceIdTasksTaskIdRetryPostData,
    type CancelTaskApiV1WorkspacesWorkspaceIdTasksTaskIdCancelPostData,
    type CleanupTasksApiV1WorkspacesWorkspaceIdTasksCleanupDeleteData
} from "./generated";

export const tasks = {
    list(data: ListTasksApiV1WorkspacesWorkspaceIdTasksGetData) {
        return listTasksApiV1WorkspacesWorkspaceIdTasksGet(data);
    },
    getStatus(data: GetTaskStatusApiV1WorkspacesWorkspaceIdTasksTaskIdGetData) {
        return getTaskStatusApiV1WorkspacesWorkspaceIdTasksTaskIdGet(data);
    },
    retry(data: RetryTaskApiV1WorkspacesWorkspaceIdTasksTaskIdRetryPostData) {
        return retryTaskApiV1WorkspacesWorkspaceIdTasksTaskIdRetryPost(data);
    },
    cancel(data: CancelTaskApiV1WorkspacesWorkspaceIdTasksTaskIdCancelPostData) {
        return cancelTaskApiV1WorkspacesWorkspaceIdTasksTaskIdCancelPost(data);
    },
    cleanup(data: CleanupTasksApiV1WorkspacesWorkspaceIdTasksCleanupDeleteData) {
        return cleanupTasksApiV1WorkspacesWorkspaceIdTasksCleanupDelete(data);
    }
};
