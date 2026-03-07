import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { FieldConfig } from '@/lib/schemas/ui-schemas';

interface SchemaFormProps {
    schema: FieldConfig[];
    gridCols?: 1 | 2 | 3;
}

export function SchemaForm({ schema, gridCols = 2 }: SchemaFormProps) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-${gridCols} gap-4`}>
            {schema.map(field => (
                <FieldRenderer key={field.name} field={field} />
            ))}
        </div>
    );
}

function FieldRenderer({ field }: { field: FieldConfig }) {
    const { control } = useFormContext();
    const dependsOn = field.dependsOn;
    const watchedValue = useWatch({
        control,
        name: dependsOn?.field || '___non_existent_field___'
    });
    const isVisibleCheck = dependsOn ? watchedValue === dependsOn.value : true;

    if (!isVisibleCheck) return null;

    const labelClass = "text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 block";
    const inputClass = "h-9 rounded-xl bg-background border-border text-xs";

    return (
        <FormField
            control={control}
            name={field.name}
            render={({ field: hookField }) => {
                if (field.type === 'switch') {
                    return (
                        <FormItem className={cn("flex flex-row items-center justify-between p-3 rounded-xl border border-border bg-card", field.colSpan === 2 && "md:col-span-2")}>
                            <div className="space-y-0.5">
                                <FormLabel className="text-xs font-bold text-foreground">{field.label}</FormLabel>
                                {field.description && (
                                    <p className="text-[9px] text-muted-foreground">{field.description}</p>
                                )}
                            </div>
                            <FormControl>
                                <Switch
                                    checked={hookField.value}
                                    onCheckedChange={hookField.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    );
                }

                if (field.type === 'slider') {
                    return (
                        <FormItem className={cn("space-y-3", field.colSpan === 2 && "md:col-span-2")}>
                            <div className="flex justify-between items-center mb-2 font-bold tracking-tight">
                                <div>
                                    <FormLabel className={labelClass}>{field.label}</FormLabel>
                                    {field.description && <p className="text-[9px] text-muted-foreground font-normal">{field.description}</p>}
                                </div>
                                <span className="text-indigo-500 text-[10px] font-mono">{hookField.value}</span>
                            </div>
                            <FormControl>
                                <Slider
                                    min={field.min}
                                    max={field.max}
                                    step={field.step || 1}
                                    value={[hookField.value || 0]}
                                    onValueChange={(v) => hookField.onChange(v[0])}
                                />
                            </FormControl>
                        </FormItem>
                    );
                }

                if (field.type === 'select' && field.options) {
                    return (
                        <FormItem className={cn(field.colSpan === 2 && "md:col-span-2")}>
                            <FormLabel className={labelClass}>{field.label}</FormLabel>
                            {field.description && <p className="text-[9px] text-muted-foreground mb-2">{field.description}</p>}
                            <Select onValueChange={(val) => {
                                // Important: Convert "true"/"false" strings back to boolean if needed, or parse numbers. Let zod or form handle string mostly.
                                let parsed: any = val;
                                // Basic inference based on options
                                const correspondingOption = field.options?.find((o: any) => String(o.value) === val);
                                if (correspondingOption) parsed = correspondingOption.value;

                                hookField.onChange(parsed);
                            }} value={String(hookField.value)}>
                                <FormControl>
                                    <SelectTrigger className={inputClass}>
                                        <SelectValue placeholder={`Select ${field.label}`} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {field.options.map((opt: any) => (
                                        <SelectItem key={String(opt.value)} value={String(opt.value)}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    );
                }

                // Default to 'text' or 'number' Input
                return (
                    <FormItem className={cn(field.colSpan === 2 && "md:col-span-2")}>
                        <FormLabel className={labelClass}>{field.label}</FormLabel>
                        {field.description && <p className="text-[9px] text-muted-foreground mb-2">{field.description}</p>}
                        <FormControl>
                            <Input
                                type={field.type === 'number' ? 'number' : 'text'}
                                {...hookField}
                                onChange={e => {
                                    if (field.type === 'number') {
                                        const val = e.target.value === '' ? undefined : (field.step && field.step % 1 !== 0) ? parseFloat(e.target.value) : parseInt(e.target.value);
                                        hookField.onChange(val);
                                    } else {
                                        hookField.onChange(e.target.value);
                                    }
                                }}
                                className={inputClass}
                            />
                        </FormControl>
                    </FormItem>
                );
            }}
        />
    );
}
