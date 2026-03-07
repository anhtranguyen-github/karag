import { client } from "./generated";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let authToken: string | null = null;
let configured = false;

const resolveAuthToken = () =>
    authToken ?? (typeof window !== "undefined" ? localStorage.getItem("karag_token") : null);

if (!configured) {
    client.setConfig({
        ...client.getConfig(),
        baseUrl: API_BASE_URL,
        fetch: (request: Request) => globalThis.fetch(request),
    });

    client.interceptors.request.use((request: Request) => {
        const token = resolveAuthToken();
        if (!token) {
            return request;
        }

        const headers = new Headers(request.headers);
        headers.set("Authorization", `Bearer ${token}`);
        return new Request(request, { headers });
    });

    configured = true;
}

export const setAuthToken = (token: string | null) => {
    authToken = token;
};
