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
├── backend/                # Python FastAPI backend
├── docs/                  # Documentation
├── frontend/              # Next.js frontend
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
| Duplicate graph modules | `backend/app/graph/` and `backend/app/rag/graph/` | Two separate graph implementations exist with similar names (nodes.py, state.py). The `backend/app/graph/` is used for the main agent workflow while `backend/app/rag/graph/` is for RAG-specific graphs. This creates confusion. |
| Nested empty eval config dirs | `backend/app/eval/{datasets,metrics,runners,config}/` | These appear to be brace expansion artifacts that were never properly created as directories. |

### 2.2 Empty or Unused Files

| File | Size | Issue |
|------|------|-------|
| `backend/README.md` | 0 bytes | Empty README - REMOVED |
| `backend/data/.keep` | 0 bytes | Empty placeholder - REMOVED |
| `openapi.json` | 0 bytes | Empty file - REMOVED |

**Note:** `backend/app/rag/store/__init__.py` and `backend/app/rag/tools/__init__.py` are REQUIRED for Python package imports and should NOT be removed.

### 2.3 Environment File Issues

| Issue | Details |
|-------|---------|
| Multiple .env files | Found: `./.env`, `backend/.env`, `backend/.env.local`, `backend/.env.example` |
| Root .env at project level | The root `.env` contains sensitive data and should not be in the repository root |
| Inconsistent .env locations | Backend has its own .env but root also has one |

### 2.4 Large Files

The following files exceed 10,000 characters and may benefit from refactoring:

| File | Approx. Size |
|------|-------------|
| `run.sh` | 24,082 chars |
| `openapi-workspace-document.json` | 31,229 chars |
| `backend/app/api/v1/completions.py` | ~29,792 chars |
| `backend/app/services/chat_service.py` | ~28,069 chars |
| `backend/app/core/telemetry.py` | ~21,451 chars |
| `backend/app/eval/metrics/generation.py` | ~21,002 chars |
| `backend/app/schemas/baas.py` | ~19,852 chars |
| `backend/app/main.py` | ~14,383 chars |

### 2.5 Duplicate Filenames in Different Locations

The following filenames appear in multiple locations (legitimate but worth noting):

| Filename | Locations |
|----------|-----------|
| `auth.py` | `backend/app/core/auth.py`, `backend/app/api/v1/auth.py` |
| `base.py` | Multiple locations (base classes in different modules) |
| `chat.py` | `backend/app/api/v1/chat.py`, `backend/app/schemas/chat.py` |
| `documents.py` | `backend/app/api/v1/documents.py`, `backend/app/schemas/documents.py` |
| `nodes.py` | `backend/app/graph/nodes.py`, `backend/app/rag/graph/nodes.py` |
| `state.py` | `backend/app/graph/state.py`, `backend/app/rag/graph/state.py` |

### 2.6 Unused Artifacts Removed

| File | Notes |
|------|-------|
| `backend/backend/data/settings.json` | Unused nested config - REMOVED |
| `backend/backend/data/tools.json` | Unused nested config - REMOVED |

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
- `backend/README.md` (empty)
- `backend/data/.keep` (empty placeholder)
- `backend/backend/data/settings.json` (unused nested config)
- `backend/backend/data/tools.json` (unused nested config)

### Files Restored (Required)
- `backend/app/rag/store/__init__.py` (required for Python imports)
- `backend/app/rag/tools/__init__.py` (required for Python imports)

### Documentation Added
- `ARCHITECTURE_ANALYSIS.md` - Comprehensive analysis report

---

## 5. Remaining Recommendations

### High Priority
1. Review `.env` file handling - ensure no secrets are committed
2. Consider adding `backend/data/` and `backend/backend/` to `.gitignore`

### Medium Priority
1. Consider clarifying the relationship between `backend/app/graph/` and `backend/app/rag/graph/`
2. Split large files like `completions.py`, `chat_service.py` if they have multiple responsibilities

### Low Priority
1. Standardize service naming conventions

---

*Generated: 2026-03-05*
*Updated: 2026-03-05*
