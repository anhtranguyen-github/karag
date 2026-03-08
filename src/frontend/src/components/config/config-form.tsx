"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, type DefaultValues } from "react-hook-form";
import type { z } from "zod";

import { SchemaRenderer } from "@/components/config/schema-renderer";
import type { ConfigFormDefinition } from "@/components/config/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfigFormProps<TSchema extends z.AnyZodObject> = {
  definition: ConfigFormDefinition<TSchema>;
  onSubmit: (values: z.infer<TSchema>) => Promise<void> | void;
  submitLabel?: string;
  loading?: boolean;
  className?: string;
  resetOnSubmit?: boolean;
  initialValues?: Partial<z.input<TSchema>>;
};

export function ConfigForm<TSchema extends z.AnyZodObject>({
  definition,
  onSubmit,
  submitLabel,
  loading,
  className,
  resetOnSubmit = false,
  initialValues
}: ConfigFormProps<TSchema>) {
  const mergedDefaults = useMemo(
    () =>
      ({
        ...(definition.defaultValues as Record<string, unknown>),
        ...(initialValues as Record<string, unknown>)
      }) as DefaultValues<z.infer<TSchema>>,
    [definition.defaultValues, initialValues]
  );

  const form = useForm<z.infer<TSchema>>({
    resolver: zodResolver(definition.schema),
    defaultValues: mergedDefaults
  });

  useEffect(() => {
    form.reset(mergedDefaults);
  }, [form, mergedDefaults]);

  return (
    <form
      className={cn("grid gap-5", className)}
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
        if (resetOnSubmit) {
          form.reset(definition.defaultValues as DefaultValues<z.infer<TSchema>>);
        }
      })}
    >
      <SchemaRenderer definition={definition} form={form} />
      <div className="flex justify-end">
        <Button disabled={loading || form.formState.isSubmitting} type="submit">
          {loading || form.formState.isSubmitting
            ? "Saving..."
            : submitLabel ?? definition.submitLabel ?? "Save configuration"}
        </Button>
      </div>
    </form>
  );
}
