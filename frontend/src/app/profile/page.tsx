"use client";

import { useAuth } from "@/context/auth-context";
import { motion } from "framer-motion";
import { User, Mail, Shield, LogOut, Database, Calendar } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function ProfilePage() {
    const { user, logout, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-2xl font-bold mb-4">Not Authenticated</h1>
                <p className="text-muted-foreground mb-8">Please sign in to view your profile.</p>
                <Link href="/login">
                    <button className="h-12 px-8 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition-all">
                        Sign In
                    </button>
                </Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-background text-foreground selection:bg-indigo-500/30 overflow-x-hidden">
            {/* Dynamic Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            <div className="relative z-10 container mx-auto max-w-4xl py-12 px-6">
                {/* Header Section */}
                <div className="flex justify-between items-center mb-12">
                    <Link href="/">
                        <div className="flex items-center gap-3 group px-4 py-2 rounded-xl hover:bg-secondary/50 transition-all">
                            <Database className="w-6 h-6 text-indigo-500 group-hover:scale-110 transition-transform" />
                            <span className="font-black tracking-tighter text-xl">Karag</span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <button
                            onClick={logout}
                            className="h-11 px-6 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold text-[11px] tracking-wide flex items-center gap-2 group"
                        >
                            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Sign Out
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Avatar & Quick Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="bg-card border border-border p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-500/5 backdrop-blur-xl flex flex-col items-center">
                            <div className="w-32 h-32 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/20">
                                <User className="w-16 h-16 text-indigo-500" />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-center">{user.fullName || "User"}</h2>
                            <p className="text-muted-foreground text-sm font-medium mb-6">{user.email}</p>

                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-widest">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active Account
                            </div>
                        </div>

                        <div className="bg-card border border-border p-6 rounded-[2rem] shadow-xl">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 ml-2">Quick Stats</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                                    <span className="text-sm font-medium text-muted-foreground">Workspaces</span>
                                    <span className="font-bold">--</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                                    <span className="text-sm font-medium text-muted-foreground">Documents</span>
                                    <span className="font-bold">--</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Detailed Info & Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:col-span-2 space-y-8"
                    >
                        <div className="bg-card border border-border p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full -mr-32 -mt-32 group-hover:bg-indigo-500/10 transition-all duration-700" />

                            <h3 className="text-xl font-bold mb-8 relative z-10 flex items-center gap-3">
                                Account Information
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Email Address</label>
                                    <div className="h-14 flex items-center px-5 rounded-2xl bg-secondary/50 border border-border font-bold">
                                        <Mail className="w-4 h-4 mr-3 text-indigo-500" />
                                        {user.email}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Full Name</label>
                                    <div className="h-14 flex items-center px-5 rounded-2xl bg-secondary/50 border border-border font-bold">
                                        <User className="w-4 h-4 mr-3 text-indigo-500" />
                                        {user.fullName || "Not specified"}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Account Role</label>
                                    <div className="h-14 flex items-center px-5 rounded-2xl bg-secondary/50 border border-border font-bold capitalize">
                                        <Shield className="w-4 h-4 mr-3 text-indigo-500" />
                                        {user.isSuperuser ? "Administrator" : "User"}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Member Since</label>
                                    <div className="h-14 flex items-center px-5 rounded-2xl bg-secondary/50 border border-border font-bold">
                                        <Calendar className="w-4 h-4 mr-3 text-indigo-500" />
                                        Recently
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-600/5 border border-indigo-500/10 p-10 rounded-[2.5rem]">
                            <h3 className="text-xl font-bold mb-2">Security</h3>
                            <p className="text-muted-foreground text-sm mb-6">Manage your account security and preferences.</p>

                            <div className="flex gap-4">
                                <button className="h-12 px-8 rounded-xl bg-indigo-500 text-white font-bold hover:bg-indigo-600 transition-all text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20">
                                    Change Password
                                </button>
                                <button className="h-12 px-8 rounded-xl bg-secondary border border-border font-bold hover:bg-muted transition-all text-xs uppercase tracking-widest">
                                    Privacy Settings
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </main>
    );
}
