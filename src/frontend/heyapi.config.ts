import { defineConfig } from '@hey-api/openapi-ts';

/**
 * Hey API Configuration for Auto-Generated API SDK
 * 
 * This configuration generates a TypeScript REST client from the OpenAPI schema.
 * The generated client provides:
 * - Fully typed request/response bodies
 * - SDK functions for all API operations
 * - Fetch-based HTTP client
 * 
 * Workflow:
 * 1. Backend changes API
 * 2. Run `pnpm generate:api` to regenerate SDK
 * 3. TypeScript will catch any breaking changes
 * 
 * @see https://heyapi.dev/openapi-ts/configuration
 */
export default defineConfig({
  // Path to the OpenAPI schema (exported from FastAPI backend)
  input: '../../openapi/schema.json',
  
  // Output directory for generated code
  output: 'src/sdk/generated',
  
  // Plugins for generating different parts of the SDK
  plugins: [
    // TypeScript types from OpenAPI schemas
    '@hey-api/typescript',
    
    // SDK functions for API operations
    '@hey-api/sdk',
  ],
});
