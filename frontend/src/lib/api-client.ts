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
    AuthApi
} from "./api";

const config = new Configuration({
    basePath: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
    middleware: [
        {
            pre: async (context) => {
                const token = typeof window !== "undefined" ? localStorage.getItem("karag_token") : null;
                if (token) {
                    context.init.headers = {
                        ...context.init.headers,
                        Authorization: `Bearer ${token}`,
                    };
                }
                return context;
            },
        },
    ],
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
const auth = new AuthApi(config);

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
    ...auth,

    ...getMethods(workspaces),
    ...getMethods(chat),
    ...getMethods(documents),
    ...getMethods(settings),
    ...getMethods(tasks),
    ...getMethods(health),
    ...getMethods(search),
    ...getMethods(adminOps),
    ...getMethods(evaluation),
    ...getMethods(auth),
} as WorkspacesApi & ChatApi & DocumentsApi & SettingsApi & TasksApi & HealthApi & SearchApi & AdminOpsApi & EvaluationApi & AuthApi;

/* eslint-disable @typescript-eslint/no-explicit-any -- dynamic method extraction requires any */
function getMethods(obj: object) {
    const methods: Record<string, (...args: any[]) => any> = {};
    const proto = Object.getPrototypeOf(obj);
    Object.getOwnPropertyNames(proto).forEach(name => {
        if (typeof (obj as any)[name] === 'function' && name !== 'constructor') {
            methods[name] = (obj as any)[name].bind(obj);
        }
    });
    return methods;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
