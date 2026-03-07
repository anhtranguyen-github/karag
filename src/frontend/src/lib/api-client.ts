import * as client from "../sdk/generated";

// Configure the global OpenAPI settings
client.OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Re-implement the middleware logic using the new SDK's request interceptor if possible,
// or just manually setting the token in a helper.
// The @hey-api client uses a global OpenAPI object for config.

export const configureApi = (token: string | null) => {
    if (token) {
        client.OpenAPI.TOKEN = token;
    } else {
        client.OpenAPI.TOKEN = undefined;
    }
};

// If the token is already in localStorage, set it initially
if (typeof window !== "undefined") {
    const token = localStorage.getItem("karag_token");
    if (token) {
        configureApi(token);
    }
}

export const api = client;
export type { Workspace, WorkspaceCreate } from "../sdk/generated";

