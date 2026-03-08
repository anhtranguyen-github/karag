import type { DefaultValues, Path } from "react-hook-form";
import type { z } from "zod";

export type ConfigFieldComponent =
  | "text"
  | "textarea"
  | "select"
  | "toggle"
  | "number"
  | "slider"
  | "checkbox"
  | "multiselect"
  | "secret"
  | "file"
  | "json";

export type ConfigFieldOption = {
  label: string;
  value: string;
};

export type ConfigFieldConfig<TSchema extends z.AnyZodObject> = {
  name: Path<z.infer<TSchema>>;
  label: string;
  description?: string;
  placeholder?: string;
  component?: ConfigFieldComponent;
  options?: ConfigFieldOption[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  required?: boolean;
  accept?: string;
};

export type ConfigFormDefinition<TSchema extends z.AnyZodObject> = {
  schema: TSchema;
  defaultValues: DefaultValues<z.infer<TSchema>>;
  fields: ConfigFieldConfig<TSchema>[];
  submitLabel?: string;
};
