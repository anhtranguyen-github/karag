# DevSecOps Documentation

> **Note:** This is a living document. As the project's security posture and CI/CD pipelines evolve, please keep this document updated to reflect the current state of tooling, processes, and procedures.

---

## 1. Overview

This project follows a **DevSecOps** philosophy that embeds security into every stage of the software development lifecycle. Our approach prioritizes:

1. **Correctness** - Fast feedback loops with linting and unit tests
2. **Behavior** - Integration and contract testing to validate system behavior
3. **Security** - Multi-layered security scanning (SAST, secrets, IaC, containers)
4. **Deployment** - Automated, verified deployments to production

Security is not an afterthought—it's integrated into our CI/CD pipelines, enforced through quality gates, and validated continuously.

---

## 2. CI/CD Pipelines

### 2.1 GitHub Actions Workflow

**File:** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

The GitHub Actions pipeline runs on every push to `main` or `dev` branches and on all pull requests targeting these branches.

| Stage | Name | Description | Dependencies |
|-------|------|-------------|--------------|
| 1 | `backend-ci` | Backend linting (ruff) and unit tests | - |
| 2 | `frontend-ci` | Frontend build and quality checks | - |
| 3 | `security-audit` | Security scanning (TruffleHog, Checkov, Docker verify) | backend-ci, frontend-ci |
| 4 | `deploy-vercel` | Deploy frontend to Vercel | security-audit |
| 5 | `build-and-push-containers` | Build and push images to GHCR | backend-ci, frontend-ci |
| 6 | `container-security-scan` | Trivy vulnerability scanning on containers | build-and-push-containers |

**Pipeline Architecture:**
```
┌─────────────┐     ┌─────────────┐
│ backend-ci  │     │ frontend-ci │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ▼
       ┌───────────────────┐
       │   security-audit  │
       └─────────┬─────────┘
                 ▼
       ┌───────────────────┐
       │   deploy-vercel   │
       └───────────────────┘
```

**Container Pipeline (Parallel):**
```
┌─────────────┐     ┌─────────────┐
│ backend-ci  │     │ frontend-ci │
└──────┬──────┘     └──────┬──────┘
       │                   │
       └─────────┬─────────┘
                 ▼
  ┌───────────────────────────────┐
  │  build-and-push-containers    │
  └───────────────┬───────────────┘
                  ▼
  ┌───────────────────────────────┐
  │   container-security-scan     │
  └───────────────────────────────┘
```

### 2.2 Jenkins Pipeline

**File:** [`Jenkinsfile`](../Jenkinsfile)

The Jenkins pipeline provides a more comprehensive, enterprise-grade CI/CD workflow with detailed reporting and SonarQube integration.

| Stage | Description |
|-------|-------------|
| `Initialize` | Workspace setup and preparation |
| `Build & Lint` | Parallel backend (uv sync, ruff) and frontend (pnpm install, build, lint) |
| `Test` | Parallel test execution (unit, contract, integration, frontend vitest) |
| `Security SAST` | Bandit, Semgrep, and API audit scans |
| `Supply Chain & Artifacts` | Dependency verification and Docker build validation |
| `Infrastructure & Config` | Checkov IaC scanning and prompt validation |
| `Quality Gate: SonarQube` | Final quality gate with SonarQube analysis |

**Trigger Conditions:**
- GitHub Actions: Push to `main`/`dev` branches, PRs to `main`/`dev`
- Jenkins: Typically triggered by SCM polling or webhook

---

## 3. Security Scanning Tools

Our security strategy employs defense in depth with multiple specialized tools:

### 3.1 Tool Overview

| Tool | Purpose | Where It Runs |
|------|---------|---------------|
| **Bandit** | Python SAST - detects common security issues | Jenkins |
| **Semgrep** | Enhanced SAST - multi-language static analysis | Jenkins |
| **TruffleHog** | Secret scanning - detects leaked credentials | GitHub Actions |
| **Checkov** | IaC scanning - Dockerfile, K8s, Compose, GHA (optional/non-blocking) | Both |
| **Trivy** | Container scanning - OS and application vulnerabilities | GitHub Actions |

### 3.2 Tool Details

#### SAST (Static Application Security Testing)

**Bandit** ([`src/backend/pyproject.toml`](../src/backend/pyproject.toml))
- Focuses on Python-specific security issues
- Runs with confidence level `-ll` (medium and high)
- Configuration in dev dependency group

**Semgrep**
- Uses auto-config for comprehensive rule coverage
- Runs with `--error` flag to fail on findings
- Executed via `uvx` to avoid project dependency bloat

#### Secret Scanning

**TruffleHog** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml))
- Scans for leaked secrets, API keys, and credentials
- Uses `--only-verified` to reduce false positives
- Compares against base/head for PRs

#### IaC Scanning

**Checkov** (Optional/Non-Blocking)
- Scans Dockerfiles, GitHub Actions, Kubernetes, Docker Compose
- Reports `HIGH` and `CRITICAL` severity findings but does **not** fail the build
- Runs in both GitHub Actions and Jenkins pipelines
- Configured with `continue-on-error: true` in GitHub Actions to allow builds to proceed

#### Container Scanning

**Trivy** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml))
- Scans built container images for vulnerabilities
- Outputs SARIF format for GitHub Security tab integration
- Fails on `HIGH` and `CRITICAL` severity (`exit-code: '1'`)
- Scans both backend and frontend images

---

## 4. Testing Strategy

### 4.1 Backend Testing

**Framework:** pytest ([`src/backend/pyproject.toml`](../src/backend/pyproject.toml), [`src/backend/pytest.ini`](../src/backend/pytest.ini))

**Test Markers:**

| Marker | Purpose | Location |
|--------|---------|----------|
| `unit` | Fast tests with deterministic mocks | `src/backend/tests/unit/` |
| `integration` | Tests with stubbed services | `src/backend/tests/integration/` |
| `contract` | Schema validation tests | `src/backend/tests/contract/` |
| `canary` | Real LLM provider tests (non-blocking) | `src/backend/tests/canary/` |
| `e2e` | Full end-to-end user flows | `src/backend/tests/e2e/` |

**Coverage:**
- Configured with `pytest-cov`
- Reports generated in XML format for SonarQube ingestion
- Jenkins generates coverage reports at `results/coverage.xml`

### 4.2 Frontend Testing

**Framework:** Vitest ([`src/frontend/vitest.config.ts`](../src/frontend/vitest.config.ts))

**Configuration:**
- Environment: `jsdom` for DOM simulation
- Globals enabled for cleaner test syntax
- Setup file: `tests/setup.ts`
- Test locations:
  - `tests/unit/**/*.test.{ts,tsx}`
  - `tests/integration/**/*.test.{ts,tsx}`

**Commands:**
- `pnpm test` - Run tests in watch mode
- `pnpm test:unit` - Run tests once (CI mode)

### 4.3 Coverage Reporting

**SonarQube** ([`sonar-project.properties`](../sonar-project.properties))
- Aggregates coverage from both backend and frontend
- Backend: `src/backend/tests/results/coverage.xml`
- Frontend: `src/frontend/coverage/lcov.info`
- Python version: 3.10
- Excludes: `__pycache__`, `.venv`, `node_modules`, `.next`, `build`

---

## 5. Container Registry

### 5.1 GitHub Container Registry (GHCR)

Images are published to GitHub Container Registry for secure, versioned deployments.

**Image Naming Convention:**

```
ghcr.io/{owner}/{repo}/backend:{sha}
ghcr.io/{owner}/{repo}/frontend:{sha}
```

**Tags Applied:**
- `sha` (long format) - Immutable reference
- `branch` - Reference to branch name
- `latest` - Only applied to `main` branch builds

**Example:**
```
ghcr.io/karag-platform/karag/backend:abc123def456...
ghcr.io/karag-platform/karag/backend:latest
ghcr.io/karag-platform/karag/backend:main
```

### 5.2 Authentication

Authentication uses the built-in `GITHUB_TOKEN`:

```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

### 5.3 Build Process

Multi-stage Docker builds for optimized images:

**Backend:**
- Stage 1: Builder with `uv` for dependency sync
- Stage 2: Runtime with non-root `appuser`
- Supports CPU/GPU variants via `TARGET_DEVICE` build arg

**Frontend:**
- Stage 1: Builder with Next.js standalone output
- Stage 2: Runtime with non-root `nodejs` user
- Includes healthcheck endpoints

---

## 6. Quality Gates

### 6.1 Build Failure Conditions

A build will fail if any of the following conditions are met:

| Check | Failure Condition |
|-------|-------------------|
| **Lint Errors** | ruff finds Python syntax/style issues |
| **Test Failures** | pytest or vitest reports failing tests |
| **SAST Findings** | Bandit or Semgrep detects security issues |
| **Secret Leaks** | TruffleHog finds verified secrets |
| **IaC Violations** | Checkov reports findings (non-blocking, scan runs but doesn't fail build) |
| **Container Vulns** | Trivy finds HIGH/CRITICAL vulnerabilities |
| **SonarQube** | Quality gate fails (coverage, duplications, issues) |

### 6.2 Container Security Policy

Trivy container scans are configured with strict failure criteria:

```yaml
severity: 'HIGH,CRITICAL'
exit-code: '1'
```

This means:
- Any HIGH or CRITICAL vulnerability will fail the pipeline
- Results are uploaded to GitHub Security tab in SARIF format
- Scans run on both backend and frontend images

### 6.3 Supply Chain Security

- `uv lock --check` verifies dependency lock file consistency
- Docker builds use `--frozen-lockfile` for reproducible installs
- No cache mounts in production image builds

---

## 7. Local Development

### 7.1 Backend Commands

```bash
# Navigate to backend directory
cd src/backend

# Run linting (ruff)
uv run ruff check .

# Run security scan (bandit)
uv run bandit -r app/

# Run tests
uv run pytest

# Run specific test markers
uv run pytest -m unit
uv run pytest -m integration

# Run with coverage
uv run pytest --cov=app --cov-report=html
```

### 7.2 Frontend Commands

```bash
# Navigate to frontend directory
cd src/frontend

# Install dependencies
pnpm install

# Run tests
pnpm test              # Watch mode
pnpm test:unit         # CI mode (single run)

# Build
pnpm run build

# Lint
pnpm run lint
```

### 7.3 Pre-commit Checks

Before pushing code, run these checks locally:

```bash
# Backend
cd src/backend && uv run ruff check . && uv run bandit -r app/ && uv run pytest -m unit

# Frontend  
cd src/frontend && pnpm run lint && pnpm test:unit
```

---

## 8. Configuration Files Reference

| File | Purpose |
|------|---------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | GitHub Actions CI/CD pipeline |
| [`Jenkinsfile`](../Jenkinsfile) | Jenkins pipeline definition |
| [`GITHUB_SECRETS.md`](./GITHUB_SECRETS.md) | **Repository secrets and variables setup guide** |
| [`sonar-project.properties`](../sonar-project.properties) | SonarQube configuration |
| [`src/backend/pyproject.toml`](../src/backend/pyproject.toml) | Python dependencies and tool config |
| [`src/backend/pytest.ini`](../src/backend/pytest.ini) | pytest configuration and markers |
| [`src/frontend/vitest.config.ts`](../src/frontend/vitest.config.ts) | Vitest test runner configuration |
| [`src/backend/Dockerfile`](../src/backend/Dockerfile) | Backend container build |
| [`src/frontend/Dockerfile`](../src/frontend/Dockerfile) | Frontend container build |
| [`docker-compose.yml`](../docker-compose.yml) | Local development stack |

---

## 9. Security Contact

If you discover a security vulnerability, please follow responsible disclosure practices:

1. **Do not** open a public issue
2. Contact the maintainers privately
3. Allow time for remediation before public disclosure

---

*Last updated: 2026-03-04*

