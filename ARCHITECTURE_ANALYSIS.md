# Repository Architecture Analysis

## Overview

This report documents the current structure of the karag repository, identifying issues and opportunities for improvement. The analysis follows a systematic exploration of the codebase to understand its organization, dependencies, and potential problems.

---

## 1. Directory Structure Overview

### Root Level
```
karag/
├── .dockerignore
├── .env                    # Root-level environment file (contains secrets)
├── .gitattributes
├── .gitignore
├── .pre-commit-config.yaml
├── CHANGELOG.md
├── docker-compose.yml
├── eval_test_report.json   # Test artifact
├── importlinter.ini
├── Jenkinsfile
├── nginx.conf
├── openapi-workspace-document.json
├── pytest.ini
├── README.md
├── requirements.txt
├── run.sh                  # Large shell script (24KB)
├── setup_jenkins_tools.sh
├── sonar-project.properties
├── vercel.json
├── .github/                # GitHub workflows
├── src/backend/                # Python FastAPI backend
├── docs/                  # Documentation
├── src/frontend/              # Next.js frontend
├── groovy_scripts/        # Jenkins groovy scripts
├── k8s/                   # Kubernetes configs
├── scripts/               # Utility scripts
├── tests/                 # Root-level tests
└── tools/                 # Development tools
```

---

## 2. Issues Identified

### 2.1 Duplicate/Confusing Directory Structures

| Issue | Location | Description |
|-------|----------|-------------|
| Duplicate graph modules | `src/backend/app/graph/` and `src/backend/app/rag/graph/` | Two separate graph implementations exist with similar names (nodes.py, state.py). The `src/backend/app/graph/` is used for the main agent workflow while `src/backend/app/rag/graph/` is for RAG-specific graphs. This creates confusion. |
| Nested empty eval config dirs | `src/backend/app/eval/{datasets,metrics,runners,config}/` | These appear to be brace expansion artifacts that were never properly created as directories. |

### 2.2 Empty or Unused Files

| File | Size | Issue |
|------|------|-------|
| `src/backend/README.md` | 0 bytes | Empty README - REMOVED |
| `src/backend/data/.keep` | 0 bytes | Empty placeholder - REMOVED |
| `openapi.json` | 0 bytes | Empty file - REMOVED |

**Note:** `src/backend/app/rag/store/__init__.py` and `src/backend/app/rag/tools/__init__.py` are REQUIRED for Python package imports and should NOT be removed.

### 2.3 Environment File Issues

| Issue | Details |
|-------|---------|
| Multiple .env files | Found: `./.env`, `src/backend/.env`, `src/backend/.env.local`, `src/backend/.env.example` |
| Root .env at project level | The root `.env` contains sensitive data and should not be in the repository root |
| Inconsistent .env locations | Backend has its own .env but root also has one |

### 2.4 Large Files

The following files exceed 10,000 characters and may benefit from refactoring:

| File | Approx. Size |
|------|-------------|
| `run.sh` | 24,082 chars |
| `openapi-workspace-document.json` | 31,229 chars |
| `src/backend/app/api/v1/completions.py` | ~29,792 chars |
| `src/backend/app/services/chat_service.py` | ~28,069 chars |
| `src/backend/app/core/telemetry.py` | ~21,451 chars |
| `src/backend/app/eval/metrics/generation.py` | ~21,002 chars |
| `src/backend/app/schemas/baas.py` | ~19,852 chars |
| `src/backend/app/main.py` | ~14,383 chars |

### 2.5 Duplicate Filenames in Different Locations

The following filenames appear in multiple locations (legitimate but worth noting):

| Filename | Locations |
|----------|-----------|
| `auth.py` | `src/backend/app/core/auth.py`, `src/backend/app/api/v1/auth.py` |
| `base.py` | Multiple locations (base classes in different modules) |
| `chat.py` | `src/backend/app/api/v1/chat.py`, `src/backend/app/schemas/chat.py` |
| `documents.py` | `src/backend/app/api/v1/documents.py`, `src/backend/app/schemas/documents.py` |
| `nodes.py` | `src/backend/app/graph/nodes.py`, `src/backend/app/rag/graph/nodes.py` |
| `state.py` | `src/backend/app/graph/state.py`, `src/backend/app/rag/graph/state.py` |

### 2.6 Unused Artifacts Removed

| File | Notes |
|------|-------|
| `src/backend/src/backend/data/settings.json` | Unused nested config - REMOVED |
| `src/backend/src/backend/data/tools.json` | Unused nested config - REMOVED |

---

## 3. Import Analysis

### Import Style
The codebase uses absolute imports from the project root:
```python
from backend.app.core.config import Settings
from backend.app.api.v1.chat import router
```

This is consistent across the codebase.

---

## 4. Summary of Changes Made

### Files Removed (Safe Cleanup)
- `openapi.json` (empty, unused)
- `src/backend/README.md` (empty)
- `src/backend/data/.keep` (empty placeholder)
- `src/backend/src/backend/data/settings.json` (unused nested config)
- `src/backend/src/backend/data/tools.json` (unused nested config)

### Files Restored (Required)
- `src/backend/app/rag/store/__init__.py` (required for Python imports)
- `src/backend/app/rag/tools/__init__.py` (required for Python imports)

### Documentation Added
- `ARCHITECTURE_ANALYSIS.md` - Comprehensive analysis report

---

## 5. Remaining Recommendations

### High Priority
1. Review `.env` file handling - ensure no secrets are committed
2. Consider adding `src/backend/data/` and `src/backend/src/backend/` to `.gitignore`

### Medium Priority
1. Consider clarifying the relationship between `src/backend/app/graph/` and `src/backend/app/rag/graph/`
2. Split large files like `completions.py`, `chat_service.py` if they have multiple responsibilities

### Low Priority
1. Standardize service naming conventions

---

*Generated: 2026-03-05*
*Updated: 2026-03-05*

