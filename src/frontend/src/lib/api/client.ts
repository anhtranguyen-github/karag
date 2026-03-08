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

    try {
      detail = await response.json();
      if (detail && typeof detail === "object" && "detail" in detail) {
        const payload = detail as { detail?: unknown };
        message =
          typeof payload.detail === "string" ? payload.detail : JSON.stringify(payload.detail);
      }
    } catch {
      detail = await response.text();
      if (typeof detail === "string" && detail) {
        message = detail;
      }
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
