"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, LogIn, Database } from "lucide-react";
import { useToast } from "@/context/toast-context";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login, isLoading } = useAuth();
    const toast = useToast();
    const searchParams = useSearchParams();
    const router = useRouter();
    const returnUrl = searchParams.get("returnUrl") || "/";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password);
            toast.success("Welcome back!");
            router.replace(returnUrl);
        } catch {
            toast.error("Login failed. Please check your credentials.");
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
            {/* Dynamic Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 mb-6 shadow-2xl shadow-indigo-500/20">
                        <Database className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">Karag</h1>
                    <p className="text-muted-foreground font-medium">Sign in to manage your documents and search services</p>
                </div>

                <div className="bg-card border border-border/60 p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 backdrop-blur-xl relative group">
                    {/* Inner Glow */}
                    <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                        <div className="space-y-6">
                            <div className="relative group/field">
                                <label htmlFor="login-email" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-4 mb-2 block">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within/field:text-indigo-400 transition-colors" />
                                    <input
                                        id="login-email"
                                        type="email"
                                        required
                                        className="w-full h-16 pl-16 pr-6 rounded-2xl bg-secondary/50 border border-border focus:border-indigo-500/30 transition-all outline-none font-bold text-base text-foreground placeholder:text-muted-foreground/40 focus:bg-muted"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="relative group/field">
                                <label htmlFor="login-password" className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-4 mb-2 block">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within/field:text-indigo-400 transition-colors" />
                                    <input
                                        id="login-password"
                                        type="password"
                                        required
                                        className="w-full h-16 pl-16 pr-6 rounded-2xl bg-secondary/50 border border-border focus:border-indigo-500/30 transition-all outline-none font-bold text-base text-foreground placeholder:text-muted-foreground/40 focus:bg-muted"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-indigo-500/10 disabled:opacity-50"
                        >
                            {isLoading ? "Signing in..." : (
                                <>
                                    Sign In
                                    <LogIn className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="text-center mt-10">
                    <p className="text-muted-foreground text-sm font-medium">
                        New here? {" "}
                        <Link href="/register" className="text-foreground font-bold hover:text-indigo-400 transition-colors underline decoration-2 underline-offset-4 decoration-indigo-500/20">
                            Create an account
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
