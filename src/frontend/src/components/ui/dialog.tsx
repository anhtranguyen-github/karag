import * as React from "react";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#181818] rounded-xl shadow-xl p-6 min-w-[340px] max-w-full w-full max-w-md relative">
        <button
          className="absolute top-3 right-3 text-[#6b7280] hover:text-[#e5e5e5]"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
