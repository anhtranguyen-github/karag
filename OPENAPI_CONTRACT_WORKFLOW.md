# OpenAPI Contract-Driven Development Workflow

This document describes the contract-driven REST API integration workflow between the FastAPI backend and Next.js frontend.

## Overview

The system ensures that:
- **Backend is the single source of truth** for API definitions
- **Frontend SDK is auto-generated** from the OpenAPI schema
- **CI fails if API contract breaks**
- **Frontend and backend cannot drift out of sync**

## Architecture

```
┌─────────────┐     OpenAPI      ┌─────────────┐
│   FastAPI   │ ───────────────→ │  openapi/   │
│   Backend   │     Schema       │ schema.json │
└─────────────┘                  └──────┬──────┘
                                        │
                                        │ Hey API
                                        ▼
                               ┌─────────────────┐
                               │  Generated SDK  │
                               │ frontend/src/   │
                               │   client        │
                               └────────┬────────┘
                                        │
                                        │ Import
                                        ▼
                               ┌─────────────────┐
                               │  Next.js        │
                               │   Frontend      │
                               └─────────────────┘
```

## Directory Structure

```
repo/
├── backend/
│   ├── app/
│   │   └── main.py              # FastAPI app
│   └── scripts/
│       └── export_openapi.py    # Schema export script
│
├── frontend/
│   ├── src/
│   │   └── client/              # Generated SDK (gitignored)
│   ├── package.json             # pnpm scripts
│   └── ...
│
├── openapi/
│   └── schema.json              # Committed OpenAPI schema
│
├── scripts/
│   └── export-openapi.sh        # Shell export script
│
├── heyapi.config.ts             # Hey API configuration
│
└── .github/workflows/
    └── integration.yml          # CI workflow
```

## Workflow

### 1. Backend Developer Makes API Changes

When a backend developer modifies the API:

```bash
# After making changes to FastAPI routes/models
python backend/scripts/export_openapi.py

# This updates openapi/schema.json
git add openapi/schema.json
git commit -m "feat: update API with new endpoints"
```

### 2. Frontend Developer Syncs Changes

When a frontend developer pulls changes:

```bash
# Pull latest changes
git pull

# Regenerate the SDK
pnpm generate:api

# TypeScript will catch any breaking changes
pnpm typecheck
```

### 3. CI Validates Everything

The CI pipeline automatically:

1. Exports the OpenAPI schema from the backend
2. Validates the schema structure
3. Generates the frontend SDK with Hey API
4. Type-checks the generated code
5. Runs integration tests
6. Builds the frontend
7. Detects breaking changes in PRs

## Commands Reference

### Backend

```bash
# Export OpenAPI schema
python backend/scripts/export_openapi.py

# Or using the shell script (requires running backend)
./scripts/export-openapi.sh
```

### Frontend

```bash
# Install dependencies
pnpm install

# Generate API SDK from OpenAPI schema
pnpm generate:api

# Type check (includes generated code)
pnpm typecheck

# Build (automatically generates SDK)
pnpm build

# Run tests
pnpm test:unit
pnpm test:integration
pnpm test:contract
```

## Configuration Files

### Hey API Configuration (`heyapi.config.ts`)

```typescript
import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'openapi/schema.json',
  output: 'frontend/src/client',
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    '@hey-api/client-fetch',
  ],
});
```

## CI/CD Integration

### Workflow Stages

1. **Export Schema** - Generate OpenAPI schema from FastAPI
2. **Validate Contract** - Check schema structure and consistency
3. **Generate SDK** - Create TypeScript client with Hey API
4. **Contract Tests** - Validate API matches committed schema
5. **Integration Tests** - Test frontend client against backend
6. **Build Verification** - Ensure frontend builds with generated SDK
7. **Drift Detection** - Warn about breaking changes in PRs

### Breaking Change Detection

The CI detects breaking changes by:
- Comparing paths between base and PR branches
- Flagging removed endpoints
- Warning about type mismatches

## Git Ignore

Generated code is **never committed**:

```gitignore
# frontend/.gitignore
frontend/src/client/
```

## Design Principles

1. **Single Source of Truth**: Backend defines the API contract
2. **Auto-Generation**: Frontend SDK is always up-to-date
3. **Type Safety**: TypeScript catches API mismatches at build time
4. **CI Enforcement**: Broken contracts fail the build
5. **Deterministic**: Same input always produces same output

## Troubleshooting

### SDK Generation Fails

```bash
# Ensure schema exists
ls openapi/schema.json

# Validate schema is valid JSON
python -c "import json; json.load(open('openapi/schema.json'))"

# Regenerate from scratch
rm -rf frontend/src/client
pnpm generate:api
```

### Type Errors After Generation

```bash
# Clear TypeScript cache
rm -rf frontend/.next frontend/tsconfig.tsbuildinfo

# Regenerate and typecheck
pnpm generate:api
pnpm typecheck
```

### Backend Not Running for Export

```bash
# Export directly via Python (no running server needed)
python backend/scripts/export_openapi.py
```

## Best Practices

1. **Always commit** `openapi/schema.json` after API changes
2. **Never manually edit** files in `frontend/src/client/`
3. **Run typecheck** before committing frontend changes
4. **Regenerate SDK** after pulling backend changes
5. **Review CI warnings** about breaking changes

## Migration from OpenAPI Generator

This project previously used `@openapitools/openapi-generator-cli`. The migration to Hey API provides:
- Modern TypeScript output
- Smaller bundle size
- Native fetch support
- Better tree-shaking

The old `generate-client` script is deprecated in favor of `generate:api`.
