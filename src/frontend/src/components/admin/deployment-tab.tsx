"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, PlugZap, RefreshCw, Save, Server, Shield, Wrench } from "lucide-react";
import { admin } from "@/sdk/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SecretState {
    configured: boolean;
    masked_value: string | null;
}

interface DeploymentConfig {
    mode: "local" | "cloud" | "hybrid";
    providers: {
        llm_provider: string;
        llm_model: string;
        embedding_provider: string;
        embedding_model: string;
        vector_store_provider: string;
        graph_store_provider: string;
    };
    services: {
        mongo_uri: string;
        mongo_db: string;
        qdrant_url: string;
        neo4j_uri: string;
        neo4j_user: string;
        minio_endpoint: string;
        minio_secure: boolean;
        minio_bucket: string;
        ollama_base_url: string;
        vllm_base_url: string;
        llamacpp_base_url: string;
    };
    secrets: Record<string, SecretState>;
}

interface VerificationCheck {
    key: string;
    label: string;
    status: "ok" | "error" | "not_configured" | "detected" | "not_detected";
    detail: string;
    endpoint?: string | null;
}

interface VerificationResult {
    mode: "local" | "cloud" | "hybrid";
    checks: VerificationCheck[];
    healthy: number;
    failed: number;
    recommendations: string[];
}

const SECRET_FIELDS = [
    { key: "openai_api_key", label: "OpenAI API key" },
    { key: "anthropic_api_key", label: "Anthropic API key" },
    { key: "voyage_api_key", label: "Voyage API key" },
    { key: "cohere_api_key", label: "Cohere API key" },
    { key: "qdrant_api_key", label: "Qdrant API key" },
    { key: "neo4j_password", label: "Neo4j password" },
    { key: "minio_access_key", label: "MinIO access key" },
    { key: "minio_secret_key", label: "MinIO secret key" },
] as const;

export function DeploymentTab() {
    const [config, setConfig] = useState<DeploymentConfig | null>(null);
    const [draft, setDraft] = useState<DeploymentConfig | null>(null);
    const [secretDraft, setSecretDraft] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [detection, setDetection] = useState<VerificationResult | null>(null);
    const [verification, setVerification] = useState<VerificationResult | null>(null);

    const load = async () => {
        setLoading(true);
        const payload = await admin.getDeploymentConfig() as any;
        if (payload.success) {
            setConfig(payload.data);
            setDraft(payload.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const updateProvider = (key: string, value: string) => {
        if (!draft) return;
        setDraft({
            ...draft,
            providers: { ...draft.providers, [key]: value },
        });
    };

    const updateService = (key: string, value: string | boolean) => {
        if (!draft) return;
        setDraft({
            ...draft,
            services: { ...draft.services, [key]: value },
        });
    };

    const save = async () => {
        if (!draft) return;
        setSaving(true);
        const payload = await admin.updateDeploymentConfig({
            mode: draft.mode,
            providers: draft.providers,
            services: draft.services,
            secrets: secretDraft,
        }) as any;
        if (payload.success) {
            setConfig(payload.data);
            setDraft(payload.data);
            setSecretDraft({});
        }
        setSaving(false);
    };

    const detect = async () => {
        setDetecting(true);
        const payload = await admin.detectLocalDeployment() as any;
        if (payload.success) setDetection(payload.data);
        setDetecting(false);
    };

    const verify = async () => {
        setVerifying(true);
        const payload = await admin.verifyDeployment() as any;
        if (payload.success) setVerification(payload.data);
        setVerifying(false);
    };

    if (loading || !draft || !config) {
        return <div className="p-20 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-500" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="bg-[#121214] border-white/5 xl:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Server size={18} className="text-indigo-400" /> Deployment Runtime</CardTitle>
                        <CardDescription>Manage the active provider and service configuration for local, cloud, or hybrid deployments without editing source files.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SelectField label="Mode" value={draft.mode} onChange={(value) => setDraft({ ...draft, mode: value as DeploymentConfig["mode"] })} options={["local", "cloud", "hybrid"]} />
                            <InputField label="LLM Provider" value={draft.providers.llm_provider} onChange={(value) => updateProvider("llm_provider", value)} />
                            <InputField label="LLM Model" value={draft.providers.llm_model} onChange={(value) => updateProvider("llm_model", value)} />
                            <InputField label="Embedding Provider" value={draft.providers.embedding_provider} onChange={(value) => updateProvider("embedding_provider", value)} />
                            <InputField label="Embedding Model" value={draft.providers.embedding_model} onChange={(value) => updateProvider("embedding_model", value)} />
                            <InputField label="Vector Store" value={draft.providers.vector_store_provider} onChange={(value) => updateProvider("vector_store_provider", value)} />
                            <InputField label="Graph Store" value={draft.providers.graph_store_provider} onChange={(value) => updateProvider("graph_store_provider", value)} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Mongo URI" value={draft.services.mongo_uri} onChange={(value) => updateService("mongo_uri", value)} />
                            <InputField label="Mongo DB" value={draft.services.mongo_db} onChange={(value) => updateService("mongo_db", value)} />
                            <InputField label="Qdrant URL" value={draft.services.qdrant_url} onChange={(value) => updateService("qdrant_url", value)} />
                            <InputField label="Neo4j URI" value={draft.services.neo4j_uri} onChange={(value) => updateService("neo4j_uri", value)} />
                            <InputField label="Neo4j User" value={draft.services.neo4j_user} onChange={(value) => updateService("neo4j_user", value)} />
                            <InputField label="MinIO Endpoint" value={draft.services.minio_endpoint} onChange={(value) => updateService("minio_endpoint", value)} />
                            <InputField label="MinIO Bucket" value={draft.services.minio_bucket} onChange={(value) => updateService("minio_bucket", value)} />
                            <SelectField label="MinIO Secure" value={String(draft.services.minio_secure)} onChange={(value) => updateService("minio_secure", value === "true")} options={["true", "false"]} />
                            <InputField label="Ollama URL" value={draft.services.ollama_base_url} onChange={(value) => updateService("ollama_base_url", value)} />
                            <InputField label="vLLM URL" value={draft.services.vllm_base_url} onChange={(value) => updateService("vllm_base_url", value)} />
                            <InputField label="llama.cpp URL" value={draft.services.llamacpp_base_url} onChange={(value) => updateService("llamacpp_base_url", value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-[#121214] border-white/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield size={18} className="text-indigo-400" /> Secrets</CardTitle>
                        <CardDescription>Stored values stay redacted. Enter a new value only when rotating or adding credentials.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {SECRET_FIELDS.map((field) => (
                            <div key={field.key} className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{field.label}</label>
                                <Input
                                    type="password"
                                    placeholder={config.secrets[field.key]?.configured ? config.secrets[field.key]?.masked_value || "configured" : "not configured"}
                                    value={secretDraft[field.key] || ""}
                                    onChange={(e) => setSecretDraft((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                    className="bg-secondary/50 border-white/5"
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-wrap gap-3">
                <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Deployment Config
                </Button>
                <Button onClick={detect} disabled={detecting} variant="outline" className="border-white/10 bg-[#121214]">
                    {detecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
                    Detect Local Services
                </Button>
                <Button onClick={verify} disabled={verifying} variant="outline" className="border-white/10 bg-[#121214]">
                    {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
                    Verify Configured Setup
                </Button>
                <Button onClick={load} variant="ghost" className="text-gray-400">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ResultCard
                    title="Local Detection"
                    description="Scans the default local service endpoints expected for self-hosted deployments."
                    result={detection}
                />
                <ResultCard
                    title="Configuration Verification"
                    description="Validates the currently configured cloud or local dependencies and provider credentials."
                    result={verification}
                />
            </div>
        </div>
    );
}

function InputField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</label>
            <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-secondary/50 border-white/5" />
        </div>
    );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{label}</label>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-xl bg-secondary/50 border border-white/5 px-3 text-sm">
                {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
        </div>
    );
}

function ResultCard({ title, description, result }: { title: string; description: string; result: VerificationResult | null }) {
    return (
        <Card className="bg-[#121214] border-white/5">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {!result ? (
                    <div className="text-sm text-gray-500">Run this check from the controls above.</div>
                ) : (
                    <>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="text-emerald-400 font-bold">{result.healthy} healthy</span>
                            <span className="text-red-400 font-bold">{result.failed} failed</span>
                            <span className="text-gray-500 uppercase text-[10px] font-black tracking-widest">{result.mode}</span>
                        </div>
                        <div className="space-y-3">
                            {result.checks.map((check) => (
                                <div key={`${title}-${check.key}`} className="rounded-2xl border border-white/5 bg-black/20 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-bold text-sm">{check.label}</div>
                                            <div className="text-xs text-gray-500 mt-1">{check.detail}</div>
                                            {check.endpoint && <div className="text-[10px] text-gray-600 mt-2 font-mono">{check.endpoint}</div>}
                                        </div>
                                        <StatusPill status={check.status} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        {result.recommendations.length > 0 && (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                                    <AlertTriangle size={16} />
                                    Recommendations
                                </div>
                                <div className="space-y-1">
                                    {result.recommendations.map((item) => (
                                        <div key={item} className="text-xs text-gray-300">{item}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function StatusPill({ status }: { status: VerificationCheck["status"] }) {
    const ok = status === "ok" || status === "detected";
    return (
        <div className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1 ${ok ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" : "text-red-400 border-red-500/20 bg-red-500/10"}`}>
            {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {status.replace("_", " ")}
        </div>
    );
}
