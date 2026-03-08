"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, Blocks, Database, MessageSquare, Search, Sliders } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { generateWorkspaceUrl } from "@/lib/navigation";
import { useTenant } from "@/providers/tenant-provider";

export default function WorkspaceRagSettingsPage() {
  const { tenant } = useTenant();

  const configQuery = useQuery({
    queryKey: ["workspace-rag-config", tenant.workspaceId],
    queryFn: () => platformApi.getWorkspaceRagConfig(tenant, tenant.workspaceId!),
    enabled: Boolean(tenant.workspaceId)
  });

  const config = configQuery.data;

  const sections = [
    {
      id: "rag-retrieval",
      title: "Retrieval",
      description: "Search algorithms, top-k, and hybrid search ranking.",
      icon: Search,
      status: config?.retrieval_config.hybrid_search ? "Hybrid ON" : "Keyword",
      summary: `Top K: ${config?.retrieval_config.top_k}`
    },
    {
      id: "rag-embedding",
      title: "Embedding",
      description: "Model selection and vector dimension configuration.",
      icon: Sliders,
      status: config?.embedding_provider,
      summary: config?.embedding_model
    },
    {
      id: "rag-vector-store",
      title: "Vector Store",
      description: "Database backend, collection names, and indexing.",
      icon: Database,
      status: config?.vector_store_type,
      summary: config?.vector_store_config.distance_metric
    },
    {
      id: "rag-llm",
      title: "Generation",
      description: "LLM model for inference, temperature, and tokens.",
      icon: MessageSquare,
      status: config?.llm_config.model,
      summary: `Temp: ${config?.llm_config.temperature}`
    },
    {
      id: "rag-strategy",
      title: "Strategy",
      description: "Prompt templates and reading comprehension strategy.",
      icon: Blocks,
      status: "Configured",
      summary: config?.reading_config.citation_mode
    }
  ];

  return (
    <WorkspaceGuard>
      <div className="grid gap-6">
        <PageHeader eyebrow="Configuration" title="RAG Architecture" />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Card className="flex flex-col" key={section.id}>
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <section.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription className="line-clamp-1">{section.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between pt-0">
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="muted">{section.status || "Not set"}</Badge>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                    {section.summary || "Default"}
                  </span>
                </div>
                <Link href={generateWorkspaceUrl(tenant.workspaceId!, section.id as any)}>
                  <Button className="mt-6 w-full" variant="secondary" type="button">
                    Configure
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </WorkspaceGuard>
  );
}
