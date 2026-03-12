import * as React from "react";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="surface-elevated shadow-2xl p-8 min-w-[380px] w-full max-w-md relative animate-fade-in">
        <button
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
        >
          <span className="text-xl">×</span>
        </button>
        {children}
      </div>
    </div>
  );
}
