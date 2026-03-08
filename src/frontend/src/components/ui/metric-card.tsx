import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  hint,
  badge
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  badge?: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </CardTitle>
          {badge ? <Badge variant="muted">{badge}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold text-slate-950">{value}</div>
        {hint ? <span className="hidden">{hint}</span> : null}
      </CardContent>
    </Card>
  );
}
