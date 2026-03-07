import "./client";
import {
    getPromptsApiV1AdminPromptsGet,
    getVectorStatusApiV1AdminVectorStatusGet,
    getOpsOverviewApiV1AdminOpsOverviewGet,
    getGlobalSettingsApiV1AdminSettingsGet,
    updateGlobalSettingsApiV1AdminSettingsPatch,
    getGlobalSettingsMetadataApiV1AdminSettingsMetadataGet,
    healthCheckGet,
    type UpdateGlobalSettingsApiV1AdminSettingsPatchData
} from "./generated";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function adminFetch(path: string, init?: RequestInit) {
    const token = typeof window !== "undefined" ? localStorage.getItem("karag_token") : null;
    const response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(init?.headers || {}),
        },
    });
    return response.json();
}

export const admin = {
    getPrompts() {
        return getPromptsApiV1AdminPromptsGet();
    },
    getVectorStatus() {
        return getVectorStatusApiV1AdminVectorStatusGet();
    },
    getOpsOverview() {
        return getOpsOverviewApiV1AdminOpsOverviewGet();
    },
    getGlobalSettings() {
        return getGlobalSettingsApiV1AdminSettingsGet();
    },
    updateGlobalSettings(data: UpdateGlobalSettingsApiV1AdminSettingsPatchData | Record<string, unknown>) {
        return updateGlobalSettingsApiV1AdminSettingsPatch({
            body: (data as any)?.body ?? (data as any)?.requestBody ?? data,
        });
    },
    getGlobalSettingsMetadata() {
        return getGlobalSettingsMetadataApiV1AdminSettingsMetadataGet();
    },
    healthCheck() {
        return healthCheckGet();
    },
    getDeploymentConfig() {
        return adminFetch("/admin/deployment/config");
    },
    updateDeploymentConfig(requestBody: Record<string, unknown>) {
        return adminFetch("/admin/deployment/config", {
            method: "PATCH",
            body: JSON.stringify(requestBody),
        });
    },
    detectLocalDeployment() {
        return adminFetch("/admin/deployment/detect");
    },
    verifyDeployment() {
        return adminFetch("/admin/deployment/verify", {
            method: "POST",
        });
    }
};
