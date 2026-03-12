"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import { generateProjectUrl } from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function OrganizationProjectsPageView() {
  const router = useRouter();
  const { projects } = useTenant();
  const [search, setSearch] = useState("");

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) =>
        [project.name, project.id, project.description ?? ""].join(" ").toLowerCase().includes(search.toLowerCase())
      ),
    [projects, search]
  );

  return (
    <OrganizationGuard>
      <section className="p-8 md:p-12 w-full mx-auto space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-foreground">Organization Projects</h2>
            <p className="text-muted-foreground max-w-xl text-lg">Manage and monitor high-density intelligence workflows across your enterprise infrastructure.</p>
          </div>
          <button 
            onClick={() => router.push("/dashboard/new/project")}
            className="primary-gradient text-primary-foreground px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined" data-icon="add">add</span>
            <span>New Project</span>
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground">
            <span className="material-symbols-outlined" data-icon="search">search</span>
          </div>
          <input 
            className="w-full bg-muted border-none rounded-2xl py-4 md:py-5 pl-12 pr-6 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 transition-all text-sm font-medium shadow-inner outline-none" 
            placeholder="Filter projects by name, ID, or deployment status..." 
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="absolute inset-y-0 right-4 flex items-center gap-2">
            <kbd className="hidden md:inline-flex items-center px-2 py-1 text-xs font-semibold text-muted-foreground bg-popover rounded-md">⌘ K</kbd>
          </div>
        </div>

        {/* Projects Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
             <div 
               key={project.id}
               onClick={() => router.push(generateProjectUrl(project.id))}
               className="cursor-pointer group relative overflow-hidden bg-card rounded-2xl p-6 border border-transparent hover:border-primary/20 transition-all duration-300"
             >
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl" data-icon="database">database</span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    {project.status || "Production"}
                  </span>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-foreground font-display">{project.name}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">{project.description || "Enterprise-grade RAG pipeline optimizing distributed document retrieval."}</p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">ID: {project.id.toUpperCase().slice(0, 12)}</span>
                  <div className="flex -space-x-2">
                     <div className="h-6 w-6 rounded-full bg-popover border-2 border-background flex items-center justify-center text-[8px] font-bold">+4</div>
                  </div>
                </div>
             </div>
          ))}
          {filteredProjects.length === 0 && (
             <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 text-muted-foreground">
               No projects found matching your search.
             </div>
          )}
        </div>

        {/* Contextual Stats Bar (Bento style) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-muted rounded-xl p-4 flex flex-col gap-1">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Active Projects</span>
            <span className="text-2xl font-black text-foreground font-display">{projects.length}</span>
          </div>
          <div className="bg-muted rounded-xl p-4 flex flex-col gap-1">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">In Production</span>
            <span className="text-2xl font-black text-primary font-display">{projects.filter(p => p.status !== "ARCHIVED").length}</span>
          </div>
          <div className="bg-muted rounded-xl p-4 flex flex-col gap-1">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Compute Usage</span>
            <span className="text-2xl font-black text-foreground font-display">72%</span>
          </div>
          <div className="bg-muted rounded-xl p-4 flex flex-col gap-1">
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Uptime Avg</span>
            <span className="text-2xl font-black text-foreground font-display">99.98%</span>
          </div>
        </div>
      </section>

      {/* FAB for New Project (Contextual) */}
      <button 
        onClick={() => router.push("/dashboard/new/project")}
        className="md:hidden fixed bottom-6 right-6 primary-gradient h-14 w-14 rounded-full flex items-center justify-center text-primary-foreground shadow-2xl z-50"
      >
        <span className="material-symbols-outlined" data-icon="add">add</span>
      </button>
    </OrganizationGuard>
  );
}
