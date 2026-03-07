import {
    uploadDocumentApiV1WorkspacesWorkspaceIdUploadPost,
    importUrlDocumentApiV1WorkspacesWorkspaceIdImportUrlPost,
    importSitemapDocumentApiV1WorkspacesWorkspaceIdImportSitemapPost,
    importGithubDocumentApiV1WorkspacesWorkspaceIdImportGithubPost,
    listAllDocumentsApiV1WorkspacesWorkspaceIdDocumentsAllGet,
    updateDocumentWorkspacesApiV1WorkspacesWorkspaceIdDocumentsUpdateWorkspacesPost,
    getDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdGet,
    deleteDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdDelete,
    getDocumentChunksApiV1WorkspacesWorkspaceIdDocumentsDocumentIdChunksGet,
    inspectDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdInspectGet,
    getDocumentForCitationApiV1V1DocumentsDocumentIdGet,
    listDocumentsApiV1WorkspacesWorkspaceIdDocumentsGet,
    type ListDocumentsApiV1WorkspacesWorkspaceIdDocumentsGetData,
    type UploadDocumentApiV1WorkspacesWorkspaceIdUploadPostData,
    type ImportUrlDocumentApiV1WorkspacesWorkspaceIdImportUrlPostData,
    type ImportSitemapDocumentApiV1WorkspacesWorkspaceIdImportSitemapPostData,
    type ImportGithubDocumentApiV1WorkspacesWorkspaceIdImportGithubPostData,
    type ListAllDocumentsApiV1WorkspacesWorkspaceIdDocumentsAllGetData,
    type UpdateDocumentWorkspacesApiV1WorkspacesWorkspaceIdDocumentsUpdateWorkspacesPostData,
    type GetDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdGetData,
    type DeleteDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdDeleteData,
    type GetDocumentChunksApiV1WorkspacesWorkspaceIdDocumentsDocumentIdChunksGetData,
    type InspectDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdInspectGetData,
    type GetDocumentForCitationApiV1V1DocumentsDocumentIdGetData
} from "./generated";

export const documents = {
    list(data: ListDocumentsApiV1WorkspacesWorkspaceIdDocumentsGetData) {
        return listDocumentsApiV1WorkspacesWorkspaceIdDocumentsGet(data);
    },
    upload(data: UploadDocumentApiV1WorkspacesWorkspaceIdUploadPostData) {
        return uploadDocumentApiV1WorkspacesWorkspaceIdUploadPost(data);
    },
    importUrl(data: ImportUrlDocumentApiV1WorkspacesWorkspaceIdImportUrlPostData) {
        return importUrlDocumentApiV1WorkspacesWorkspaceIdImportUrlPost(data);
    },
    importSitemap(data: ImportSitemapDocumentApiV1WorkspacesWorkspaceIdImportSitemapPostData) {
        return importSitemapDocumentApiV1WorkspacesWorkspaceIdImportSitemapPost(data);
    },
    importGithub(data: ImportGithubDocumentApiV1WorkspacesWorkspaceIdImportGithubPostData) {
        return importGithubDocumentApiV1WorkspacesWorkspaceIdImportGithubPost(data);
    },
    listAll(data: ListAllDocumentsApiV1WorkspacesWorkspaceIdDocumentsAllGetData) {
        return listAllDocumentsApiV1WorkspacesWorkspaceIdDocumentsAllGet(data);
    },
    updateWorkspaces(data: UpdateDocumentWorkspacesApiV1WorkspacesWorkspaceIdDocumentsUpdateWorkspacesPostData) {
        return updateDocumentWorkspacesApiV1WorkspacesWorkspaceIdDocumentsUpdateWorkspacesPost(data);
    },
    get(data: GetDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdGetData) {
        return getDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdGet(data);
    },
    delete(data: DeleteDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdDeleteData) {
        return deleteDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdDelete(data);
    },
    getChunks(data: GetDocumentChunksApiV1WorkspacesWorkspaceIdDocumentsDocumentIdChunksGetData) {
        return getDocumentChunksApiV1WorkspacesWorkspaceIdDocumentsDocumentIdChunksGet(data);
    },
    inspect(data: InspectDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdInspectGetData) {
        return inspectDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdInspectGet(data);
    },
    getForCitation(data: GetDocumentForCitationApiV1V1DocumentsDocumentIdGetData) {
        return getDocumentForCitationApiV1V1DocumentsDocumentIdGet(data);
    }
};
