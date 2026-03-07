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
    create(data: CreateWorkspaceApiV1WorkspacesPostData) {
        return createWorkspaceApiV1WorkspacesPost(data);
    },
    update(data: UpdateWorkspaceApiV1WorkspacesWorkspaceIdPatchData) {
        return updateWorkspaceApiV1WorkspacesWorkspaceIdPatch(data);
    },
    delete(data: DeleteWorkspaceApiV1WorkspacesWorkspaceIdDeleteData) {
        return deleteWorkspaceApiV1WorkspacesWorkspaceIdDelete(data);
    },
    getDetails(data: GetWorkspaceDetailsApiV1WorkspacesWorkspaceIdDetailsGetData) {
        return getWorkspaceDetailsApiV1WorkspacesWorkspaceIdDetailsGet(data);
    },
    getGraph(data: GetWorkspaceGraphApiV1WorkspacesWorkspaceIdGraphGetData) {
        return getWorkspaceGraphApiV1WorkspacesWorkspaceIdGraphGet(data);
    },
    getSettings(data: GetSettingsApiV1WorkspacesWorkspaceIdSettingsGetData) {
        return getSettingsApiV1WorkspacesWorkspaceIdSettingsGet(data);
    },
    updateSettings(data: UpdateSettingsApiV1WorkspacesWorkspaceIdSettingsPatchData) {
        return updateSettingsApiV1WorkspacesWorkspaceIdSettingsPatch(data);
    },
    getSettingsMetadata(data: GetSettingsMetadataApiV1WorkspacesWorkspaceIdSettingsMetadataGetData) {
        return getSettingsMetadataApiV1WorkspacesWorkspaceIdSettingsMetadataGet(data);
    }
};
