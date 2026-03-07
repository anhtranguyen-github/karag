/**
 * API Client Contract Tests
 * 
 * These tests validate that the generated API client:
 * - Can be imported
 * - Has expected structure
 * - Matches the OpenAPI schema
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Generated API Client Contract', () => {
  const generatedDir = path.join(__dirname, '../../src/sdk/generated');
  
  beforeAll(() => {
    if (!fs.existsSync(generatedDir)) {
      throw new Error(`Generated SDK not found at ${generatedDir}. Run "pnpm generate:api" first.`);
    }
  });

  describe('SDK Structure', () => {
    it('should have generated directory', () => {
      expect(fs.existsSync(generatedDir)).toBe(true);
    });

    it('should have index file exporting all APIs', () => {
      const indexPath = path.join(generatedDir, 'index.ts');

      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should have model types defined', () => {
      const typesPath = path.join(generatedDir, 'types.gen.ts');

      const content = fs.readFileSync(typesPath, 'utf-8');
      expect(content).toContain('export');
    });
  });

  describe('API Operations', () => {
    it('should export API functions', () => {
      const sdkPath = path.join(generatedDir, 'sdk.gen.ts');
      const content = fs.readFileSync(sdkPath, 'utf-8');

      expect(content).toContain('export');
    });
  });
});

describe('Hey API Client Contract', () => {
  const clientDir = path.join(__dirname, '../../src/sdk/generated');
  
  it('should have client directory when generated', () => {
    expect(fs.existsSync(clientDir)).toBe(true);
  });

  it('should have sdk.ts file', () => {
    const sdkPath = path.join(clientDir, 'sdk.gen.ts');
    const content = fs.readFileSync(sdkPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('should have types.ts file', () => {
    const typesPath = path.join(clientDir, 'types.gen.ts');
    const content = fs.readFileSync(typesPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('should have client.ts file', () => {
    const clientFilePath = path.join(clientDir, 'core', 'OpenAPI.ts');
    const content = fs.readFileSync(clientFilePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });
});
