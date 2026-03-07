import React from 'react';
import { Package, ExternalLink, Shield, Bug, FileCheck, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DevSecOpsTab() {
    const pipelines = [
        { name: 'Backend-CI', status: 'success', lastRun: '2h ago', duration: '4m 12s', audit: 'Passed' },
        { name: 'Frontend-CI', status: 'success', lastRun: '5h ago', duration: '3m 45s', audit: 'Passed' },
        { name: 'Prompt-Regressions', status: 'warning', lastRun: '1d ago', duration: '12m 30s', audit: 'Failed 2/40' },
        { name: 'Infra-Scanning', status: 'success', lastRun: '12h ago', duration: '45s', audit: 'Clean' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-black tracking-wider uppercase mb-6 flex items-center gap-2">
                        <Package size={16} className="text-blue-400" />
                        Build and Deploy Status
                    </h3>
                    <div className="space-y-3">
                        {pipelines.map(pipe => (
                            <div key={pipe.name} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        pipe.status === 'success' ? "bg-emerald-500" : "bg-amber-500"
                                    )} />
                                    <div>
                                        <div className="text-tiny font-black text-white">{pipe.name}</div>
                                        <div className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">{pipe.lastRun} • {pipe.duration}</div>
                                    </div>
                                </div>
                                <button className="p-2 rounded-lg bg-white/5 text-gray-500 hover:text-white transition-all"><ExternalLink size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black tracking-wider uppercase flex items-center gap-2">
                            <Shield size={16} className="text-red-400" />
                            Security and Quality Status
                        </h3>
                        <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] font-black border border-emerald-500/20 uppercase tracking-widest">Compliant</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-red-400">
                                <Bug size={14} />
                                <span className="text-[10px] font-black uppercase">Code Quality</span>
                            </div>
                            <div className="text-2xl font-black">2.4%</div>
                            <div className="text-[9px] text-gray-600 font-medium">B Grade on SonarQube</div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400">
                                <FileCheck size={14} />
                                <span className="text-[10px] font-black uppercase">Infra Audit</span>
                            </div>
                            <div className="text-2xl font-black">Clean</div>
                            <div className="text-[9px] text-gray-600 font-medium">Zero High CVEs in Docker</div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-[9px]">Release Readiness</span>
                            <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-lg bg-white/5">98.2%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full w-[98.2%] bg-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#121214] border border-white/5 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <GitBranch size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-white">Production Promotion Control</h4>
                        <p className="text-[10px] text-gray-500 font-medium mt-1">Manual approval required for environment promotion when quality gate fails.</p>
                    </div>
                </div>
                <div className="flex gap-3 text-[10px] font-black uppercase">
                    <button className="px-5 py-2.5 rounded-xl border border-white/5 text-gray-500 cursor-not-allowed">Rollback Cluster</button>
                    <button className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-gray-200 transition-all">Promote Release</button>
                </div>
            </div>
        </div>
    );
}
