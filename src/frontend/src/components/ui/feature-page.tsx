"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageShell from "@/components/ui/page-shell";

type FeaturePageProps = {
  scopeLabel: string;
  title: string;
  subtitle: string;
  highlights: Array<{ label: string; value: string; description?: string }>;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  children?: ReactNode;
};

export function FeaturePage({
  scopeLabel,
  title,
  subtitle,
  highlights,
  primaryAction,
  secondaryAction,
  children,
}: FeaturePageProps) {
  return (
    <PageShell scopeLabel={scopeLabel} title={title} subtitle={subtitle}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <p className="section-label">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-foreground">{item.value}</p>
              {item.description ? <p className="mt-2 text-sm text-muted-foreground">{item.description}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {primaryAction ? (
            <Link href={primaryAction.href}>
              <Button>{primaryAction.label}</Button>
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link href={secondaryAction.href}>
              <Button variant="secondary">{secondaryAction.label}</Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>

      {children ? <div className="mt-6">{children}</div> : null}
    </PageShell>
  );
}
