const STORAGE_PREFIX = "karag.dashboard";

type Scope = "workspace" | "project" | "organization";

function keyFor(scope: Scope, scopeId: string, namespace: string) {
  return `${STORAGE_PREFIX}.${scope}.${scopeId}.${namespace}`;
}

function readValue<T>(scope: Scope, scopeId: string | undefined, namespace: string, fallback: T) {
  if (!scopeId || typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(keyFor(scope, scopeId, namespace));
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeValue<T>(scope: Scope, scopeId: string | undefined, namespace: string, value: T) {
  if (!scopeId || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(keyFor(scope, scopeId, namespace), JSON.stringify(value));
}

export function readWorkspaceCollection<T>(workspaceId: string | undefined, namespace: string): T[] {
  return readValue<T[]>("workspace", workspaceId, namespace, []);
}

export function writeWorkspaceCollection<T>(
  workspaceId: string | undefined,
  namespace: string,
  items: T[]
) {
  writeValue("workspace", workspaceId, namespace, items);
}

export function readWorkspaceRecord<T extends object>(
  workspaceId: string | undefined,
  namespace: string,
  fallback: T
) {
  if (!workspaceId || typeof window === "undefined") {
    return fallback;
  }

  const value = readValue<Record<string, unknown>>("workspace", workspaceId, namespace, {});
  return { ...fallback, ...value } as T;
}

export function writeWorkspaceRecord<T extends object>(
  workspaceId: string | undefined,
  namespace: string,
  value: T
) {
  writeValue("workspace", workspaceId, namespace, value);
}

export function readProjectCollection<T>(projectId: string | undefined, namespace: string): T[] {
  return readValue<T[]>("project", projectId, namespace, []);
}

export function writeProjectCollection<T>(
  projectId: string | undefined,
  namespace: string,
  items: T[]
) {
  writeValue("project", projectId, namespace, items);
}

export function readProjectRecord<T extends object>(
  projectId: string | undefined,
  namespace: string,
  fallback: T
) {
  if (!projectId || typeof window === "undefined") {
    return fallback;
  }

  const value = readValue<Record<string, unknown>>("project", projectId, namespace, {});
  return { ...fallback, ...value } as T;
}

export function writeProjectRecord<T extends object>(
  projectId: string | undefined,
  namespace: string,
  value: T
) {
  writeValue("project", projectId, namespace, value);
}
