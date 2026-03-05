/**
 * API Contract Schema Validation Tests
 * 
 * These tests validate that the OpenAPI schema:
 * - Is valid JSON
 * - Contains required fields
 * - Has consistent structure
 * - Matches expected API version
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenAPI Schema Contract', () => {
  const schemaPath = path.join(__dirname, '../../../openapi/schema.json');
  let schema: any;

  beforeAll(() => {
    // Check if schema exists
    if (!fs.existsSync(schemaPath)) {
      throw new Error(
        `OpenAPI schema not found at ${schemaPath}. ` +
        'Run "python backend/scripts/export_openapi.py" first.'
      );
    }
    
    const content = fs.readFileSync(schemaPath, 'utf-8');
    schema = JSON.parse(content);
  });

  describe('Schema Structure', () => {
    it('should have required OpenAPI version field', () => {
      expect(schema.openapi).toBeDefined();
      expect(schema.openapi).toMatch(/^3\.\d+\.\d+$/);
    });

    it('should have info section with title and version', () => {
      expect(schema.info).toBeDefined();
      expect(schema.info.title).toBeDefined();
      expect(typeof schema.info.title).toBe('string');
      expect(schema.info.version).toBeDefined();
      expect(typeof schema.info.version).toBe('string');
    });

    it('should have paths object', () => {
      expect(schema.paths).toBeDefined();
      expect(typeof schema.paths).toBe('object');
    });

    it('should have at least one endpoint', () => {
      const paths = Object.keys(schema.paths || {});
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should have components section with schemas', () => {
      expect(schema.components).toBeDefined();
      expect(schema.components.schemas).toBeDefined();
      expect(typeof schema.components.schemas).toBe('object');
    });
  });

  describe('Required Endpoints', () => {
    it('should have health endpoint', () => {
      const hasHealth = Object.keys(schema.paths).some(
        path => path.includes('/health') || path === '/health'
      );
      expect(hasHealth).toBe(true);
    });

    it('should have API version prefix (/api/v1 or similar)', () => {
      const hasVersionedPaths = Object.keys(schema.paths).some(
        path => path.startsWith('/api/v')
      );
      expect(hasVersionedPaths).toBe(true);
    });
  });

  describe('Schema Quality', () => {
    it('should have operationIds for all operations', () => {
      const missingOperationIds: string[] = [];
      
      Object.entries(schema.paths).forEach(([path, methods]: [string, any]) => {
        ['get', 'post', 'put', 'patch', 'delete'].forEach(method => {
          if (methods[method] && !methods[method].operationId) {
            missingOperationIds.push(`${method.toUpperCase()} ${path}`);
          }
        });
      });

      expect(missingOperationIds).toEqual([]);
    });

    it('should have response schemas for all operations', () => {
      const missingResponses: string[] = [];
      
      Object.entries(schema.paths).forEach(([path, methods]: [string, any]) => {
        ['get', 'post', 'put', 'patch', 'delete'].forEach(method => {
          if (methods[method] && !methods[method].responses) {
            missingResponses.push(`${method.toUpperCase()} ${path}`);
          }
        });
      });

      expect(missingResponses).toEqual([]);
    });

    it('should not have duplicate operationIds', () => {
      const operationIds: string[] = [];
      const duplicates: string[] = [];
      
      Object.values(schema.paths).forEach((methods: any) => {
        ['get', 'post', 'put', 'patch', 'delete'].forEach(method => {
          const operationId = methods[method]?.operationId;
          if (operationId) {
            if (operationIds.includes(operationId)) {
              duplicates.push(operationId);
            } else {
              operationIds.push(operationId);
            }
          }
        });
      });

      expect(duplicates).toEqual([]);
    });
  });

  describe('Schema Size Limits', () => {
    it('should have reasonable schema size (not too large)', () => {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      const sizeInMB = content.length / (1024 * 1024);
      
      // Schema should be less than 5MB
      expect(sizeInMB).toBeLessThan(5);
    });

    it('should not have too many endpoints', () => {
      const endpointCount = Object.keys(schema.paths).length;
      
      // Reasonable limit for API size
      expect(endpointCount).toBeLessThan(200);
    });
  });
});
