import "./client";
import {
    listWorkspacesApiV1WorkspacesGet,
    createWorkspaceApiV1WorkspacesPost,
    updateWorkspaceApiV1WorkspacesWorkspaceIdPatch,
    deleteWorkspaceApiV1WorkspacesWorkspaceIdDelete,
    getWorkspaceDetailsApiV1WorkspacesWorkspaceIdDetailsGet,
    getWorkspaceGraphApiV1WorkspacesWorkspaceIdGraphGet,
    getSettingsApiV1WorkspacesWorkspaceIdSettingsGet,
    updateSettingsApiV1WorkspacesWorkspaceIdSettingsPatch,
    getSettingsMetadataApiV1WorkspacesWorkspaceIdSettingsMetadataGet,
    type CreateWorkspaceApiV1WorkspacesPostData,
    type UpdateWorkspaceApiV1WorkspacesWorkspaceIdPatchData,
    type DeleteWorkspaceApiV1WorkspacesWorkspaceIdDeleteData,
    type GetWorkspaceDetailsApiV1WorkspacesWorkspaceIdDetailsGetData,
    type GetWorkspaceGraphApiV1WorkspacesWorkspaceIdGraphGetData,
    type GetSettingsApiV1WorkspacesWorkspaceIdSettingsGetData,
    type UpdateSettingsApiV1WorkspacesWorkspaceIdSettingsPatchData,
    type GetSettingsMetadataApiV1WorkspacesWorkspaceIdSettingsMetadataGetData
} from "./generated";

export const workspaces = {
    list() {
        return listWorkspacesApiV1WorkspacesGet();
    },
    create(data: CreateWorkspaceApiV1WorkspacesPostData | { body?: unknown; requestBody?: unknown } | Record<string, unknown>) {
        return createWorkspaceApiV1WorkspacesPost({
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    update(data: UpdateWorkspaceApiV1WorkspacesWorkspaceIdPatchData | Record<string, unknown>) {
        return updateWorkspaceApiV1WorkspacesWorkspaceIdPatch({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    delete(data: DeleteWorkspaceApiV1WorkspacesWorkspaceIdDeleteData | Record<string, unknown>) {
        return deleteWorkspaceApiV1WorkspacesWorkspaceIdDelete({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            query: (data as any)?.query ?? { dataset_delete: (data as any)?.datasetDelete ?? (data as any)?.dataset_delete },
        });
    },
    getDetails(data: GetWorkspaceDetailsApiV1WorkspacesWorkspaceIdDetailsGetData | Record<string, unknown>) {
        return getWorkspaceDetailsApiV1WorkspacesWorkspaceIdDetailsGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
        });
    },
    getGraph(data: GetWorkspaceGraphApiV1WorkspacesWorkspaceIdGraphGetData | Record<string, unknown>) {
        return getWorkspaceGraphApiV1WorkspacesWorkspaceIdGraphGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
        });
    },
    getSettings(data: GetSettingsApiV1WorkspacesWorkspaceIdSettingsGetData | Record<string, unknown>) {
        return getSettingsApiV1WorkspacesWorkspaceIdSettingsGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
        });
    },
    updateSettings(data: UpdateSettingsApiV1WorkspacesWorkspaceIdSettingsPatchData | Record<string, unknown>) {
        return updateSettingsApiV1WorkspacesWorkspaceIdSettingsPatch({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    getSettingsMetadata(data: GetSettingsMetadataApiV1WorkspacesWorkspaceIdSettingsMetadataGetData | Record<string, unknown>) {
        return getSettingsMetadataApiV1WorkspacesWorkspaceIdSettingsMetadataGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
        });
    }
};
