import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-10 text-center">
      <div className="mx-auto max-w-md space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        {actionLabel && onAction ? (
          <Button className="mt-2" onClick={onAction} type="button" variant="outline">
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
