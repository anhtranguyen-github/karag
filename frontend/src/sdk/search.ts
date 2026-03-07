import {
    globalSearchApiV1WorkspacesWorkspaceIdSearchGet,
    vectorSearchApiV1WorkspacesWorkspaceIdSearchVectorGet,
    type GlobalSearchApiV1WorkspacesWorkspaceIdSearchGetData,
    type VectorSearchApiV1WorkspacesWorkspaceIdSearchVectorGetData
} from "./generated";

export const search = {
    global(data: GlobalSearchApiV1WorkspacesWorkspaceIdSearchGetData) {
        return globalSearchApiV1WorkspacesWorkspaceIdSearchGet(data);
    },
    vector(data: VectorSearchApiV1WorkspacesWorkspaceIdSearchVectorGetData) {
        return vectorSearchApiV1WorkspacesWorkspaceIdSearchVectorGet(data);
    }
};
