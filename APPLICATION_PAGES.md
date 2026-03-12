# Application Pages and Screens Documentation

This document describes each page and screen of the Karag RAG platform application, focusing on their functionality and user interactions. The application follows a three-tier hierarchy: **Organization → Project → Workspace**.

---

## Application Structure Overview

```
Organization
├── Projects
├── Team (Members)
├── Settings
└── Billing

Project
├── Workspaces
├── Documents
├── Storage
├── Settings
├── Members
├── Billing
└── Integrations

Workspace (Core RAG Functionality)
├── Operational Workspace (Overview)
├── Chat
├── Thread History
├── Context Documents
├── Runtime Models
├── Settings
├── API Keys
├── Billing
├── Members
└── Playground
```

---

## Organization-Level Pages

### Projects

**Purpose:** Lists all projects within the organization.

**Functionality:**
- Display all projects as cards showing name, description, and status
- Search functionality to filter projects by name, ID, or description
- "New Project" button to create additional projects
- Click on a project card to navigate to the project detail page

**User Interaction:**
1. User views the list of projects
2. User can search for specific projects
3. User can click "New Project" to create a new project
4. User clicks a project card to open it

---

### Team (Members)

**Purpose:** Displays organization members with their roles and permissions.

**Functionality:**
- Lists all members of the organization
- Shows member details: email, display name, role, MFA status
- Roles include: Owner, Administrator

**User Interaction:**
1. User views the list of organization members
2. Current implementation uses placeholder data

---

### Settings

**Purpose:** Allows editing of organization identity and metadata.

**Functionality:**
- Display organization identifier (read-only)
- Edit organization name
- Edit organization description
- Save changes functionality

**User Interaction:**
1. User views current organization details
2. User modifies name or description
3. User clicks "Save Changes" to persist changes

---

### Billing

**Purpose:** Indicates deployment ownership and billing model.

**Functionality:**
- Feature page showing deployment information
- Displays: Hosting type (Self-hosted), Billing model (Manual), Control level (Full)

**User Interaction:**
1. User views the billing information page
2. This is informational - the application is self-hosted with no hosted control plane dependency

---

## Project-Level Pages

### Workspaces

**Purpose:** Lists all workspaces within the project.

**Functionality:**
- Display all workspaces as cards with name, description, and status
- Search functionality to filter workspaces
- "New Workspace" button to create additional workspaces
- Delete workspace functionality with confirmation
- Click on workspace card to navigate to workspace

**User Interaction:**
1. User views the list of workspaces
2. User can search for specific workspaces
3. User can click "New Workspace" to create a new workspace
4. User clicks a workspace card to open it
5. User can delete a workspace using the trash icon

---

### Documents

**Purpose:** Project-level document management for uploading and indexing files.

**Functionality:**
- File upload via drag-and-drop or file picker
- Support for multiple file uploads
- Display document list with status: Indexed, Processing, Pending, Failed
- Show file size and processing status for each document
- Statistics: Total files, Indexed count, Total size
- Real-time upload progress tracking

**User Interaction:**
1. User drags files onto the upload area or clicks to browse
2. Files are uploaded and processed
3. User can search through uploaded documents
4. Status updates show processing progress

---

### Storage

**Purpose:** Configures document storage backend for the project.

**Functionality:**
- Configure storage provider (e.g., MinIO)
- Set endpoint URL
- Provide access credentials (access key, secret key)
- Configure bucket name
- Toggle secure connection (SSL/TLS)
- Save configuration changes

**User Interaction:**
1. User configures storage provider settings
2. User enters endpoint and credentials
3. User clicks save to persist configuration

---

### Settings

**Purpose:** Edit project identity and metadata.

**Functionality:**
- Display project identifier (read-only)
- Edit project name
- Edit project description
- Save changes functionality

**User Interaction:**
1. User views current project details
2. User modifies name or description
3. User clicks "Save Changes" to persist changes

---

### Members

**Purpose:** Project-level membership management.

**Functionality:**
- Lists project members with roles
- Shows: email, display name, role, MFA status
- Roles include: Owner, Developer

**User Interaction:**
1. User views project members list
2. Current implementation uses placeholder data

---

### Billing

**Purpose:** Indicates project ownership and cost model.

**Functionality:**
- Feature page showing project ownership information
- Displays: Runtime (Private), Spend (External), Managed by (User)

**User Interaction:**
1. User views the billing information page
2. This is informational - projects inherit deployment model

---

### Integrations

**Purpose:** Placeholder for provider and external service setup.

**Functionality:**
- Feature page indicating planned functionality
- Shows: Status (Planned), Sources (Backend), Scope (Project)

**User Interaction:**
1. User views the integrations placeholder page

---

## Workspace-Level Pages (Core RAG Functionality)

### Operational Workspace (Overview)

**Purpose:** Dashboard providing quick access to workspace functionality and system status.

**Functionality:**
- Display metrics: Document count, Vector Store status, LLM Provider status
- Navigation cards to main features:
  - Workspace Chat
  - Thread History
  - Context Documents
- System status panel showing backend dependencies

**User Interaction:**
1. User views workspace overview dashboard
2. User can click cards to navigate to Chat, History, or Context Documents
3. User can view system dependency health status

---

### Chat

**Purpose:** Main AI interaction interface for asking questions and receiving AI responses.

**Functionality:**
- **Message Input:** Text input field for user queries
- **Session Management:** 
  - Create new chat sessions
  - Switch between existing sessions
  - Sessions persist across page refreshes
- **AI Responses:**
  - Display AI-generated responses
  - Show source documents used (citations)
  - Show pipeline trace (reasoning steps)
  - Display timestamps
- **Suggested Prompts:** Quick suggestions like "Summarize recent logs", "Check RAG strategy", etc.
- **Error Handling:** Display error messages when AI requests fail

**User Interaction:**
1. User types a message in the input field
2. User presses Enter or clicks Send
3. If no session exists, a new session is created
4. AI response appears with sources and trace
5. User can view sources by clicking source cards
6. User can expand trace section to see reasoning steps
7. User can start new chats or switch sessions

**Key Feature - Sources/Citations:**
Assistant responses include source cards showing which documents were used. Each source displays:
- Document title
- Clickable to view source details
- Rendered as visual badges below AI responses

**Key Feature - Message Traces:**
Pipeline traces show step-by-step reasoning:
- Query transformation steps
- Retrieval operations
- Processing stages
- Displayed in an expandable trace section

---

### Thread History

**Purpose:** Lists all saved chat sessions with metadata.

**Functionality:**
- Display all chat sessions as cards
- Show session title and preview of last message
- Show message count per session
- Show trace availability indicator (if session has trace steps)
- Search functionality to filter sessions
- "New Chat" button to start fresh conversation

**User Interaction:**
1. User views list of past chat sessions
2. User can search for specific sessions
3. User clicks a session card to open it in Chat
4. User can start a new chat session

---

### Context Documents

**Purpose:** Workspace-scoped document management - attaching documents from project to workspace for RAG context.

**Functionality:**
- **Workspace Documents:** Documents attached to this workspace
- **Import from Project:** Browse and import documents from project's document collection
- **Ingestion Tracking:**
  - Real-time progress via WebSocket
  - Status stages: queued, reading, chunking, embedding, storing, completed, failed
  - Progress percentage display
- **Document Management:**
  - Attach/detach documents to workspace
  - Remove documents from workspace
- **Search:** Filter workspace documents

**User Interaction:**
1. User views documents currently attached to workspace
2. User clicks "Import" to open import modal
3. User selects documents from project to attach
4. User can monitor ingestion progress in real-time
5. User can detach documents when no longer needed

---

### Runtime Models

**Purpose:** Catalog displaying all available AI models configured for the workspace.

**Functionality:**
- Display models grouped by type:
  - Inference models (LLMs)
  - Embedding models
  - Reranking models
- Show provider, model name, and type for each
- Search functionality to filter models

**User Interaction:**
1. User views catalog of available models
2. User can search for specific models
3. Models are detected from runtime configuration

---

### Settings

**Purpose:** Edit workspace identity, description, and manage workspace lifecycle.

**Functionality:**
- Display workspace identifier (read-only)
- Edit workspace name
- Edit workspace description
- Save changes functionality
- Delete workspace functionality

**User Interaction:**
1. User views current workspace details
2. User modifies name or description
3. User clicks "Save Changes" to persist changes
4. User can click "Delete Workspace" to remove the workspace

---

### API Keys

**Purpose:** Placeholder for workspace-scoped API credentials.

**Functionality:**
- Feature page indicating planned functionality
- Shows: Status (Not wired), Scope (Workspace), Next step (Backend)

**User Interaction:**
1. User views the API keys placeholder page
2. Functionality not yet implemented

---

### Billing

**Purpose:** Indicates workspace ownership model.

**Functionality:**
- Feature page showing workspace billing information
- Displays: Boundary (Local), Isolation (Scoped), Billing (Inherited)

**User Interaction:**
1. User views billing information
2. Workspaces run inside deployment boundary with inherited billing

---

### Members

**Purpose:** Workspace-level membership management.

**Functionality:**
- Lists workspace members with roles
- Shows: email, display name, role, MFA status

**User Interaction:**
1. User views workspace members list
2. Current implementation uses placeholder data

---

### Playground

**Purpose:** Redirects to Chat page.

**Functionality:**
- Automatic redirect to the Chat interface
- Placeholder for future experimentation features

**User Interaction:**
1. User navigates to Playground
2. User is automatically redirected to Chat

---

## Key System Features

### Message Traces (Agent Reasoning Steps)

The Chat interface displays pipeline traces - step-by-step reasoning information showing how the AI processed the query:

- **Trace Display:** Each trace step appears as a numbered item
- **Information Shown:**
  - Query transformation steps
  - Retrieval operations
  - Processing stages
- **Storage:** Trace information is stored in message metadata
- **Availability:** Not all responses have traces - the History page indicates which sessions contain trace steps

### Citations/Sources

Assistant responses include source cards showing which documents were used to generate the response:

- **Source Cards:** Displayed below AI responses
- **Information Shown:**
  - Document title
  - Clickable to view details
- **Visual Style:** Rendered as visual badges/bordered cards
- **Storage:** Sources stored in message metadata under `metadata.sources`

### Thread History

- **Sessions:** Each conversation is stored as a session with a unique ID
- **Titles:** Sessions have titles (auto-generated from first message or user-provided)
- **Persistence:** Chat persists across page refreshes
- **Switching:** Users can switch between sessions via session selector
- **Metadata:** History page shows message counts and trace availability per session

---

## Data Flow Summary

1. **Document Ingestion:** Documents uploaded at project level → processed and indexed → can be attached to workspaces
2. **Chat Interaction:** User sends message → RAG pipeline executes → response generated with sources and traces → stored in session
3. **Session Management:** Sessions persist in database → can be retrieved and viewed in History page
4. **Model Detection:** Runtime models auto-detected from backend configuration → displayed in Runtime Models page
