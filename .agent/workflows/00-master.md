---
description: Master orchestration workflow - the entry point for all development tasks
---

# Master Development Workflow

> **This is the PRIMARY workflow. ALL tasks start here.**  
> This workflow reads all docs, checks edge cases, and auto-creates required docs.

---

## 🚨 STEP 0: MANDATORY DOCUMENTATION LOAD 🚨

**You MUST read these documents before doing ANYTHING else.**

### 0.1 Read Documentation Index
// turbo
```bash
cat docs/INDEX.md
```
**Learn:** Documentation structure.

### 0.2 Read Project Requirements
// turbo
```bash
cat docs/RPD.md
```
**Learn:** Product vision, features, tech stack.

### 0.3 Read Documentation Sync Guide
// turbo
```bash
cat docs/DOC-SYNC.md
```
**Learn:** WHAT/HOW/WHERE/WHEN to update docs.

### 0.4 Read Anti-Patterns (ALWAYS!)
// turbo
```bash
cat docs/constraints/avoids.md
```
**Learn:** Things NEVER to do.

### 0.5 Read ALL Constraints
// turbo
```bash
cat docs/constraints/frontend-constraints.md
cat docs/constraints/backend-constraints.md
cat docs/constraints/testing-constraints.md
cat docs/constraints/security-constraints.md
```
**Learn:** All project rules.

### 0.6 Read Edge Cases (CRITICAL!)
// turbo
```bash
cat docs/EDGE-CASES.md
```
**Learn:** Known edge cases to handle.

### 0.7 Read Skills Catalog
// turbo
```bash
cat .agent/skills/README.md
```
**Learn:** Available skills.

### 0.8 Check Existing Plans
// turbo
```bash
ls docs/plans/ 2>/dev/null || mkdir -p docs/plans
```

---

## STEP 1: Auto-Create Required Documents

### 1.1 Read Templates
// turbo
```bash
cat docs/TEMPLATES.md
```

### 1.2 Auto-Create Plan (for features/complex tasks)
If implementing a feature, create a plan:
```bash
DATE=$(date +%Y-%m-%d)
# Create docs/plans/${DATE}-[feature-name].md using template
```

### 1.3 Identify Relevant Edge Cases
From `docs/EDGE-CASES.md`, list edge cases that apply to this task.
Add them to the plan's "Edge Cases to Handle" section.

---

## STEP 2: Classify and Route Task (MANDATORY)

You MUST select the most specific workflow for the task. **DO NOT stay in the master flow for implementation.**

| Task Type | Trigger Workflow | Requirements |
|-----------|------------------|--------------|
| **New Feature / Upgrade** | `/feature-development` | Plan -> Implementation -> Unit Test -> E2E Test |
| **Bug Fix** | `/debugging` | Reproduce -> Fix -> Regression Test |
| **Refactoring** | `/refactoring` | Check Principles -> Refactor -> Verify No Regression |
| **DevOps / CI/CD** | `master (direct)` | Action -> Verify -> Atomic Commit |

---

## 🚨 STRICT RULES (NON-NEGOTIABLE) 🚨

### R1: Action -> Test -> Commit Loop
- **RULE:** You MUST commit after every successful feature, fix, or refactor.
- **TESTING:** For features/upgrades, "Test" MUST include:
    1. `pytest` (Backend)
    2. `vitest` or `playwright` (Frontend/E2E)
    3. Manual sanity check via `curl` or UI.
- **PURPOSE:** Ensure every commit is a fully verified, non-breaking increment.

### R2: Principle Alignment
- **RULE:** Code must align with project principles (KISS, DRY, YAGNI) and existing constraints in `docs/constraints/`.
- **VERIFICATION:** Perform a self-review of every diff against these principles before the commit step.

### R3: In-Place Refactoring
- **RULE:** ❌ NEVER create `v2`, `enhanced`, or `new_version` files. Only update existing files.

### R4: Test Integrity
- **RULE:** ❌ NEVER skip failing tests. All tests must pass for a commit to occur.

### R5: Local First (Turbo Mode)
- **RULE:** Always use `./run.sh turbo` for local verification to save resources.

### R6: Mandatory Runner & README Sync
- **RULE:** You MUST update `run.sh` (if infrastructure changed) and `README.md` (to reflect new features/setup) after every workflow execution.
- **PURPOSE:** Keep the project "runnable" and "documented" at all times.

### R7: Zero Secret Leakage
- **RULE:** ❌ NEVER commit `.env`, API keys, or credentials. Check `git status` before adding.

---

## 🛠️ Operational Workflow: [Master Loop]

1. **Route**: Jump to the specific `.agent/workflows/[task].md`.
2. **Execute**: Perform the implementation/fix.
3. **Verify (Full Cycle)**:
    - Run unit tests: `./backend/.venv/bin/python3 -m pytest`
    - Run E2E tests: `bun run test:e2e` (if applicable)
    - Check principles in `docs/constraints/`.
4. **Document & Sync**: 
    - Update `docs/project-changelog.md` and `docs/EDGE-CASES.md`.
    - Update `run.sh` and `README.md` (Rule R6).
5. **Commit**: `git add .` and `git commit` (Rule R1).

## Documentation Quick Reference

### Documents to READ (STEP 0)
| Document | Purpose |
|----------|---------|
| `docs/INDEX.md` | Doc map |
| `docs/RPD.md` | Requirements |
| `docs/DOC-SYNC.md` | Update guide |
| `docs/EDGE-CASES.md` | Edge cases |
| `docs/constraints/*.md` | Rules |
| `.agent/skills/README.md` | Skills |

### Documents to CREATE/UPDATE (STEP 4)
| Document | When |
|----------|------|
| `docs/plans/*.md` | Create for features |
| `docs/project-changelog.md` | Every change |
| `docs/EDGE-CASES.md` | New/handled cases |
| `docs/constraints/*.md` | New rules |
| `run.sh` | Infrastructure changes |
| `README.md` | Feature/Setup changes |

---

## Verification Checklist

Before finishing ANY task:
- [ ] Read all docs (STEP 0)?
- [ ] Read edge cases?
- [ ] Created plan (if feature)?
- [ ] Followed **STRICT RULES (R1-R7)**?
- [ ] Handled relevant edge cases?
- [ ] Updated changelog and edge case status?
- [ ] Updated `run.sh` and `README.md` (Rule R6)?
- [ ] Checked for secrets (Rule R7)?
- [ ] All tests pass?
- [ ] **Committed immediately after test success (Rule R1)?**
