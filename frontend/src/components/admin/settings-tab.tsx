import { motion } from 'framer-motion';
import { Cpu, Loader2, Layout, Boxes, Search, Wand2, Activity, Shield, Settings, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppSettings, SettingMetadata } from '@/hooks/use-settings';

interface SettingsTabProps {
    settings: AppSettings | null;
    metadata: Record<string, SettingMetadata> | null;
    handleUpdate: (key: string, value: string | number | boolean) => void;
    isSaving: string | null;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    'Generation Component': Wand2,
    'Retrieval Component': Search,
    'Embedding Component': Boxes,
    'Ingestion Component': Layout,
    'Agentic Component': Shield,
    'Execution Mode': Activity,
    'Interface': Settings,
};

export function SettingsTab({ settings, metadata, handleUpdate, isSaving }: SettingsTabProps) {
    if (!settings || !metadata) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-500" /></div>;

    // Group fields by category
    const categories: Record<string, string[]> = {};
    Object.keys(metadata).forEach(key => {
        const cat = metadata[key].category || 'General';
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(key);
    });

    return (
        <div className="space-y-12">
            {Object.entries(categories).map(([category, keys]) => {
                const Icon = CATEGORY_ICONS[category] || Cpu;
                return (
                    <div key={category} className="space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                <Icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black tracking-[0.2em] text-white underline decoration-indigo-500/30 underline-offset-8">
                                    {category}
                                </h3>
                                <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1">Global System Parameters</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {keys.map(key => (
                                <ConfigField
                                    key={key}
                                    fieldKey={key}
                                    settings={settings}
                                    metadata={metadata}
                                    handleUpdate={handleUpdate}
                                    isSaving={isSaving}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ConfigField({ fieldKey, settings, metadata, handleUpdate, isSaving }: {
    fieldKey: string;
    settings: AppSettings;
    metadata: Record<string, SettingMetadata>;
    handleUpdate: (key: string, value: string | number | boolean) => void;
    isSaving: string | null;
}) {
    const meta = metadata[fieldKey];
    const value = settings[fieldKey as keyof AppSettings];

    // In case value is undefined in settings but exists in metadata
    if (value === undefined) return null;

    const isBool = meta.field_type === 'bool' || typeof value === 'boolean';
    const isNum = meta.field_type === 'int' || meta.field_type === 'float' || typeof value === 'number';

    const label = fieldKey.replace(/_/g, ' ');

    return (
        <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 group hover:border-indigo-500/20 transition-all relative">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white tracking-wider">{label}</span>
                        {!meta.mutable && (
                            <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full tracking-tighter border border-amber-500/20">
                                global immutable
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-600 font-medium leading-relaxed max-w-[90%]">
                        {meta.description}
                    </p>
                </div>
                {isSaving === fieldKey && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
            </div>

            <div className="pt-2 border-t border-white/[0.03] flex items-center justify-end h-10">
                {isBool ? (
                    <button
                        onClick={() => handleUpdate(fieldKey, !value)}
                        disabled={!meta.mutable}
                        className={cn(
                            "w-12 h-6 rounded-full p-1 transition-all relative flex items-center",
                            value ? "bg-indigo-600" : "bg-white/10",
                            !meta.mutable && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <motion.div
                            animate={{ x: value ? 24 : 0 }}
                            className="w-4 h-4 rounded-full bg-white shadow-lg"
                        />
                    </button>
                ) : meta.options ? (
                    <div className="relative w-full">
                        <select
                            className="w-full bg-secondary/50 border border-white/5 rounded-xl px-4 py-2 text-[11px] font-black text-white focus:outline-none appearance-none cursor-pointer hover:bg-secondary transition-colors disabled:opacity-50"
                            value={String(value)}
                            onChange={(e) => handleUpdate(fieldKey, e.target.value)}
                            disabled={!meta.mutable}
                        >
                            {meta.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none scale-75 opacity-50">▼</div>
                    </div>
                ) : (
                    <div className="relative w-full">
                        <input
                            type={isNum ? "number" : "text"}
                            className="w-full bg-secondary/50 border border-white/5 rounded-xl px-4 py-2 text-[11px] font-black text-white focus:ring-1 ring-indigo-500/50 outline-none disabled:opacity-50 transition-all"
                            defaultValue={String(value)}
                            disabled={!meta.mutable}
                            step={meta.step || (meta.field_type === 'float' ? 0.1 : 1)}
                            onBlur={(e) => {
                                const v = isNum ? parseFloat(e.target.value) : e.target.value;
                                if (v !== value) handleUpdate(fieldKey, v);
                            }}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-700 pointer-events-none">{meta.field_type}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
