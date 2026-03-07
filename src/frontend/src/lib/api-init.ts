import { configureApi } from "./api-client";

export function initApi() {
    const token = typeof window !== "undefined" ? localStorage.getItem("karag_token") : null;
    configureApi(token);
}
