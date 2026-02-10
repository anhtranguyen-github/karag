/**
 * Api Client Factory
 * 
 * Provides a configured instance of the generated OpenAPI client.
 * This ensures all API calls use the correct base URL and default configurations.
 */

import { Configuration, WorkspacesApi, DocumentsApi, ChatApi, TasksApi, SearchApi, SettingsApi } from './client';
import { API_BASE_URL } from '@/lib/api-config';

// Create a default configuration
const config = new Configuration({
    basePath: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Export initialized API instances
export const workspacesApi = new WorkspacesApi(config);
export const documentsApi = new DocumentsApi(config);
export const chatApi = new ChatApi(config);
export const tasksApi = new TasksApi(config);
export const searchApi = new SearchApi(config);
export const settingsApi = new SettingsApi(config);

// Export the configuration for custom usage if needed
export { config as apiConfig };
