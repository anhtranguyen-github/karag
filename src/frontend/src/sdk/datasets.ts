import "./client";
import {
    createDatasetApiV1EvalDatasetsPost,
    listDatasetsApiV1EvalDatasetsGet,
    runEvaluationApiV1EvalRunsPost,
    listRunsApiV1EvalRunsGet,
    getRunApiV1EvalRunsRunIdGet,
    shareDocumentApiV1WorkspacesWorkspaceIdShareDocumentPost,
    type CreateDatasetApiV1EvalDatasetsPostData,
    type RunEvaluationApiV1EvalRunsPostData,
    type GetRunApiV1EvalRunsRunIdGetData,
    type ShareDocumentApiV1WorkspacesWorkspaceIdShareDocumentPostData
} from "./generated";

export const datasets = {
    create(data: CreateDatasetApiV1EvalDatasetsPostData | Record<string, unknown>) {
        return createDatasetApiV1EvalDatasetsPost({
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    list() {
        return listDatasetsApiV1EvalDatasetsGet();
    },
    runEvaluation(data: RunEvaluationApiV1EvalRunsPostData | Record<string, unknown>) {
        return runEvaluationApiV1EvalRunsPost({
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    listRuns() {
        return listRunsApiV1EvalRunsGet();
    },
    getRun(data: GetRunApiV1EvalRunsRunIdGetData | Record<string, unknown>) {
        return getRunApiV1EvalRunsRunIdGet({
            path: (data as any)?.path ?? { run_id: (data as any)?.runId ?? (data as any)?.run_id },
        });
    },
    shareDocument(data: ShareDocumentApiV1WorkspacesWorkspaceIdShareDocumentPostData | Record<string, unknown>) {
        return shareDocumentApiV1WorkspacesWorkspaceIdShareDocumentPost({
            path: (data as any)?.path ?? { workspace_id: (data as any)?.workspaceId ?? (data as any)?.workspace_id ?? null },
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    }
};
