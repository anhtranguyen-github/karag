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
    updateGlobalSettings(data: UpdateGlobalSettingsApiV1AdminSettingsPatchData) {
        return updateGlobalSettingsApiV1AdminSettingsPatch(data);
    },
    getGlobalSettingsMetadata() {
        return getGlobalSettingsMetadataApiV1AdminSettingsMetadataGet();
    },
    healthCheck() {
        return healthCheckGet();
    }
};
