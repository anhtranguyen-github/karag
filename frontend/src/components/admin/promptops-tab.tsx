import React, { useMemo } from 'react';
import { ChevronRight, Code, History, Loader2 } from 'lucide-react';

export function PromptOpsTab({ registry }: any) {
    const flattenedRegistry = useMemo(() => {
        if (!registry) return null;
        // console.log removed - violating code quality rules
        const flat: any = {};
        try {
            Object.entries(registry).forEach(([domain, versions]: [string, any]) => {
                if (!versions || typeof versions !== 'object') return;

                const firstKey = Object.keys(versions)[0];
                if (firstKey && !firstKey.startsWith('v') && typeof versions[firstKey] === 'object') {
                    Object.entries(versions).forEach(([sub, subVers]: [string, any]) => {
                        flat[`${domain}.${sub}`] = subVers;
                    });
                } else {
                    flat[domain] = versions;
                }
            });
        } catch (err) {
            console.error('[PromptOps] Flattening failed:', err);
        }
        return flat;
    }, [registry]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {flattenedRegistry ? Object.entries(flattenedRegistry).map(([domain, versions]: [any, any]) => (
                    <div key={domain} className="bg-[#121214] border border-white/5 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                                <Code size={16} className="text-indigo-400" />
                                {String(domain).replace('_', ' ').replace('.', ' → ')}
                            </h3>
                            <span className="text-[10px] font-black text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">
                                {Object.keys(versions || {}).length} Versions
                            </span>
                        </div>

                        <div className="space-y-2">
                            {versions && typeof versions === 'object' ? Object.entries(versions).map(([v, content]: [any, any]) => {
                                let preview = '';
                                if (typeof content === 'string') {
                                    preview = content;
                                } else if (content && typeof content === 'object') {
                                    preview = content.description || content.system || content.user || content.create || content.text || '';
                                    if (typeof preview !== 'string') {
                                        const firstStr = Object.values(content).find(val => typeof val === 'string');
                                        preview = (firstStr as string) || JSON.stringify(content);
                                    }
                                }

                                return (
                                    <div key={v} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition-all cursor-pointer">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-tiny font-black text-indigo-400">{String(v)}</span>
                                            <div className="flex gap-2">
                                                {v === 'v1' && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase border border-emerald-500/20">Production</span>}
                                                <button className="p-1 rounded text-gray-600 hover:text-white transition-colors"><ChevronRight size={14} /></button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed font-medium">
                                            {typeof preview === 'string' ? preview : JSON.stringify(preview)}
                                        </p>
                                    </div>
                                );
                            }) : null}
                        </div>
                    </div>
                )) : (
                    <div className="lg:col-span-2 flex items-center justify-center p-20 border border-dashed border-white/5 rounded-3xl">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                            <div className="text-tiny font-black text-gray-600 uppercase tracking-widest">Loading Prompt Registry Manifest...</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <History size={24} />
                </div>
                <div className="max-w-md">
                    <h3 className="text-tiny font-black uppercase tracking-wider text-indigo-100">Hot-Reload & Rollback</h3>
                    <p className="text-[11px] text-indigo-300/60 font-medium leading-relaxed mt-1">
                        Prompt versions are defined in Git but managed as code. Version mismatches during canary deploys are detected via regression evaluation.
                    </p>
                </div>
                <button className="px-6 py-2.5 rounded-xl bg-indigo-500 text-black font-black text-[11px] uppercase hover:bg-indigo-400 transition-all">
                    Initialize A/B Experiment
                </button>
            </div>
        </div>
    );
}

