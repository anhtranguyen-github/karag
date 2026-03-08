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
import type { ConfigFieldComponent, ConfigFormDefinition } from "@/components/config/types";

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
  fieldSchema: z.ZodTypeAny | undefined,
  explicit?: ConfigFieldComponent
): ConfigFieldComponent {
  if (explicit) {
    return explicit;
  }

  const schema = unwrapSchema(fieldSchema);

  if (!schema) {
    return "text";
  }

  if (schema instanceof z.ZodBoolean) {
    return "toggle";
  }
  if (schema instanceof z.ZodNumber) {
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
};

export function SchemaRenderer<TSchema extends z.AnyZodObject>({
  definition,
  form
}: SchemaRendererProps<TSchema>) {
  const shape = definition.schema.shape as Record<string, z.ZodTypeAny>;

  return (
    <>
      {definition.fields.map((field) => {
        const component = inferComponent(shape[field.name], field.component);
        const error = getError(form.formState.errors, field.name);

        return (
          <Controller
            control={form.control}
            key={field.name}
            name={field.name as Path<z.infer<TSchema>>}
            render={({ field: controlledField }) => {
              const common = {
                label: field.label,
                description: field.description,
                error,
                required: field.required
              };

              switch (component) {
                case "textarea":
                  return (
                    <TextareaInput
                      {...common}
                      onChange={controlledField.onChange}
                      placeholder={field.placeholder}
                      rows={field.rows ?? 4}
                      value={(controlledField.value as string) ?? ""}
                    />
                  );
                case "select":
                  return (
                    <SelectDropdown
                      {...common}
                      onChange={(event) => controlledField.onChange(event.target.value)}
                      options={field.options ?? []}
                      placeholder={field.placeholder}
                      value={(controlledField.value as string) ?? ""}
                    />
                  );
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
                      max={field.max}
                      min={field.min}
                      onChange={(event) =>
                        controlledField.onChange(
                          event.target.value === "" ? undefined : Number(event.target.value)
                        )
                      }
                      placeholder={field.placeholder}
                      step={field.step}
                      value={controlledField.value as number | undefined}
                    />
                  );
                case "slider":
                  return (
                    <SliderInput
                      {...common}
                      max={field.max}
                      min={field.min}
                      onChange={(event) => controlledField.onChange(Number(event.target.value))}
                      step={field.step}
                      value={Number(controlledField.value ?? field.min ?? 0)}
                      valueLabel={String(controlledField.value ?? field.min ?? 0)}
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
                      options={field.options ?? []}
                      value={(controlledField.value as string[]) ?? []}
                    />
                  );
                case "secret":
                  return (
                    <SecretInput
                      {...common}
                      onChange={controlledField.onChange}
                      placeholder={field.placeholder}
                      value={(controlledField.value as string) ?? ""}
                    />
                  );
                case "file":
                  return (
                    <FileUpload
                      {...common}
                      accept={field.accept}
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
                default:
                  return (
                    <TextInput
                      {...common}
                      onChange={controlledField.onChange}
                      placeholder={field.placeholder}
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
