import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Scale, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PROVIDER_SETTING_KEYS } from '@/lib/constants';
import { AppSettings, SettingMetadata } from '@/hooks/use-settings';

interface SettingsTabProps {
    settings: AppSettings | null;
    metadata: Record<string, SettingMetadata> | null;
    handleUpdate: (key: string, value: string | number | boolean) => void;
    isSaving: string | null;
}

export function SettingsTab({ settings, metadata, handleUpdate, isSaving }: SettingsTabProps) {
    if (!settings || !metadata) return <div className="p-20 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-500" /></div>;

    const providerFieldsList = () => {
        // This function was originally in page.tsx assuming useSettingsMetadata or similar helper
        // We might need to reconstruct it or pass it down. 
        // For now, let's assume we can filter metadata or settings keys.
        // Actually looking at the original code, it seems `providerFieldsList` might have been a helper.
        // Let's filter settings keys that are in PROVIDER_SETTING_KEYS and use metadata to form the list.

        return Object.keys(settings)
            .filter(key => PROVIDER_SETTING_KEYS.includes(key))
            .map(key => ({
                key,
                label: key.replace(/_/g, ' '),
                type: typeof settings[key as keyof AppSettings] === 'boolean' ? 'bool' : 'select' // Assuming providers use select/bool based on original
            }));
    };

    const providerFields = providerFieldsList();
    const otherFields = Object.keys(settings).filter(k => !PROVIDER_SETTING_KEYS.includes(k));

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Providers Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 px-2">
                        <Cpu size={16} className="text-indigo-400" />
                        AI Provider Matrix
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {providerFields.map(field => (
                            <ConfigField key={field.key} field={field} settings={settings} metadata={metadata} handleUpdate={handleUpdate} isSaving={isSaving} />
                        ))}
                    </div>
                </div>

                {/* Other Config Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2 px-2">
                        <Scale size={16} className="text-amber-400" />
                        Heuristic Controls
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                        {otherFields.map(key => (
                            <ConfigField key={key} field={{ key, label: key.replace(/_/g, ' '), type: typeof settings[key as keyof AppSettings] === 'boolean' ? 'bool' : 'text' }} settings={settings} metadata={metadata} handleUpdate={handleUpdate} isSaving={isSaving} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConfigField({ field, settings, metadata, handleUpdate, isSaving }: {
    field: { key: string; label: string; type: string };
    settings: AppSettings;
    metadata: Record<string, SettingMetadata>;
    handleUpdate: (key: string, value: string | number | boolean) => void;
    isSaving: string | null;
}) {
    const meta = metadata[field.key];
    const value = settings[field.key as keyof AppSettings];
    const isBool = field.type === 'bool' || typeof value === 'boolean';
    const isNum = typeof value === 'number';

    return (
        <div className="bg-[#121214] border border-white/5 rounded-2xl p-5 flex items-center justify-between group hover:border-white/10 transition-all">
            <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2">
                    <span className="text-tiny font-black text-white capitalize">{field.label}</span>
                    {meta && !meta.mutable && <span className="text-[9px] font-black text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">Immutable</span>}
                </div>
                <p className="text-[10px] text-gray-600 font-bold truncate mt-0.5">{meta?.description || 'Operational system parameter.'}</p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
                {isBool ? (
                    <button
                        onClick={() => handleUpdate(field.key, !value)}
                        disabled={!meta?.mutable}
                        className={cn("w-10 h-5 rounded-full p-0.5 transition-all relative", value ? "bg-indigo-600" : "bg-white/10")}
                    >
                        <motion.div animate={{ x: value ? 20 : 0 }} className="w-4 h-4 rounded-full bg-white shadow" />
                    </button>
                ) : field.type === 'select' && meta?.options ? (
                    <select
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-tiny font-bold text-white focus:outline-none min-w-[140px]"
                        value={String(value)}
                        onChange={(e) => handleUpdate(field.key, e.target.value)}
                        disabled={!meta?.mutable}
                    >
                        {meta.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                ) : (
                    <input
                        type={isNum ? "number" : "text"}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-tiny font-bold text-white focus:ring-1 ring-indigo-500/30 w-32 outline-none"
                        defaultValue={String(value)}
                        onBlur={(e) => {
                            const v = isNum ? parseFloat(e.target.value) : e.target.value;
                            if (v !== value) handleUpdate(field.key, v);
                        }}
                    />
                )}
                {isSaving === field.key && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
            </div>
        </div>
    );
}
