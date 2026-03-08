"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { FieldShell } from "@/components/inputs/field-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type KeyValueEditorProps = {
    label: string;
    description?: string;
    error?: string;
    value: Record<string, string>;
    onChange: (value: Record<string, string>) => void;
};

export function KeyValueEditor({
    label,
    description,
    error,
    value,
    onChange
}: KeyValueEditorProps) {
    const [items, setItems] = useState<{ id: string; key: string; val: string }[]>(() =>
        Object.entries(value || {}).map(([key, val]) => ({
            id: Math.random().toString(36).substr(2, 9),
            key,
            val
        }))
    );

    useEffect(() => {
        const currentItems = Object.entries(value || {}).map(([key, val]) => ({
            key,
            val
        }));
        const internalItems = items.map(({ key, val }) => ({ key, val }));

        if (JSON.stringify(currentItems) !== JSON.stringify(internalItems)) {
            setItems(
                Object.entries(value || {}).map(([key, val]) => ({
                    id: Math.random().toString(36).substr(2, 9),
                    key,
                    val
                }))
            );
        }
    }, [value]);

    const updateParent = (
        newItems: { id: string; key: string; val: string }[]
    ) => {
        const result: Record<string, string> = {};
        newItems.forEach((item) => {
            if (item.key) {
                result[item.key] = item.val;
            }
        });
        onChange(result);
    };

    const addItem = () => {
        const next = [
            ...items,
            { id: Math.random().toString(36).substr(2, 9), key: "", val: "" }
        ];
        setItems(next);
    };

    const removeItem = (id: string) => {
        const next = items.filter((item) => item.id !== id);
        setItems(next);
        updateParent(next);
    };

    const updateItem = (id: string, key: string, val: string) => {
        const next = items.map((item) => (item.id === id ? { ...item, key, val } : item));
        setItems(next);
        updateParent(next);
    };

    return (
        <FieldShell label={label} description={description} error={error}>
            <div className="grid gap-2">
                {items.map((item) => (
                    <div className="flex gap-2" key={item.id}>
                        <Input
                            className="flex-1 font-mono text-xs"
                            onChange={(e) => updateItem(item.id, e.target.value, item.val)}
                            placeholder="Key"
                            value={item.key}
                        />
                        <Input
                            className="flex-1 font-mono text-xs"
                            onChange={(e) => updateItem(item.id, item.key, e.target.value)}
                            placeholder="Value"
                            value={item.val}
                        />
                        <Button
                            className="h-9 w-9"
                            onClick={() => removeItem(item.id)}
                            size="icon"
                            variant="outline"
                        >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                ))}
                <Button
                    className="mt-1 w-full border-dashed"
                    onClick={addItem}
                    size="sm"
                    variant="outline"
                >
                    <Plus className="mr-2 h-3 w-3" />
                    Add entry
                </Button>
            </div>
        </FieldShell>
    );
}
