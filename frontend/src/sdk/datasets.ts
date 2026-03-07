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
    create(data: CreateDatasetApiV1EvalDatasetsPostData) {
        return createDatasetApiV1EvalDatasetsPost(data);
    },
    list() {
        return listDatasetsApiV1EvalDatasetsGet();
    },
    runEvaluation(data: RunEvaluationApiV1EvalRunsPostData) {
        return runEvaluationApiV1EvalRunsPost(data);
    },
    listRuns() {
        return listRunsApiV1EvalRunsGet();
    },
    getRun(data: GetRunApiV1EvalRunsRunIdGetData) {
        return getRunApiV1EvalRunsRunIdGet(data);
    },
    shareDocument(data: ShareDocumentApiV1WorkspacesWorkspaceIdShareDocumentPostData) {
        return shareDocumentApiV1WorkspacesWorkspaceIdShareDocumentPost(data);
    }
};
