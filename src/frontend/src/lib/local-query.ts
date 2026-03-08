"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  readProjectCollection,
  readProjectRecord,
  readWorkspaceCollection,
  readWorkspaceRecord,
  writeProjectCollection,
  writeProjectRecord,
  writeWorkspaceCollection,
  writeWorkspaceRecord
} from "@/lib/local-store";

export function useWorkspaceCollection<T>(workspaceId: string | undefined, namespace: string) {
  return useQuery({
    queryKey: ["workspace-local", namespace, workspaceId],
    queryFn: () => Promise.resolve(readWorkspaceCollection<T>(workspaceId, namespace)),
    enabled: typeof window !== "undefined"
  });
}

export function useUpsertWorkspaceCollection<T extends { id: string }>(
  workspaceId: string | undefined,
  namespace: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: T) => {
      const current = readWorkspaceCollection<T>(workspaceId, namespace);
      const next = current.some((entry) => entry.id === item.id)
        ? current.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...current];
      writeWorkspaceCollection(workspaceId, namespace, next);
      return item;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["workspace-local", namespace, workspaceId]
      });
    }
  });
}

export function useRemoveWorkspaceCollectionItem<T extends { id: string }>(
  workspaceId: string | undefined,
  namespace: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const current = readWorkspaceCollection<T>(workspaceId, namespace);
      writeWorkspaceCollection(
        workspaceId,
        namespace,
        current.filter((entry) => entry.id !== itemId)
      );
      return itemId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["workspace-local", namespace, workspaceId]
      });
    }
  });
}

export function useWorkspaceRecord<T extends object>(
  workspaceId: string | undefined,
  namespace: string,
  fallback: T
) {
  return useQuery({
    queryKey: ["workspace-local-record", namespace, workspaceId],
    queryFn: () => Promise.resolve(readWorkspaceRecord<T>(workspaceId, namespace, fallback)),
    enabled: typeof window !== "undefined"
  });
}

export function useSaveWorkspaceRecord<T extends object>(
  workspaceId: string | undefined,
  namespace: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: T) => {
      writeWorkspaceRecord(workspaceId, namespace, value);
      return value;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["workspace-local-record", namespace, workspaceId]
      });
    }
  });
}

export function useProjectCollection<T>(projectId: string | undefined, namespace: string) {
  return useQuery({
    queryKey: ["project-local", namespace, projectId],
    queryFn: () => Promise.resolve(readProjectCollection<T>(projectId, namespace)),
    enabled: typeof window !== "undefined"
  });
}

export function useUpsertProjectCollection<T extends { id: string }>(
  projectId: string | undefined,
  namespace: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: T) => {
      const current = readProjectCollection<T>(projectId, namespace);
      const next = current.some((entry) => entry.id === item.id)
        ? current.map((entry) => (entry.id === item.id ? item : entry))
        : [item, ...current];
      writeProjectCollection(projectId, namespace, next);
      return item;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["project-local", namespace, projectId]
      });
    }
  });
}

export function useRemoveProjectCollectionItem<T extends { id: string }>(
  projectId: string | undefined,
  namespace: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const current = readProjectCollection<T>(projectId, namespace);
      writeProjectCollection(
        projectId,
        namespace,
        current.filter((entry) => entry.id !== itemId)
      );
      return itemId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["project-local", namespace, projectId]
      });
    }
  });
}

export function useProjectRecord<T extends object>(
  projectId: string | undefined,
  namespace: string,
  fallback: T
) {
  return useQuery({
    queryKey: ["project-local-record", namespace, projectId],
    queryFn: () => Promise.resolve(readProjectRecord<T>(projectId, namespace, fallback)),
    enabled: typeof window !== "undefined"
  });
}

export function useSaveProjectRecord<T extends object>(
  projectId: string | undefined,
  namespace: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: T) => {
      writeProjectRecord(projectId, namespace, value);
      return value;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["project-local-record", namespace, projectId]
      });
    }
  });
}
