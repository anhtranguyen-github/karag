import { OpenAPI } from "@/sdk/generated";

// Initialize OpenAPI client configuration
export function initApi() {
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
}
