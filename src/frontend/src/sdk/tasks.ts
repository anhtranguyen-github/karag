import "./client";
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
    list(data: ListTasksApiV1WorkspacesWorkspaceIdTasksGetData | Record<string, unknown>) {
        return listTasksApiV1WorkspacesWorkspaceIdTasksGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
        });
    },
    getStatus(data: GetTaskStatusApiV1WorkspacesWorkspaceIdTasksTaskIdGetData | Record<string, unknown>) {
        return getTaskStatusApiV1WorkspacesWorkspaceIdTasksTaskIdGet({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                task_id: (data as any)?.taskId ?? (data as any)?.task_id,
            },
        });
    },
    retry(data: RetryTaskApiV1WorkspacesWorkspaceIdTasksTaskIdRetryPostData | Record<string, unknown>) {
        return retryTaskApiV1WorkspacesWorkspaceIdTasksTaskIdRetryPost({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                task_id: (data as any)?.taskId ?? (data as any)?.task_id,
            },
        });
    },
    cancel(data: CancelTaskApiV1WorkspacesWorkspaceIdTasksTaskIdCancelPostData | Record<string, unknown>) {
        return cancelTaskApiV1WorkspacesWorkspaceIdTasksTaskIdCancelPost({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                task_id: (data as any)?.taskId ?? (data as any)?.task_id,
            },
        });
    },
    cleanup(data: CleanupTasksApiV1WorkspacesWorkspaceIdTasksCleanupDeleteData | Record<string, unknown>) {
        return cleanupTasksApiV1WorkspacesWorkspaceIdTasksCleanupDelete({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
        });
    }
};
