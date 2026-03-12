"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectGuard } from "@/components/ui/project-guard";
import { generateWorkspaceUrl } from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function ProjectOverviewPageView() {
  const { workspaces } = useTenant();
  const [search, setSearch] = useState("");

  const filteredWorkspaces = useMemo(
    () =>
      workspaces.filter((workspace) =>
        [workspace.name, workspace.id].join(" ").toLowerCase().includes(search.toLowerCase())
      ),
    [search, workspaces]
  );

  return (
    <ProjectGuard>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <PageHeader
          eyebrow="Project"
          title="Workspaces"
          description="A single list of active workspaces, with less noise and faster navigation."
          actions={
            <Link href="/dashboard/new/workspace">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Workspace
              </Button>
            </Link>
          }
        />

        <div className="app-panel flex flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="section-label">Browse</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {filteredWorkspaces.length} workspace{filteredWorkspaces.length === 1 ? "" : "s"} visible
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by workspace name or id"
              value={search}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredWorkspaces.length === 0 ? (
            <Card className="lg:col-span-2">
              <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                <p className="text-lg font-medium text-foreground">No workspaces found</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Try a different search, or create a fresh workspace for a cleaner project structure.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredWorkspaces.map((workspace) => (
              <Link href={generateWorkspaceUrl(workspace.id)} key={workspace.id}>
                <Card className="h-full transition-transform hover:-translate-y-0.5">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="section-label">Workspace</p>
                        <CardTitle className="mt-2">{workspace.name}</CardTitle>
                      </div>
                      <span className="status-pill status-pill--healthy">Active</span>
                    </div>
                    <CardDescription>{workspace.id}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between pt-2">
                    <p className="text-sm text-muted-foreground">
                      Open documents, chat, and thread history from one workspace home.
                    </p>
                    <span className="text-sm font-medium text-primary">Open</span>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </ProjectGuard>
  );
}
