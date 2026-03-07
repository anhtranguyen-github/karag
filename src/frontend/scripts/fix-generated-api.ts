/**
 * Post-processing script to fix OpenAPI generator issues.
 * 
 * The OpenAPI generator creates code that references FromJSON/ToJSON functions
 * for empty schema types ({}), but these functions don't exist in runtime.ts.
 * 
 * This script adds the missing functions to runtime.ts and import to AppResponse.ts
 * after code generation.
 */

import fs from 'fs';
import path from 'path';

const API_DIR = path.join(__dirname, '../src/lib/api');
const RUNTIME_PATH = path.join(API_DIR, 'runtime.ts');
const APP_RESPONSE_PATH = path.join(API_DIR, 'models/AppResponse.ts');

const FROM_JSON_FUNCTIONS = `
/**
 * Identity functions for handling empty schema types in OpenAPI.
 * The OpenAPI generator incorrectly generates FromJSON/ToJSON calls for
 * schemas with empty {} (any type), which don't exist.
 * These functions provide the missing implementations.
 */
export function FromJSON<T>(value: any): T {
    return value as T;
}

export function ToJSON<T>(value: T): any {
    return value;
}
`;

function fixRuntime() {
    if (!fs.existsSync(RUNTIME_PATH)) {
        console.error('runtime.ts not found!');
        return false;
    }
    
    let content = fs.readFileSync(RUNTIME_PATH, 'utf8');
    
    // Check if FromJSON already exists
    if (content.includes('export function FromJSON')) {
        console.log('runtime.ts already has FromJSON, skipping...');
        return true;
    }
    
    // Append the functions to the end of the file
    content = content.trim() + '\n' + FROM_JSON_FUNCTIONS;
    fs.writeFileSync(RUNTIME_PATH, content);
    console.log('Fixed runtime.ts - added FromJSON, ToJSON functions');
    return true;
}

function fixAppResponse() {
    if (!fs.existsSync(APP_RESPONSE_PATH)) {
        console.error('AppResponse.ts not found!');
        return false;
    }
    
    let content = fs.readFileSync(APP_RESPONSE_PATH, 'utf8');
    
    // Check if FromJSON, ToJSON already imported
    if (content.includes('FromJSON, ToJSON') || content.includes('FromJSON }')) {
        console.log('AppResponse.ts already has imports, skipping...');
        return true;
    }
    
    // Add FromJSON, ToJSON to the import statement
    const oldImport = "import { mapValues } from '../runtime';";
    const newImport = "import { mapValues, FromJSON, ToJSON } from '../runtime';";
    
    if (content.includes(oldImport)) {
        content = content.replace(oldImport, newImport);
        fs.writeFileSync(APP_RESPONSE_PATH, content);
        console.log('Fixed AppResponse.ts - added FromJSON, ToJSON imports');
        return true;
    } else {
        console.error('Could not find expected import statement in AppResponse.ts');
        return false;
    }
}

// Run both fixes
const runtimeOk = fixRuntime();
if (runtimeOk) {
    fixAppResponse();
}
