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
  | "members"
  | "billing"
  | "logs"
  | "integrations"
  | "settings";

export type WorkspaceSection =
  | "overview"
  | "chat"
  | "context-docs"
  | "history"
  | "members"
  | "billing"
  | "rag"
  | "rag-retrieval"
  | "rag-embedding"
  | "rag-vector-store"
  | "rag-llm"
  | "rag-strategy"
  | "settings"
  | "api-keys";

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
  members: {
    label: "Members",
    description: "Project members",
    icon: Blocks
  },
  billing: {
    label: "Billing",
    description: "Project billing",
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
  history: {
    label: "History",
    description: "Chat history",
    icon: MessageSquareText
  },
  members: {
    label: "Members",
    description: "Workspace members",
    icon: Blocks
  },
  billing: {
    label: "Billing",
    description: "Workspace billing",
    icon: Blocks
  },
  rag: {
    label: "RAG Overview",
    description: "RAG summary",
    icon: SlidersHorizontal
  },
  "rag-retrieval": {
    label: "Retrieval",
    description: "Search settings",
    icon: SlidersHorizontal
  },
  "rag-embedding": {
    label: "Embedding",
    description: "Model settings",
    icon: SlidersHorizontal
  },
  "rag-vector-store": {
    label: "Vector Store",
    description: "Database settings",
    icon: SlidersHorizontal
  },
  "rag-llm": {
    label: "Generation",
    description: "LLM settings",
    icon: SlidersHorizontal
  },
  "rag-strategy": {
    label: "Strategy",
    description: "Prompts & context",
    icon: SlidersHorizontal
  },
  settings: {
    label: "Settings",
    description: "Workspace settings",
    icon: Settings2
  },
  "api-keys": {
    label: "API Keys",
    description: "Workspace API keys",
    icon: Settings2
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

export function buildOrgPath(orgId?: string) {
  return orgId ? `/dashboard/org/${encodePathSegment(orgId)}` : "/dashboard/org";
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

export function matchRoute(pathname: string): RouteMatch {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "dashboard") {
    return { scope: "unknown" };
  }

  if (segments.length === 1) {
    return { scope: "dashboard" };
  }

  if (segments[1] === "project") {
    if (segments[2]) {
      const projectId = decodePathSegment(segments[2]);
      const section = isProjectSection(segments[3]) ? segments[3] : "overview";
      return { scope: "project", projectId, section };
    }
    return { scope: "dashboard" };
  }

  if (segments[1] === "workspace") {
    if (segments[2]) {
      const workspaceId = decodePathSegment(segments[2]);
      const sectionCandidate = decodePathSegment(segments[3]);
      const section = isWorkspaceSection(sectionCandidate) ? sectionCandidate : "overview";
      return { scope: "workspace", workspaceId, section };
    }
    return { scope: "dashboard" };
  }

  if (segments[1] === "org") {
    return { scope: "dashboard" };
  }

  if (segments[1] === "new") {
    return { scope: "dashboard" };
  }

  return { scope: "unknown" };
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
        items: (["overview", "chat", "context-docs"] as WorkspaceSection[]).map(
          (section) => ({
            href: generateWorkspaceUrl(workspaceId, section),
            label: workspaceSections[section].label,
            description: workspaceSections[section].description,
            icon: workspaceSections[section].icon
          })
        )
      },
      {
        id: "workspace-system",
        title: "System",
        items: (["settings"] as WorkspaceSection[]).map(
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
