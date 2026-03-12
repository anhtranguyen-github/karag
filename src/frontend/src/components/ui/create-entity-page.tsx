"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateEntityPageProps = {
  title: string;
  description: string;
  label: string;
  placeholder: string;
  value: string;
  loading: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  submitLabel: string;
  footer?: ReactNode;
};

export function CreateEntityPage({
  title,
  description,
  label,
  placeholder,
  value,
  loading,
  disabled,
  onChange,
  onSubmit,
  submitLabel,
  footer,
}: CreateEntityPageProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-2xl items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{label}</Label>
              <Input
                disabled={disabled}
                id="name"
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                required
                value={value}
              />
            </div>
            {footer}
          </CardContent>
          <CardFooter>
            <Button className="w-full" disabled={loading || disabled || !value.trim()} type="submit">
              {loading ? "Saving..." : submitLabel}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
