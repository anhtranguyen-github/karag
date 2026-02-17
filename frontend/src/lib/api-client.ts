import {
    Configuration,
    WorkspacesApi,
    ChatApi,
    DocumentsApi,
    SettingsApi,
    TasksApi,
    HealthApi,
    SearchApi,
    AdminOpsApi,
    EvaluationApi,
    ToolsApi
} from "./api";

const config = new Configuration({
    basePath: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Create instances of all APIs
const workspaces = new WorkspacesApi(config);
const chat = new ChatApi(config);
const documents = new DocumentsApi(config);
const settings = new SettingsApi(config);
const tasks = new TasksApi(config);
const health = new HealthApi(config);
const search = new SearchApi(config);
const adminOps = new AdminOpsApi(config);
const evaluation = new EvaluationApi(config);
const tools = new ToolsApi(config);

// Merge them into a single object for convenience
// Note: This mimics a "DefaultApi" but with all methods
export const api = {
    ...workspaces,
    ...chat,
    ...documents,
    ...settings,
    ...tasks,
    ...health,
    ...search,
    ...adminOps,
    ...evaluation,
    ...tools,

    // Explicitly bind methods to their instances to avoid 'this' context issues
    // Using Object.getPrototypeOf to iterate through methods
    ...getMethods(workspaces),
    ...getMethods(chat),
    ...getMethods(documents),
    ...getMethods(settings),
    ...getMethods(tasks),
};

function getMethods(obj: any) {
    const methods: any = {};
    const proto = Object.getPrototypeOf(obj);
    Object.getOwnPropertyNames(proto).forEach(name => {
        if (typeof obj[name] === 'function' && name !== 'constructor') {
            methods[name] = obj[name].bind(obj);
        }
    });
    return methods;
}
