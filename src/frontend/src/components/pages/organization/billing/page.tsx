"use client";

import { Blocks, Github, Heart, ShieldCheck } from "lucide-react";
import { OrganizationGuard } from "@/components/ui/organization-guard";
import { Button } from "@/components/ui/button";

export default function OrganizationBillingPage() {
  return (
    <OrganizationGuard>
      <div className="mx-auto w-full max-w-5xl py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="mb-12 flex flex-col gap-2">
          <h1 className="text-4xl font-black tracking-tight text-[#f8fafc]">Platform Sovereignty</h1>
          <p className="text-[#94a3b8] font-medium max-w-lg italic">This deployment is managed by you — you own your data, models, and infrastructure.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-[2.5rem] border border-[#2a2a2a] bg-[#1a1a1a] p-10 flex flex-col gap-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                <ShieldCheck size={200} />
            </div>
            <div className="h-14 w-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-inner">
                <ShieldCheck size={28} />
            </div>
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-[#f8fafc]">Self-hosted Deployment</h2>
                <p className="text-[#94a3b8] font-medium leading-relaxed">
                  This deployment is self-hosted and under your control. Deploy it anywhere and scale as needed.
                </p>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-[#2a2a2a] bg-[#1a1a1a] p-10 flex flex-col gap-6 shadow-2xl relative overflow-hidden group border-dashed">
            <div className="absolute -top-10 -right-10 opacity-5 group-hover:-rotate-12 transition-transform duration-700">
                <Blocks size={200} />
            </div>
            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
                <Blocks size={28} />
            </div>
            <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold text-[#f8fafc]">Project Contributors</h2>
                <p className="text-[#94a3b8] font-medium leading-relaxed">
                  Contributors and maintainers work on this project; you can review or extend the code base as needed.
                </p>
            </div>
          </div>
        </div>

        <div className="mt-12 p-10 rounded-[3rem] bg-gradient-to-r from-orange-500/5 to-blue-500/5 border border-[#2a2a2a] flex flex-col items-center text-center gap-6">
            <div className="flex items-center gap-1.5 text-orange-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-2">
                <Heart size={14} className="fill-orange-400" />
                Special Permission Required
            </div>
            <h3 className="text-3xl font-black text-[#f8fafc] tracking-tight">Project Info</h3>
            <p className="text-[#94a3b8] max-w-md font-medium italic">
              If you'd like to support development, consider improving the project or sharing improvements.
            </p>
            <div className="flex gap-4 mt-2">
                <Button className="h-12 px-8 rounded-2xl bg-[#f8fafc] text-[#1a1a1a] font-bold gap-2 hover:bg-white transition-all shadow-xl shadow-white/5">
                    <Github size={20} />
                    View on GitHub
                </Button>
                <Button variant="ghost" className="h-12 px-8 rounded-2xl text-[#f8fafc] font-bold border border-[#2a2a2a] hover:bg-white/5 transition-all">
                    Release Notes
                </Button>
            </div>
        </div>
      </div>
    </OrganizationGuard>
  );
}
