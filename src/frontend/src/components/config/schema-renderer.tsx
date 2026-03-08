"use client";

import {
  Controller,
  type FieldErrors,
  type Path,
  type UseFormReturn
} from "react-hook-form";
import { z } from "zod";

import { CheckboxInput } from "@/components/inputs/checkbox-input";
import { FileUpload } from "@/components/inputs/file-upload";
import { JSONEditor } from "@/components/inputs/json-editor";
import { MultiSelect } from "@/components/inputs/multi-select";
import { NumberInput } from "@/components/inputs/number-input";
import { SecretInput } from "@/components/inputs/secret-input";
import { SelectDropdown } from "@/components/inputs/select-dropdown";
import { SliderInput } from "@/components/inputs/slider-input";
import { TextInput } from "@/components/inputs/text-input";
import { TextareaInput } from "@/components/inputs/textarea-input";
import { ToggleSwitch } from "@/components/inputs/toggle-switch";
import { KeyValueEditor } from "@/components/inputs/key-value-editor";
import { FieldShell } from "@/components/inputs/field-shell";
import { Button } from "@/components/ui/button";
import type { ConfigFieldConfig, ConfigFieldComponent, ConfigFormDefinition } from "@/components/config/types";

function getError(errors: FieldErrors, path: string) {
  const entry = errors[path];
  return entry && "message" in entry ? String(entry.message) : undefined;
}

function unwrapSchema(fieldSchema: z.ZodTypeAny | undefined): z.ZodTypeAny | undefined {
  if (!fieldSchema) {
    return fieldSchema;
  }

  if (fieldSchema instanceof z.ZodOptional) {
    return unwrapSchema(fieldSchema.unwrap());
  }

  if (fieldSchema instanceof z.ZodDefault) {
    return unwrapSchema(fieldSchema.removeDefault());
  }

  if (fieldSchema instanceof z.ZodNullable) {
    return unwrapSchema(fieldSchema.unwrap());
  }

  if (fieldSchema instanceof z.ZodEffects) {
    return unwrapSchema(fieldSchema.innerType());
  }

  return fieldSchema;
}

function inferComponent(
  fieldName: string,
  fieldSchema: z.ZodTypeAny | undefined,
  explicit?: ConfigFieldComponent
): ConfigFieldComponent {
  if (explicit) {
    return explicit;
  }

  const schema = unwrapSchema(fieldSchema);
  const name = fieldName.toLowerCase();

  if (!schema) {
    return "text";
  }

  // Heuristics based on field name
  if (name.includes("password") || name.includes("secret") || name.includes("api_key") || name.includes("apikey")) {
    return "secret";
  }

  if (name.includes("description") || name.includes("template") || name.includes("prompt") || name.includes("notes")) {
    return "textarea";
  }

  if (name.includes("enabled") || name.includes("active") || name.includes("is_")) {
    if (schema instanceof z.ZodBoolean) return "switch";
  }

  if (schema instanceof z.ZodBoolean) {
    return "switch";
  }

  if (schema instanceof z.ZodNumber) {
    // If it looks like a probability or temperature, default to slider if it's 0-1 or 0-2
    return "number";
  }

  if (schema instanceof z.ZodEnum || schema instanceof z.ZodNativeEnum) {
    return "select";
  }

  if (schema instanceof z.ZodArray) {
    return "multiselect";
  }

  if (schema instanceof z.ZodObject || schema instanceof z.ZodRecord) {
    return "json";
  }

  return "text";
}

type SchemaRendererProps<TSchema extends z.AnyZodObject> = {
  definition: ConfigFormDefinition<TSchema>;
  form: UseFormReturn<z.infer<TSchema>>;
  overrides?: Partial<Record<string, Partial<ConfigFieldConfig<TSchema>>>>;
};

export function SchemaRenderer<TSchema extends z.AnyZodObject>({
  definition,
  form,
  overrides
}: SchemaRendererProps<TSchema>) {
  const shape = definition.schema.shape as Record<string, z.ZodTypeAny>;

  return (
    <>
      {definition.fields.map((field) => {
        const fieldOverride = overrides?.[field.name];
        const mergedField = { ...field, ...fieldOverride };
        const component = inferComponent(mergedField.name, shape[mergedField.name], mergedField.component);
        const error = getError(form.formState.errors, mergedField.name);

        return (
          <Controller
            control={form.control}
            key={mergedField.name}
            name={mergedField.name as Path<z.infer<TSchema>>}
            render={({ field: controlledField }) => {
              const common = {
                label: mergedField.label,
                description: mergedField.description,
                error,
                required: mergedField.required
              };

              switch (component) {
                case "textarea":
                  return (
                    <TextareaInput
                      {...common}
                      onChange={controlledField.onChange}
                      placeholder={mergedField.placeholder}
                      rows={mergedField.rows ?? 4}
                      value={(controlledField.value as string) ?? ""}
                    />
                  );
                case "select":
                  return (
                    <SelectDropdown
                      {...common}
                      onChange={(event) => controlledField.onChange(event.target.value)}
                      options={mergedField.options ?? []}
                      placeholder={mergedField.placeholder}
                      value={(controlledField.value as string) ?? ""}
                    />
                  );
                case "switch":
                case "toggle":
                  return (
                    <ToggleSwitch
                      {...common}
                      checked={Boolean(controlledField.value)}
                      onChange={(event) => controlledField.onChange(event.target.checked)}
                    />
                  );
                case "number":
                  return (
                    <NumberInput
                      {...common}
                      max={mergedField.max}
                      min={mergedField.min}
                      onChange={(event) =>
                        controlledField.onChange(
                          event.target.value === "" ? undefined : Number(event.target.value)
                        )
                      }
                      placeholder={mergedField.placeholder}
                      step={mergedField.step}
                      value={controlledField.value as number | undefined}
                    />
                  );
                case "slider":
                  return (
                    <SliderInput
                      {...common}
                      max={mergedField.max}
                      min={mergedField.min}
                      onChange={(event) => controlledField.onChange(Number(event.target.value))}
                      step={mergedField.step}
                      value={Number(controlledField.value ?? mergedField.min ?? 0)}
                      valueLabel={String(controlledField.value ?? mergedField.min ?? 0)}
                    />
                  );
                case "checkbox":
                  return (
                    <CheckboxInput
                      {...common}
                      checked={Boolean(controlledField.value)}
                      onChange={(event) => controlledField.onChange(event.target.checked)}
                    />
                  );
                case "multiselect":
                  return (
                    <MultiSelect
                      {...common}
                      onChange={controlledField.onChange}
                      options={mergedField.options ?? []}
                      value={(controlledField.value as string[]) ?? []}
                    />
                  );
                case "password":
                case "secret":
                  return (
                    <SecretInput
                      {...common}
                      onChange={controlledField.onChange}
                      placeholder={mergedField.placeholder}
                      value={(controlledField.value as string) ?? ""}
                    />
                  );
                case "file":
                  return (
                    <FileUpload
                      {...common}
                      accept={mergedField.accept}
                      onChange={controlledField.onChange}
                      value={(controlledField.value as File | null) ?? null}
                    />
                  );
                case "json":
                  return (
                    <JSONEditor
                      {...common}
                      onChange={controlledField.onChange}
                      value={(controlledField.value as Record<string, unknown>) ?? {}}
                    />
                  );
                case "keyvalue":
                  return (
                    <KeyValueEditor
                      {...common}
                      onChange={controlledField.onChange}
                      value={(controlledField.value as Record<string, string>) ?? {}}
                    />
                  );
                case "button":
                  return (
                    <FieldShell {...common}>
                      <Button
                        className="w-full"
                        onClick={(e) => {
                          e.preventDefault();
                          mergedField.onClick?.();
                        }}
                        type="button"
                        variant="outline"
                      >
                        {mergedField.actionLabel ?? mergedField.label}
                      </Button>
                    </FieldShell>
                  );
                default:
                  return (
                    <TextInput
                      {...common}
                      onChange={controlledField.onChange}
                      placeholder={mergedField.placeholder}
                      value={(controlledField.value as string) ?? ""}
                    />
                  );
              }
            }}
          />
        );
      })}
    </>
  );
}
