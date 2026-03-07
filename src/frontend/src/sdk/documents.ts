import "./client";
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
    list(data: ListDocumentsApiV1WorkspacesWorkspaceIdDocumentsGetData | Record<string, unknown>) {
        return listDocumentsApiV1WorkspacesWorkspaceIdDocumentsGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
        });
    },
    upload(data: UploadDocumentApiV1WorkspacesWorkspaceIdUploadPostData | Record<string, unknown>) {
        return uploadDocumentApiV1WorkspacesWorkspaceIdUploadPost({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            body: (data as any)?.body ?? (data as any)?.formData ?? (data as any)?.requestBody ?? data,
        });
    },
    importUrl(data: ImportUrlDocumentApiV1WorkspacesWorkspaceIdImportUrlPostData | Record<string, unknown>) {
        return importUrlDocumentApiV1WorkspacesWorkspaceIdImportUrlPost({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    importSitemap(data: ImportSitemapDocumentApiV1WorkspacesWorkspaceIdImportSitemapPostData | Record<string, unknown>) {
        return importSitemapDocumentApiV1WorkspacesWorkspaceIdImportSitemapPost({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    importGithub(data: ImportGithubDocumentApiV1WorkspacesWorkspaceIdImportGithubPostData | Record<string, unknown>) {
        return importGithubDocumentApiV1WorkspacesWorkspaceIdImportGithubPost({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    listAll(data: ListAllDocumentsApiV1WorkspacesWorkspaceIdDocumentsAllGetData | Record<string, unknown>) {
        return listAllDocumentsApiV1WorkspacesWorkspaceIdDocumentsAllGet({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
        });
    },
    updateWorkspaces(data: UpdateDocumentWorkspacesApiV1WorkspacesWorkspaceIdDocumentsUpdateWorkspacesPostData | Record<string, unknown>) {
        return updateDocumentWorkspacesApiV1WorkspacesWorkspaceIdDocumentsUpdateWorkspacesPost({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    get(data: GetDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdGetData | Record<string, unknown>) {
        return getDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdGet({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                document_id: (data as any)?.documentId ?? (data as any)?.document_id,
            },
        });
    },
    delete(data: DeleteDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdDeleteData | Record<string, unknown>) {
        return deleteDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdDelete({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                document_id: (data as any)?.documentId ?? (data as any)?.document_id,
            },
            query: (data as any)?.query ?? { dataset_delete: (data as any)?.datasetDelete ?? (data as any)?.dataset_delete },
        });
    },
    getChunks(data: GetDocumentChunksApiV1WorkspacesWorkspaceIdDocumentsDocumentIdChunksGetData | Record<string, unknown>) {
        return getDocumentChunksApiV1WorkspacesWorkspaceIdDocumentsDocumentIdChunksGet({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                document_id: (data as any)?.documentId ?? (data as any)?.document_id,
            },
        });
    },
    inspect(data: InspectDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdInspectGetData | Record<string, unknown>) {
        return inspectDocumentApiV1WorkspacesWorkspaceIdDocumentsDocumentIdInspectGet({
            path: (data as any)?.path ?? {
                workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null,
                document_id: (data as any)?.documentId ?? (data as any)?.document_id,
            },
        });
    },
    getForCitation(data: GetDocumentForCitationApiV1V1DocumentsDocumentIdGetData | Record<string, unknown>) {
        return getDocumentForCitationApiV1V1DocumentsDocumentIdGet({
            path: (data as any)?.path ?? { document_id: (data as any)?.documentId ?? (data as any)?.document_id },
            query: (data as any)?.query ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id },
        } as any);
    }
};
