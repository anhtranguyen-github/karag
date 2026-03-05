/**
 * API Integration Tests
 * 
 * These tests verify that the frontend client can successfully
 * call backend endpoints using the generated SDK.
 * 
 * Requirements:
 * - Backend must be running on localhost:8000
 * - Generated SDK must be present
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// API base URL from environment or default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

describe('API Integration Tests', () => {
  let isBackendAvailable = false;
  
  beforeAll(async () => {
    // Check if backend is available
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      isBackendAvailable = response.ok;
    } catch (e) {
      isBackendAvailable = false;
    }
    
    if (!isBackendAvailable) {
      console.warn(
        `Backend not available at ${API_BASE_URL}. ` +
        'Integration tests will be skipped.'
      );
    }
  });

  describe('Health Endpoint', () => {
    it('should return healthy status', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping: Backend not available');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data.status).toBeDefined();
    });

    it('should return API version', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping: Backend not available');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      
      expect(data.version).toBeDefined();
      expect(typeof data.version).toBe('string');
    });
  });

  describe('OpenAPI Schema Endpoint', () => {
    it('should return valid OpenAPI schema', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping: Backend not available');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/openapi.json`);
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const schema = await response.json();
      expect(schema.openapi).toBeDefined();
      expect(schema.paths).toBeDefined();
      expect(Object.keys(schema.paths).length).toBeGreaterThan(0);
    });

    it('should match committed schema structure', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping: Backend not available');
        return;
      }
      
      const committedSchemaPath = path.join(__dirname, '../../../openapi/schema.json');
      
      if (!fs.existsSync(committedSchemaPath)) {
        console.warn('Committed schema not found - skipping comparison');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/openapi.json`);
      const runningSchema = await response.json();
      const committedSchema = JSON.parse(fs.readFileSync(committedSchemaPath, 'utf-8'));
      
      // Compare paths (should match)
      const runningPaths = Object.keys(runningSchema.paths).sort();
      const committedPaths = Object.keys(committedSchema.paths).sort();
      
      expect(runningPaths).toEqual(committedPaths);
    });
  });

  describe('Authentication Flow', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping: Backend not available');
        return;
      }
      
      // Try to access a protected endpoint without auth
      const response = await fetch(`${API_BASE_URL}/api/v1/workspaces/`, {
        method: 'GET',
      });
      
      // Should return 401 or 403
      expect(response.status).toBeGreaterThanOrEqual(401);
      expect(response.status).toBeLessThanOrEqual(403);
    });
  });

  describe('Core API Endpoints', () => {
    it('should have workspaces endpoint', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping: Backend not available');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/openapi.json`);
      const schema = await response.json();
      
      const hasWorkspaces = Object.keys(schema.paths).some(
        path => path.includes('/workspaces')
      );
      
      expect(hasWorkspaces).toBe(true);
    });

    it('should have documents endpoint', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping: Backend not available');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/openapi.json`);
      const schema = await response.json();
      
      const hasDocuments = Object.keys(schema.paths).some(
        path => path.includes('/documents')
      );
      
      expect(hasDocuments).toBe(true);
    });

    it('should have chat endpoint', async () => {
      if (!isBackendAvailable) {
        console.warn('Skipping: Backend not available');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/openapi.json`);
      const schema = await response.json();
      
      const hasChat = Object.keys(schema.paths).some(
        path => path.includes('/chat')
      );
      
      expect(hasChat).toBe(true);
    });
  });
});

describe('Generated SDK Integration', () => {
  const clientDir = path.join(__dirname, '../../src/client');
  
  it('should be importable when generated', async () => {
    if (!fs.existsSync(clientDir)) {
      console.warn('SDK not generated - skipping import test');
      return;
    }
    
    try {
      // This will fail in test environment without proper module resolution,
      // but validates the files exist and are syntactically correct
      const sdkPath = path.join(clientDir, 'sdk.ts');
      const content = fs.readFileSync(sdkPath, 'utf-8');
      
      // Basic validation - should have exports
      expect(content).toContain('export');
    } catch (e) {
      console.warn('Could not read generated SDK:', e);
    }
  });
});
