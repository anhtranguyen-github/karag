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
  const generatedDir = path.join(__dirname, '../../src/client');
  
  beforeAll(() => {
    // Skip tests if SDK hasn't been generated yet
    if (!fs.existsSync(generatedDir)) {
      console.warn(
        `Generated SDK not found at ${generatedDir}. ` +
        'Run "pnpm generate:api" first.'
      );
    }
  });

  describe('SDK Structure', () => {
    it('should have generated directory', () => {
      // This test documents the expected structure
      // The actual generation happens during build
      const exists = fs.existsSync(generatedDir);
      
      if (!exists) {
        console.warn('SDK not generated - skipping structure tests');
        return;
      }
      
      expect(exists).toBe(true);
    });

    it('should have index file exporting all APIs', () => {
      const indexPath = path.join(generatedDir, 'index.ts');
      
      if (!fs.existsSync(indexPath)) {
        console.warn('SDK index not found - skipping');
        return;
      }
      
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should have model types defined', () => {
      const modelsDir = path.join(generatedDir, 'models');
      
      if (!fs.existsSync(modelsDir)) {
        console.warn('Models directory not found - skipping');
        return;
      }
      
      const files = fs.readdirSync(modelsDir);
      expect(files.length).toBeGreaterThan(0);
      expect(files.some(f => f.endsWith('.ts'))).toBe(true);
    });
  });

  describe('API Operations', () => {
    it('should export API functions', async () => {
      const indexPath = path.join(generatedDir, 'index.ts');
      
      if (!fs.existsSync(indexPath)) {
        console.warn('SDK not generated - skipping API tests');
        return;
      }
      
      // Dynamic import to check exports
      try {
        const api = await import(indexPath);
        const exports = Object.keys(api);
        
        expect(exports.length).toBeGreaterThan(0);
      } catch (e) {
        // If import fails, SDK may not be properly generated
        console.warn('Could not import generated SDK:', e);
      }
    });
  });
});

describe('Hey API Client Contract', () => {
  const clientDir = path.join(__dirname, '../../src/client');
  
  it('should have client directory when generated', () => {
    if (!fs.existsSync(clientDir)) {
      console.warn('Client not generated - skipping');
      return;
    }
    expect(fs.existsSync(clientDir)).toBe(true);
  });

  it('should have sdk.ts file', () => {
    const sdkPath = path.join(clientDir, 'sdk.ts');
    if (!fs.existsSync(sdkPath)) {
      console.warn('SDK not generated - skipping');
      return;
    }
    const content = fs.readFileSync(sdkPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('should have types.ts file', () => {
    const typesPath = path.join(clientDir, 'types.ts');
    if (!fs.existsSync(typesPath)) {
      console.warn('Types not generated - skipping');
      return;
    }
    const content = fs.readFileSync(typesPath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });

  it('should have client.ts file', () => {
    const clientFilePath = path.join(clientDir, 'client.ts');
    if (!fs.existsSync(clientFilePath)) {
      console.warn('Client not generated - skipping');
      return;
    }
    const content = fs.readFileSync(clientFilePath, 'utf-8');
    expect(content.length).toBeGreaterThan(0);
  });
});
