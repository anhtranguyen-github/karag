import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Target, Bug, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

export function EvaluationDashboard() {
    const data = [
        { run: 1, precision: 0.85, recall: 0.82, coherence: 0.90 },
        { run: 2, precision: 0.83, recall: 0.84, coherence: 0.89 },
        { run: 3, precision: 0.88, recall: 0.81, coherence: 0.92 },
        { run: 4, precision: 0.86, recall: 0.85, coherence: 0.91 },
        { run: 5, precision: 0.89, recall: 0.88, coherence: 0.94 },
    ];

    const suites = [
        { id: 'rag-faithfulness', name: 'RAG Faithfulness', passed: 42, total: 45, status: 'passing' },
        { id: 'context-relevance', name: 'Context Relevance', passed: 38, total: 40, status: 'passing' },
        { id: 'answer-correctness', name: 'Answer Correctness', passed: 18, total: 25, status: 'failing' },
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#121214] border border-white/5 rounded-2xl p-6 h-[400px]">
                    <h3 className="text-sm font-black tracking-wider uppercase mb-6 flex items-center gap-2">
                        <Target size={16} className="text-indigo-400" />
                        Regression Trend (Last 5 Runs)
                    </h3>
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorPrec" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis dataKey="run" stroke="#6b7280" tick={{ fontSize: 10, fontWeight: 900 }} />
                            <YAxis stroke="#6b7280" tick={{ fontSize: 10, fontWeight: 900 }} domain={[0.5, 1]} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 700 }}
                            />
                            <Area type="monotone" dataKey="precision" stroke="#818cf8" fillOpacity={1} fill="url(#colorPrec)" strokeWidth={3} />
                            <Area type="monotone" dataKey="recall" stroke="#34d399" fillOpacity={1} fill="url(#colorRec)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                    <div className="bg-[#121214] border border-white/5 rounded-2xl p-6">
                        <h3 className="text-sm font-black tracking-wider uppercase mb-6 flex items-center gap-2">
                            <Bug size={16} className="text-rose-400" />
                            Active Test Suites (DeepEval)
                        </h3>
                        <div className="space-y-3">
                            {suites.map((suite) => (
                                <div key={suite.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                                    <div>
                                        <div className="text-tiny font-black text-white">{suite.name}</div>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                                            {suite.passed} / {suite.total} Scenarios Passed
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {suite.status === 'passing' ? (
                                            <div className="flex items-center gap-1.5 text-emerald-500">
                                                <CheckCircle2 size={14} />
                                                <span className="text-[9px] font-black uppercase">Pass</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-rose-500">
                                                <AlertTriangle size={14} />
                                                <span className="text-[9px] font-black uppercase">Fail</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                        <div className="text-tiny font-black text-indigo-400 uppercase mb-2">Detailed Report Available</div>
                        <p className="text-[10px] text-indigo-300/60 font-medium mb-4">
                            Full regression analysis including failing prompt inputs and context retrieval misses.
                        </p>
                        <button className="w-full py-2 rounded-xl bg-indigo-500 text-black font-black text-[10px] uppercase hover:bg-indigo-400 transition-all flex items-center justify-center gap-2">
                            Open HTML Report <ExternalLink size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

