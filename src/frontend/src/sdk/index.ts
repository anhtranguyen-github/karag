import { auth } from "./auth";
import { workspaces } from "./workspaces";
import { documents } from "./documents";
import { datasets } from "./datasets";
import { chat } from "./chat";
import { search } from "./search";
import { tasks } from "./tasks";
import { admin } from "./admin";
import { OpenAPI } from "./generated";

// Configure the global OpenAPI settings
OpenAPI.BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Set up default interceptor for auth token
OpenAPI.interceptors.request.use((options) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("karag_token") : null;
    if (token) {
        options.headers = {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        };
    }
    return options;
});

export const sdk = {
    auth,
    workspaces,
    documents,
    datasets,
    chat,
    search,
    tasks,
    admin
};

export * from "./generated/types.gen";
export { ApiError } from "./generated";
