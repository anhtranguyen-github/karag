import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-[110px] w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm text-foreground shadow-sm transition-all placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));

Textarea.displayName = "Textarea";
