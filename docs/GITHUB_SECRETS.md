# GitHub Repository Secrets

This document lists all secrets and variables required for the GitHub Actions DevSecOps pipeline. Configure these in your repository at **Settings → Secrets and variables → Actions**.

---

## 1. Required Secrets

These secrets **MUST** be configured for the CI/CD pipeline to function correctly.

| Secret | Description | Used In |
|--------|-------------|---------|
| `VERCEL_TOKEN` | Vercel personal access token for deployment authentication | [`deploy-vercel`](../.github/workflows/ci.yml) job |
| `VERCEL_ORG_ID` | Your Vercel organization ID (found in `.vercel/project.json` or Vercel dashboard) | [`deploy-vercel`](../.github/workflows/ci.yml) job |
| `VERCEL_PROJECT_ID` | Your Vercel project ID (found in `.vercel/project.json` or Vercel dashboard) | [`deploy-vercel`](../.github/workflows/ci.yml) job |

### Required Secrets Details

#### VERCEL_TOKEN
- **Purpose**: Authenticates the GitHub Actions workflow with Vercel for deployments
- **How to obtain**:
  1. Go to [vercel.com](https://vercel.com) and log in
  2. Navigate to **Settings → Tokens**
  3. Click **Create Token**
  4. Give it a descriptive name (e.g., "GitHub Actions CI")
  5. Copy the generated token immediately (it won't be shown again)

#### VERCEL_ORG_ID
- **Purpose**: Identifies your Vercel organization/team
- **How to obtain**:
  1. Go to your Vercel dashboard
  2. Navigate to **Settings → General**
  3. Copy the **Organization ID** value
  4. Alternatively, run `vercel env pull` locally and check the `.vercel/project.json` file

#### VERCEL_PROJECT_ID
- **Purpose**: Identifies the specific Vercel project for deployment
- **How to obtain**:
  1. Go to your Vercel project dashboard
  2. Navigate to **Settings → General**
  3. Copy the **Project ID** value
  4. Alternatively, check `.vercel/project.json` in your local project

---

## 2. Optional Secrets

These secrets are optional but recommended for enhanced functionality.

| Secret | Description | Used In |
|--------|-------------|---------|
| `SONAR_TOKEN` | SonarQube/SonarCloud authentication token for code quality analysis | Jenkins pipeline (SonarQube stage) |
| `NEXT_PUBLIC_API_URL` | Public API URL for frontend build-time configuration | [`frontend-ci`](../.github/workflows/ci.yml) job |

### Optional Secrets Details

#### SONAR_TOKEN
- **Purpose**: Enables SonarQube code quality analysis and quality gates
- **When needed**: If using SonarCloud or a self-hosted SonarQube instance
- **How to obtain (SonarCloud)**:
  1. Go to [sonarcloud.io](https://sonarcloud.io) and log in
  2. Navigate to your project → **Administration → Analysis Method**
  3. Select **GitHub Actions** or **Other CI**
  4. Copy the generated token
- **How to obtain (Self-hosted SonarQube)**:
  1. Log in to your SonarQube instance
  2. Go to **My Account → Security**
  3. Generate a new token under **Generate Tokens**

#### NEXT_PUBLIC_API_URL
- **Purpose**: Sets the backend API URL for frontend builds
- **When needed**: If your frontend needs to know the API endpoint at build time
- **Example value**: `https://api.example.com` or `https://api-staging.example.com`
- **Note**: This is a public variable (exposed to the browser), so do not include sensitive credentials

---

## 3. Built-in Tokens (No Configuration Needed)

These tokens are automatically provided by GitHub and require **no manual configuration**.

| Token | Description | Permissions |
|-------|-------------|-------------|
| `GITHUB_TOKEN` | Automatically generated for each workflow run | Contents: read, Packages: write |

### GITHUB_TOKEN Usage

The `GITHUB_TOKEN` is used in our pipeline for:

- **GHCR Authentication**: Authenticating with GitHub Container Registry to push Docker images
- **Workflow Permissions**: Enabled via `permissions` block in workflow

```yaml
permissions:
  contents: read
  packages: write
```

**Note**: You do NOT need to create this secret manually. GitHub automatically injects it into every workflow run.

---

## 4. Repository Variables (Not Secrets)

These are non-sensitive configuration values that should be set as **Variables** (not Secrets) in GitHub.

| Variable | Description | Used In |
|----------|-------------|---------|
| `SONAR_HOST_URL` | URL of your SonarQube instance (if self-hosted) | Jenkins pipeline |

### Repository Variables Details

#### SONAR_HOST_URL
- **Purpose**: Points to your SonarQube server URL
- **When needed**: Only if using a self-hosted SonarQube instance (not SonarCloud)
- **Example value**: `https://sonarqube.company.com`
- **SonarCloud users**: Do not set this; SonarCloud uses the default `https://sonarcloud.io`

**How to add a Variable**:
1. Go to **Settings → Secrets and variables → Actions**
2. Click the **Variables** tab
3. Click **New repository variable**
4. Enter name and value
5. Click **Add variable**

---

## 5. Setup Instructions

### 5.1 Adding Secrets in GitHub UI

1. Navigate to your repository on GitHub
2. Click **Settings** (tab at the top)
3. In the left sidebar, click **Secrets and variables → Actions**
4. Click the **Secrets** tab
5. Click **New repository secret**
6. Enter the secret **Name** (e.g., `VERCEL_TOKEN`)
7. Enter the secret **Value**
8. Click **Add secret**
9. Repeat for all required secrets

### 5.2 Getting Vercel Tokens

#### Step 1: Create Vercel Token
1. Go to [vercel.com/tokens](https://vercel.com/tokens)
2. Click **Create Token**
3. Name: `GitHub Actions CI`
4. Scope: Select your team/organization
5. Copy the token immediately

#### Step 2: Get Organization and Project IDs

**Option A - From Vercel Dashboard:**
1. Go to your project on Vercel
2. Click **Settings → General**
3. Copy both **Project ID** and **Organization ID**

**Option B - From Local Project:**
```bash
# If you have the Vercel CLI installed
vercel env pull

# Check the generated .vercel/project.json file
cat .vercel/project.json
```

The file will contain:
```json
{
  "orgId": "your-org-id-here",
  "projectId": "your-project-id-here"
}
```

### 5.3 Configuring SonarQube (Optional)

**For SonarCloud:**
1. Go to [sonarcloud.io](https://sonarcloud.io)
2. Import your GitHub repository
3. Follow the setup wizard to get your `SONAR_TOKEN`
4. The project configuration is in [`sonar-project.properties`](../sonar-project.properties)

**For Self-Hosted SonarQube:**
1. Create a token in your SonarQube instance
2. Add `SONAR_TOKEN` as a secret
3. Add `SONAR_HOST_URL` as a repository variable

---

## 6. Security Best Practices

### 6.1 Never Commit Secrets

- **Never** commit secrets to your repository
- **Never** include secrets in code, even in comments
- **Never** log secrets in workflow outputs

Our pipeline includes [TruffleHog](../.github/workflows/ci.yml) scanning to detect accidentally committed secrets.

### 6.2 Rotate Tokens Regularly

- **Vercel Tokens**: Rotate every 90 days
- **SonarQube Tokens**: Rotate every 90 days
- **Set calendar reminders** for token rotation

### 6.3 Use Minimal Permissions

When creating tokens, grant only the minimum required permissions:

- **Vercel Token**: Only needs deployment permissions for the specific project
- **SonarQube Token**: Only needs "Execute Analysis" permission

### 6.4 Audit Secret Access

GitHub provides audit logs for secret usage:
1. Go to **Settings → Security → Audit log**
2. Filter by "Secrets" events
3. Review access patterns regularly

### 6.5 Use GitHub Environments (Optional)

For additional security with production deployments, consider using GitHub Environments:

1. Go to **Settings → Environments**
2. Create environments: `staging`, `production`
3. Add environment-specific secrets
4. Configure protection rules (required reviewers, wait timer)

---

## 7. Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Vercel deployment failed" | Missing or incorrect `VERCEL_TOKEN` | Verify token is valid and not expired |
| "Cannot find project" | Wrong `VERCEL_PROJECT_ID` | Check project ID in Vercel dashboard |
| "GHCR login failed" | Insufficient permissions | Ensure `packages: write` permission is set |
| "SonarQube analysis failed" | Missing `SONAR_TOKEN` | Add token or disable SonarQube stage |

### Checking Secret Configuration

If a workflow fails due to missing secrets:

1. Verify the secret exists: **Settings → Secrets and variables → Actions**
2. Check secret name matches exactly (case-sensitive)
3. Re-create the secret if the value might be incorrect
4. Check workflow logs for specific error messages

---

## 8. Summary Table

| Category | Name | Type | Required |
|----------|------|------|----------|
| Vercel | `VERCEL_TOKEN` | Secret | ✅ Yes |
| Vercel | `VERCEL_ORG_ID` | Secret | ✅ Yes |
| Vercel | `VERCEL_PROJECT_ID` | Secret | ✅ Yes |
| GitHub | `GITHUB_TOKEN` | Built-in | ✅ Auto-provided |
| SonarQube | `SONAR_TOKEN` | Secret | ❌ Optional |
| SonarQube | `SONAR_HOST_URL` | Variable | ❌ Optional |
| Frontend | `NEXT_PUBLIC_API_URL` | Secret | ❌ Optional |

---

## Related Documentation

- [DEVSECOPS.md](./DEVSECOPS.md) - Full DevSecOps pipeline documentation
- [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) - GitHub Actions workflow file
- [`sonar-project.properties`](../sonar-project.properties) - SonarQube configuration
