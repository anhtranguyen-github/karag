# OpenAI-Compatible API Integration

This document describes the OpenAI-compatible Chat Completions API implementation for Karag, including workspace and document integration.

## Overview

The backend implements a fully OpenAI-compatible Chat Completions API that integrates with the existing Karag workspace and document system. This allows official OpenAI SDKs to work without modification while maintaining proper workspace isolation and document citation support.

## API Endpoints

All OpenAI-compatible endpoints are at `/api/v1/v1/*` to match the OpenAI API specification while being nested under the Karag API v1 namespace.

### POST /api/v1/v1/chat/completions

OpenAI-compatible chat completions endpoint with RAG integration.

**Request Format:**
```json
{
  "model": "karag:workspace_name:mode",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is RAG?"}
  ],
  "temperature": 0.7,
  "max_tokens": 100,
  "stream": false
}
```

**Model Format:**
- `karag:<workspace_name>` - Basic format
- `karag:<workspace_name>:<mode>` - With mode specification

**Supported Modes:**
- `chat` - General chat (default)
- `qa` - Question & answer mode
- `tutor` - Tutor mode with explanations
- `strict_rag` - Strict RAG - only uses document context

**Response Format:**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "karag:workspace_name",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "RAG (Retrieval-Augmented Generation) is... [[doc:doc_123]]"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### GET /api/v1/v1/models

List available models (workspaces).

**Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "karag:workspace1",
      "object": "model",
      "created": 1234567890,
      "owned_by": "karag"
    }
  ]
}
```

### GET /api/v1/v1/models/{model_id}

Get specific model information.

### GET /api/v1/v1/documents/{document_id}

Retrieve document metadata for citation reverse lookup with optional workspace validation.

**Query Parameters:**
- `workspace_id` (optional) - Validates the document belongs to this workspace

**Response:** [`DocumentCitationResponse`](backend/app/schemas/documents.py)
```json
{
  "id": "doc_abc123",
  "filename": "research_paper.pdf",
  "content_type": "application/pdf",
  "workspace_id": "ws_xyz789",
  "source": "upload",
  "status": "indexed",
  "content_preview": "Abstract: This paper discusses...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

## Document Schema

### DocumentCitationResponse

Used for citation reverse lookup from chat responses.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique document ID (stable, persistent) |
| `filename` | string | Original filename |
| `content_type` | string | MIME type |
| `workspace_id` | string | Owning workspace |
| `source` | string | Source URL or description |
| `status` | string | Processing status (uploaded/indexed/error) |
| `content_preview` | string | First 5000 chars for display |
| `created_at` | string | Creation timestamp |

### DocumentResponse (Workspace API)

Used by workspace-scoped document APIs at `/api/v1/workspaces/{workspace_id}/documents`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique document ID |
| `workspace_id` | string | Workspace this document belongs to |
| `filename` | string | Original filename |
| `content_type` | string | MIME type |
| `source` | string | Source information |
| `status` | string | Processing status |
| `size` | integer | File size in bytes |
| `chunks` | integer | Number of chunks indexed |
| `created_at` | string | Creation timestamp |
| `updated_at` | string | Last update timestamp |
| `content` | string | Full document content (if text) |
| `download_url` | string | Presigned URL for download |

## Citations

Citations are embedded directly in the message content using the format:

```
[[doc:<document_id>]]
```

Example response:
```
According to the documentation, RAG combines retrieval with generation [[doc:doc_abc123]]. 
This approach improves accuracy [[doc:doc_def456]].
```

### Frontend Citation Flow

1. User sends message via chat interface
2. Backend retrieves documents scoped to the workspace
3. LLM generates response with embedded citations `[[doc:<id>]]`
4. Frontend parses response content for citation patterns
5. Frontend calls `GET /api/v1/v1/documents/{doc_id}?workspace_id={ws}`
6. Frontend displays clickable citation that opens document preview

**Note:** The `workspace_id` parameter in the document lookup endpoint provides workspace isolation validation, preventing cross-workspace document access.

## Streaming

Streaming responses use OpenAI-compatible Server-Sent Events (SSE):

```bash
curl -X POST http://localhost:8000/api/v1/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "karag:default",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

Response format:
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"karag:default","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"karag:default","choices":[{"index":0,"delta":{"content":" there"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1234567890,"model":"karag:default","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**Important:** Citation tokens `[[doc:<id>]]` are never split across chunks. The `CitationBuffer` class ensures atomic delivery of citation tokens.

## Mode Handling

Modes can be specified in two ways:

1. **In the model name:**
   ```json
   {"model": "karag:myworkspace:strict_rag"}
   ```

2. **In the system message:**
   ```json
   {"role": "system", "content": "You are helpful. [mode:strict_rag]"}
   ```

Mode precedence: model_name > system_message > default (chat)

### Mode Behaviors

| Mode | Behavior |
|------|----------|
| `chat` | General conversation, can use external knowledge |
| `qa` | Answers based on context, "Not found in the provided documents" if no match |
| `tutor` | Educational explanations with context priority |
| `strict_rag` | ONLY uses provided documents, refuses external knowledge |

## Workspace Isolation

All operations are workspace-scoped:

1. **Chat Completions:** Workspace resolved from model name `karag:<workspace_name>`
2. **Document Retrieval:** Documents filtered by workspace_id
3. **Citation Lookup:** Optional workspace validation via query parameter
4. **RAG Search:** Retrieval scoped to the workspace from the model name

Cross-workspace access is strictly forbidden and will return 404 errors.

## Using OpenAI SDK

### Python

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/api/v1/v1",  # Note: /api/v1/v1 for OpenAI endpoints
    api_key="dummy-key"
)

# Non-streaming
response = client.chat.completions.create(
    model="karag:myworkspace",
    messages=[{"role": "user", "content": "What is RAG?"}]
)
print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model="karag:myworkspace:strict_rag",
    messages=[{"role": "user", "content": "Explain RAG"}],
    stream=True
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### JavaScript/TypeScript

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:8000/api/v1/v1',  // Note: /api/v1/v1 for OpenAI endpoints
  apiKey: 'dummy-key'
});

const response = await openai.chat.completions.create({
  model: 'karag:myworkspace',
  messages: [{ role: 'user', content: 'What is RAG?' }]
});

console.log(response.choices[0].message.content);
```

## Error Handling

Errors follow OpenAI's error format:

```json
{
  "error": {
    "message": "Workspace 'xyz' does not exist.",
    "type": "invalid_request_error",
    "code": null
  }
}
```

Common HTTP status codes:
- `400` - Invalid request (wrong provider, bad parameters)
- `404` - Workspace or document not found
- `429` - Rate limit exceeded
- `500` - Internal server error

## Testing

### Unit Tests

```bash
cd backend
python test_completions_unit.py
```

### Curl Tests

```bash
cd backend
chmod +x test_curl.sh
./test_curl.sh http://localhost:8000
```

### OpenAI SDK Tests

```bash
pip install openai
cd backend
python test_openai_sdk.py
```

## Implementation Details

### Key Files

- [`app/api/v1/completions.py`](app/api/v1/completions.py) - Main endpoint implementation
- [`app/schemas/openai.py`](app/schemas/openai.py) - OpenAI-compatible schemas
- [`app/schemas/documents.py`](app/schemas/documents.py) - Document response schemas
- [`app/services/chat_service.py`](app/services/chat_service.py) - Chat business logic
- [`app/rag/rag_service.py`](app/rag/rag_service.py) - RAG retrieval service

### Data Flow

1. **Request received** with model name `karag:<workspace>:<mode>`
2. **Workspace resolved** from model name (database lookup by workspace name)
3. **RAG retrieval** scoped to the workspace (document search in vector store)
4. **Context built** with embedded `[[doc:<id>]]` citations
5. **LLM prompted** with citation instructions and context
6. **Response generated** with citations in content
7. **Frontend parses** citations and calls document API for click-through

### Citation Buffer

The `CitationBuffer` class ensures that citation tokens `[[doc:<id>]]` are never split across streaming chunks. It buffers content until a complete citation is detected or until it's safe to flush.

### Security Considerations

- Workspace isolation enforced at API level
- Document lookup validates workspace ownership
- No cross-workspace data leakage
- Thinking traces never exposed in responses
