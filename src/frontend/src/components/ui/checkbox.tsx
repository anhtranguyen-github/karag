import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> { }

export function Checkbox({ className, ...props }: CheckboxProps) {
    return (
        <input
            type="checkbox"
            className={cn(
                "h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        />
    );
}
