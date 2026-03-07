import * as api from "../sdk/generated";
import { setAuthToken } from "../sdk/client";

export const configureApi = (token: string | null) => {
    setAuthToken(token);
};

// If the token is already in localStorage, set it initially
if (typeof window !== "undefined") {
    const token = localStorage.getItem("karag_token");
    if (token) {
        configureApi(token);
    }
}

export { api };
export type { Workspace, WorkspaceCreate } from "../sdk/generated";
