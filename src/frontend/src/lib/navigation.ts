import type { LucideIcon } from "lucide-react";
import {
  Blocks,
  Files,
  LayoutDashboard,
  MessageSquareText,
  Settings2,
  SlidersHorizontal
} from "lucide-react";

export type ProjectSection =
  | "overview"
  | "documents"
  | "workspaces"
  | "observability"
  | "logs"
  | "integrations"
  | "settings";

export type WorkspaceSection =
  | "overview"
  | "chat"
  | "context-docs"
  | "rag"
  | "settings"
  | "models"
  | "providers"
  | "configs"
  | "api-keys"
  | "observability"
  | "evaluation"
  | "experiments"
  | "playground";

export type RouteMatch =
  | { scope: "dashboard" }
  | { scope: "project"; projectId: string; section: ProjectSection }
  | { scope: "workspace"; workspaceId: string; section: WorkspaceSection }
  | { scope: "unknown" };

export type NavigationItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  activePrefixes?: string[];
};

export type NavigationSection = {
  id: string;
  title: string;
  items: NavigationItem[];
};

type NamedEntity = {
  id: string;
  name: string;
};

const projectSections: Record<ProjectSection, { label: string; description: string; icon: LucideIcon }> = {
  overview: {
    label: "Project",
    description: "Project overview",
    icon: LayoutDashboard
  },
  documents: {
    label: "Documents",
    description: "Project documents",
    icon: Files
  },
  workspaces: {
    label: "Workspaces",
    description: "Project workspaces",
    icon: Blocks
  },
  observability: {
    label: "Observability",
    description: "Project observability",
    icon: LayoutDashboard
  },
  logs: {
    label: "Logs",
    description: "Project logs",
    icon: LayoutDashboard
  },
  integrations: {
    label: "Integrations",
    description: "Project integrations",
    icon: Blocks
  },
  settings: {
    label: "Settings",
    description: "Project settings",
    icon: Settings2
  }
};

const workspaceSections: Record<WorkspaceSection, { label: string; description: string; icon: LucideIcon }> = {
  overview: {
    label: "Overview",
    description: "Workspace overview",
    icon: LayoutDashboard
  },
  chat: {
    label: "Chat",
    description: "Workspace chat",
    icon: MessageSquareText
  },
  "context-docs": {
    label: "Context docs",
    description: "Selected docs",
    icon: Files
  },
  rag: {
    label: "RAG Settings",
    description: "RAG runtime settings",
    icon: SlidersHorizontal
  },
  settings: {
    label: "Settings",
    description: "Workspace settings",
    icon: Settings2
  },
  models: {
    label: "Models",
    description: "Workspace models",
    icon: Blocks
  },
  providers: {
    label: "Providers",
    description: "Workspace providers",
    icon: Blocks
  },
  configs: {
    label: "Configs",
    description: "Workspace configs",
    icon: Settings2
  },
  "api-keys": {
    label: "API Keys",
    description: "Workspace API keys",
    icon: Settings2
  },
  observability: {
    label: "Observability",
    description: "Workspace observability",
    icon: LayoutDashboard
  },
  evaluation: {
    label: "Evaluation",
    description: "Workspace evaluation",
    icon: Blocks
  },
  experiments: {
    label: "Experiments",
    description: "Workspace experiments",
    icon: Blocks
  },
  playground: {
    label: "Playground",
    description: "Workspace playground",
    icon: MessageSquareText
  }
};

const projectSectionKeys = new Set(Object.keys(projectSections));
const workspaceSectionKeys = new Set(Object.keys(workspaceSections));

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function decodePathSegment(value: string | undefined) {
  return value ? decodeURIComponent(value) : "";
}

function isProjectSection(value: string | undefined): value is ProjectSection {
  return Boolean(value && projectSectionKeys.has(value));
}

function isWorkspaceSection(value: string | undefined): value is WorkspaceSection {
  return Boolean(value && workspaceSectionKeys.has(value));
}

export function buildOrgPath(_orgId?: string) {
  return "/dashboard";
}

export function generateProjectUrl(projectId: string, section: ProjectSection = "overview") {
  const base = `/dashboard/project/${encodePathSegment(projectId)}`;
  return section === "overview" ? base : `${base}/${section}`;
}

export function generateWorkspaceUrl(
  workspaceId: string,
  section: WorkspaceSection = "overview"
) {
  const base = `/dashboard/workspace/${encodePathSegment(workspaceId)}`;
  return section === "overview" ? base : `${base}/${section}`;
}

export function buildProjectPath(projectId: string, section?: ProjectSection): string;
export function buildProjectPath(
  _orgId: string,
  projectId: string,
  section?: ProjectSection
): string;
export function buildProjectPath(
  arg1: string,
  arg2?: string | ProjectSection,
  arg3?: ProjectSection
) {
  if (arg3 !== undefined) {
    return generateProjectUrl(arg2 as string, arg3);
  }

  if (typeof arg2 === "string" && isProjectSection(arg2)) {
    return generateProjectUrl(arg1, arg2);
  }

  if (typeof arg2 === "string") {
    return generateProjectUrl(arg2);
  }

  return generateProjectUrl(arg1);
}

export function buildWorkspacePath(workspaceId: string, section?: WorkspaceSection): string;
export function buildWorkspacePath(
  _orgId: string,
  _projectId: string,
  workspaceId: string,
  section?: WorkspaceSection
): string;
export function buildWorkspacePath(
  arg1: string,
  arg2?: string | WorkspaceSection,
  arg3?: string,
  arg4?: WorkspaceSection
) {
  if (arg3 !== undefined) {
    return generateWorkspaceUrl(arg3, arg4);
  }

  if (typeof arg2 === "string" && isWorkspaceSection(arg2)) {
    return generateWorkspaceUrl(arg1, arg2);
  }

  return generateWorkspaceUrl(arg1);
}

export function matchRoute(pathname: string): RouteMatch {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "dashboard") {
    return { scope: "unknown" };
  }

  if (segments.length === 1) {
    return { scope: "dashboard" };
  }

  if (segments[1] === "project" && segments[2]) {
    const projectId = decodePathSegment(segments[2]);
    const section = isProjectSection(segments[3]) ? segments[3] : "overview";
    return { scope: "project", projectId, section };
  }

  if (segments[1] === "workspace" && segments[2]) {
    const workspaceId = decodePathSegment(segments[2]);
    const legacyWorkspaceSectionMap: Record<string, WorkspaceSection> = {
      query: "chat",
      pipelines: "rag",
      "context-documents": "context-docs",
      dashboard: "overview"
    };
    const sectionCandidate = decodePathSegment(segments[3]);
    const section = isWorkspaceSection(sectionCandidate)
      ? sectionCandidate
      : legacyWorkspaceSectionMap[sectionCandidate] ?? "overview";
    return { scope: "workspace", workspaceId, section };
  }

  if (segments[1] === "org" && segments[2]) {
    if (segments[3] === "project" && segments[4]) {
      const projectId = decodePathSegment(segments[4]);

      if (segments[5] === "workspace" && segments[6]) {
        const workspaceId = decodePathSegment(segments[6]);
        const legacyWorkspaceSectionMap: Record<string, WorkspaceSection> = {
          query: "chat",
          pipelines: "rag",
          "context-documents": "context-docs",
          dashboard: "overview"
        };
        const sectionCandidate = decodePathSegment(segments[7]);
        const section = isWorkspaceSection(sectionCandidate)
          ? sectionCandidate
          : legacyWorkspaceSectionMap[sectionCandidate] ?? "overview";
        return { scope: "workspace", workspaceId, section };
      }

      const section = isProjectSection(segments[5]) ? segments[5] : "overview";
      return { scope: "project", projectId, section };
    }

    return { scope: "dashboard" };
  }

  return { scope: "unknown" };
}

export function getLegacyWorkspaceSection(pathname: string): WorkspaceSection | null {
  const mapping: Record<string, WorkspaceSection> = {
    "/query": "chat",
    "/pipelines": "rag",
    "/models": "models",
    "/providers": "providers",
    "/configs": "configs",
    "/api-keys": "api-keys",
    "/observability": "observability",
    "/evaluation": "evaluation"
  };

  return mapping[pathname] ?? null;
}

export function getLegacyProjectSection(pathname: string): ProjectSection | null {
  const mapping: Record<string, ProjectSection> = {
    "/documents": "documents",
    "/knowledge-base": "documents",
    "/model-registry": "integrations",
    "/settings": "settings"
  };

  return mapping[pathname] ?? null;
}

export function buildSidebarSections(args: {
  route: RouteMatch;
  projects?: NamedEntity[];
  workspaces?: NamedEntity[];
}): NavigationSection[] {
  if (args.route.scope === "project") {
    const { projectId } = args.route;
    return [
      {
        id: "project",
        title: "Project",
        items: (["overview", "documents", "workspaces"] as ProjectSection[]).map((section) => ({
          href: generateProjectUrl(projectId, section),
          label: projectSections[section].label,
          description: projectSections[section].description,
          icon: projectSections[section].icon
        }))
      }
    ];
  }

  if (args.route.scope === "workspace") {
    const { workspaceId } = args.route;
    return [
      {
        id: "workspace",
        title: "Workspace",
        items: (["overview", "chat", "context-docs", "rag", "settings"] as WorkspaceSection[]).map(
          (section) => ({
            href: generateWorkspaceUrl(workspaceId, section),
            label: workspaceSections[section].label,
            description: workspaceSections[section].description,
            icon: workspaceSections[section].icon
          })
        )
      }
    ];
  }

  return [];
}

export function getProjectSectionLabel(section: ProjectSection) {
  return projectSections[section]?.label ?? "Project";
}

export function getWorkspaceSectionLabel(section: WorkspaceSection) {
  return workspaceSections[section]?.label ?? "Workspace";
}
