# Code Quality and Architecture Enforcement

This document describes the code quality guard system implemented to maintain a clean, secure, and architecturally correct codebase.

## Overview

The system enforces:
- ✅ No relative imports
- ✅ No hardcoded URLs or API routes  
- ✅ No secrets committed
- ✅ No mock/placeholder data in production code
- ✅ No debug artifacts in production
- ✅ Clean architecture boundaries
- ✅ CI quality enforcement
- ✅ Pre-commit guardrails

## Why These Rules Exist

### Relative Imports
Relative imports can cause issues with:
- Refactoring (moving files breaks imports)
- Circular import detection
- Consistent code style

### Hardcoded URLs/Routes
Hardcoded values cause:
- Maintenance burden when endpoints change
- Inconsistent API usage
- Difficult to track all usages

### Secrets/Keys
Committing secrets leads to:
- Security vulnerabilities
- Credential rotation requirements
- Potential data breaches

### Mock/Placeholder Data
Placeholder data in production:
- Confuses developers
- May leak into user-facing features
- Indicates incomplete implementation

### Debug Artifacts
Debug code in production:
- Performance impact
- Security risks (verbose logging)
- Code bloat

### Architecture Boundaries
Violating boundaries causes:
- Tight coupling between components
- Difficult to test in isolation
- Spaghetti code maintenance nightmare

## Running Checks Locally

### Full Quality Check
```bash
./scripts/quality-check.sh
```

### Individual Checks

**Ruff (Linting)**
```bash
ruff check .
```

**Bandit (Security)**
```bash
bandit -r backend/
```

**Hardcoded Strings**
```bash
python tools/check_hardcoded_strings.py
```

**Mock Data**
```bash
python tools/check_mock_data.py
```

**Debug Artifacts**
```bash
python tools/check_debug_artifacts.py
```

**Import Linter**
```bash
importlinter lint importlinter.ini
```

## Pre-commit Hooks

Install hooks with:
```bash
pre-commit install
```

The following hooks run on every commit:
- `ruff` - Linting and formatting
- `hardcoded-strings` - Detects hardcoded URLs/routes
- `mock-data` - Detects placeholder data
- `debug-artifacts` - Detects debug code
- `architecture-drift` - Detects boundary violations
- `trufflehog` - Secret scanning

## CI Pipeline

All checks run in CI on every push/PR:
1. Architecture drift detection
2. Backend lint & tests
3. Bandit security scan
4. Custom quality scanners
5. Import linter
6. Secret scanning
7. Security audit (SAST, IaC)
8. Frontend build

## Fixing Violations

### Relative Import Error
Replace:
```python
from ..core.config import settings
```
With:
```python
from backend.app.core.config import settings
```

### Hardcoded URL Error
Move to configuration:
```python
# Bad
api_url = "https://api.example.com/v1/users"

# Good  
from backend.app.core.config import settings
api_url = settings.API_BASE_URL
```

### Mock Data Error
Replace with dynamic generation:
```python
# Bad
user = {"name": "John Doe", "email": "test@example.com"}

# Good
import uuid
user = {"name": f"user_{uuid.uuid4().hex[:8]}"}
```

### Debug Code Error
Remove before committing:
- `print()` statements
- `pprint()` statements  
- `breakpoint()` calls
- Debug flags like `debug=True`

### Architecture Violation
Follow the layer dependencies:
- `api` → depends on `services`, `core`, `schemas`
- `services` → depends on `core`, `providers`, `rag`, `graph`
- `rag`, `graph`, `core` → cannot depend on `api`

## Architecture Dependency Rules

```
api/
├── can use: services, core, schemas
└── cannot use: rag (directly), graph (directly)

services/
├── can use: core, providers, rag, graph, schemas
└── cannot use: api

core/
├── can use: schemas
└── cannot use: api, services

rag/
├── can use: core, providers, schemas
└── cannot use: api, services

graph/
├── can use: core, providers, rag, schemas
└── cannot use: api, services

providers/
├── can use: schemas
└── cannot use: api, services, core

schemas/
├── can use: other schemas
└── cannot use: api, services, core, rag, graph, providers
```

## Tools Configuration

### Ruff (`pyproject.toml`)
```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.flake8-tidy-imports]
ban-relative-imports = "all"
```

### Bandit (`pyproject.toml`)
```toml
[tool.bandit]
exclude = ["tests/", "test_fixtures/"]
```

### Import Linter (`importlinter.ini`)
Defined in `importlinter.ini` with contracts for each layer.

## Adding New Rules

1. **Tool-based**: Add to `tools/` directory
2. **Pre-commit**: Add hook in `.pre-commit-config.yaml`
3. **CI**: Add step in `.github/workflows/ci.yml`
4. **Documentation**: Update this file
