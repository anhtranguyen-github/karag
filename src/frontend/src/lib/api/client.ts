import type { TenantSelection } from "@/lib/types/platform";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | object;
  tenant?: TenantSelection;
};

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

function buildHeaders(options: RequestOptions) {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.tenant?.organizationId) {
    headers.set("X-Organization-Id", options.tenant.organizationId);
  }
  if (options.tenant?.projectId) {
    headers.set("X-Project-Id", options.tenant.projectId);
  }
  if (options.tenant?.workspaceId) {
    headers.set("X-Workspace-Id", options.tenant.workspaceId);
  }
  if (options.tenant?.actorId) {
    headers.set("X-Actor-Id", options.tenant.actorId);
  }

  return headers;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = buildHeaders(options);
  const response = await fetch(`/proxy${path}`, {
    ...options,
    headers,
    body:
      options.body && !(typeof FormData !== "undefined" && options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body
  });

  if (!response.ok) {
    let detail: unknown = null;
    let message = response.statusText;

    // Read the body as text once (avoid double-reading the stream), then try to parse JSON.
    try {
      const text = await response.text();
      if (text) {
        try {
          detail = JSON.parse(text);
        } catch {
          detail = text;
        }

        if (detail && typeof detail === "object" && "detail" in detail) {
          const payload = detail as { detail?: unknown };
          message = typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
        } else if (typeof detail === "string" && detail) {
          message = detail;
        }
      }
    } catch (err) {
      // If even reading text fails, fall back to statusText and null detail.
      detail = null;
    }

    throw new ApiError(message, response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function uploadWithProgress<T>(
  path: string,
  file: File,
  fieldName: string,
  tenant?: TenantSelection,
  onProgress?: (value: number) => void
) {
  return new Promise<T>((resolve, reject) => {
    const requestClient = new XMLHttpRequest();
    // Generate an upload id for server-side progress notifications
    const uploadId = (typeof crypto !== "undefined" && (crypto as any).randomUUID)
      ? (crypto as any).randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    requestClient.open("POST", `/proxy${path}`);

    if (tenant?.organizationId) {
      requestClient.setRequestHeader("X-Organization-Id", tenant.organizationId);
    }
    if (tenant?.projectId) {
      requestClient.setRequestHeader("X-Project-Id", tenant.projectId);
    }
    if (tenant?.workspaceId) {
      requestClient.setRequestHeader("X-Workspace-Id", tenant.workspaceId);
    }
    if (tenant?.actorId) {
      requestClient.setRequestHeader("X-Actor-Id", tenant.actorId);
    }

    // Let the server correlate processing progress messages
    requestClient.setRequestHeader("X-Upload-Id", uploadId);

    // Open a websocket to receive server-side processing updates (best-effort)
    try {
      const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsHost = window.location.hostname;
      const wsPort = 8000; // backend http/ws port in dev
      const wsUrl = `${wsProto}//${wsHost}:${wsPort}/ws/uploads/${uploadId}`;
      const ws = new WebSocket(wsUrl);
      ws.addEventListener("message", (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (typeof data.progress === "number") {
            onProgress?.(data.progress);
          }
        } catch (e) {
          // ignore parse errors
        }
      });
      // close websocket when upload completes/errs
      const cleanupWs = () => {
        try {
          ws.close();
        } catch (e) {}
      };
      requestClient.addEventListener("loadend", cleanupWs);
      requestClient.addEventListener("error", cleanupWs);
    } catch (e) {
      // websocket best-effort; ignore failures
    }

    requestClient.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    requestClient.addEventListener("load", () => {
      if (requestClient.status >= 200 && requestClient.status < 300) {
        try {
          resolve(JSON.parse(requestClient.responseText) as T);
        } catch (error) {
          reject(
            new ApiError(
              error instanceof Error ? error.message : "Upload response parsing failed",
              requestClient.status,
              requestClient.responseText
            )
          );
        }
        return;
      }

      reject(
        new ApiError(
          requestClient.responseText || "Upload failed",
          requestClient.status,
          requestClient.responseText
        )
      );
    });

    requestClient.addEventListener("error", () => {
      reject(new ApiError("Upload failed", 500, null));
    });

    const formData = new FormData();
    formData.append(fieldName, file);
    requestClient.send(formData);
  });
}
