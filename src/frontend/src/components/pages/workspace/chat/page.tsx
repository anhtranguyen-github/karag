"use client";

import React, { useState, useRef, useEffect } from "react";
import {
	Send,
	Bot,
	User,
	Loader2,
	Trash2,
	MessageSquare,
	FileText,
	ChevronDown,
	Sparkles,
	Search
} from "lucide-react";
import { useParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { WorkspaceGuard } from "@/components/ui/workspace-guard";
import { platformApi } from "@/lib/api/platform";
import { useTenant } from "@/providers/tenant-provider";
import { cn } from "@/lib/utils";

type Message = {
	role: "user" | "assistant";
	content: string;
	sources?: any[];
	timestamp: Date;
};

export default function WorkspaceChatPage() {
	const { tenant } = useTenant();
	const params = useParams();
	const workspaceId = params.workspaceId as string;

	const [messages, setMessages] = useState<Message[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, isSubmitting]);

	const handleSendMessage = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!inputValue.trim() || isSubmitting) return;

		const userMessage: Message = {
			role: "user",
			content: inputValue,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInputValue("");
		setIsSubmitting(true);

		try {
			const response = await platformApi.ragQuery(tenant, {
				workspace_id: workspaceId,
				knowledge_dataset_id: workspaceId,
				query: userMessage.content,
			});

			const botMessage: Message = {
				role: "assistant",
				content: response.answer,
				sources: response.chunks,
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, botMessage]);
		} catch (error) {
			console.error("Chat error:", error);
			const errorMessage: Message = {
				role: "assistant",
				content: "I encountered an error while processing your request. Please check your connection and try again.",
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsSubmitting(false);
		}
	};

	const clearChat = () => {
		setMessages([]);
	};

	return (
		<WorkspaceGuard>
			<div className="flex flex-col h-[calc(100vh-56px)] bg-slate-50/50">
				{/* Chat Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b bg-white relative z-10 shadow-sm">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-orange-500">
							<MessageSquare size={22} />
						</div>
						<div>
							<h2 className="text-lg font-bold text-slate-900 leading-tight">AI Agent</h2>
							<div className="flex items-center gap-1.5 mt-0.5">
								<div className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
								<span className="text-xs text-orange-500 font-bold uppercase tracking-wider">Active Workspace</span>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							onClick={clearChat}
							className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
							title="Clear conversation"
						>
							<Trash2 size={20} />
						</button>
						<div className="h-4 w-[1px] bg-slate-200 mx-2" />
						<button className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200">
							Settings <ChevronDown size={16} />
						</button>
					</div>
				</div>

				{/* Messages Dashboard */}
				<div
					ref={scrollRef}
					className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
				>
					{messages.length === 0 ? (
						<div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-6 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
							<div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-blue-50 flex items-center justify-center text-orange-400 shadow-xl shadow-orange-400/10">
								<Sparkles size={40} className="animate-pulse" />
							</div>
							<div className="space-y-2">
								<h3 className="text-2xl font-bold text-slate-900">How can I help you today?</h3>
								<p className="text-slate-500 text-lg">
									Ask me anything about your documents, model parameters, or workspace configuration.
								</p>
							</div>
							<div className="grid grid-cols-2 gap-3 w-full">
								{["Summarize recent logs", "Check RAG strategy", "List active documents", "Model availability"].map((suggestion) => (
									<button
										key={suggestion}
										onClick={() => {
											setInputValue(suggestion);
										}}
										className="p-3 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-orange-400 hover:text-orange-500 hover:bg-emerald-50/50 transition-all text-left group"
									>
										<div className="flex items-center justify-between">
											{suggestion}
											<ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
										</div>
									</button>
								))}
							</div>
						</div>
					) : (
						<div className="max-w-4xl mx-auto w-full space-y-8">
							{messages.map((msg, idx) => (
								<div
									key={idx}
									className={cn(
										"flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
										msg.role === "assistant" ? "flex-row" : "flex-row-reverse"
									)}
								>
									<div className={cn(
										"h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105",
										msg.role === "assistant" ? "bg-slate-900 text-[#e5e5e5]" : "bg-orange-500 text-[#e5e5e5]"
									)}>
										{msg.role === "assistant" ? <Bot size={22} /> : <User size={22} />}
									</div>

									<div className={cn(
										"flex flex-col max-w-[85%] space-y-2",
										msg.role === "user" ? "items-end" : "items-start"
									)}>
										<div className={cn(
											"p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm border",
											msg.role === "assistant"
												? "bg-white text-slate-800 border-slate-100"
												: "bg-orange-500 text-[#e5e5e5] border-orange-400"
										)}>
											{msg.content}
										</div>

										{msg.sources && msg.sources.length > 0 && (
											<div className="flex flex-wrap gap-2 mt-3">
												{msg.sources.map((source, sIdx) => (
													<div
														key={sIdx}
														className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-200 cursor-pointer transition-colors"
													>
														<FileText size={14} className="text-slate-400" />
														{source.document_title || "Document Source"}
													</div>
												))}
											</div>
										)}

										<span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 px-1">
											{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
										</span>
									</div>
								</div>
							))}
							{isSubmitting && (
								<div className="flex gap-4 animate-pulse">
									<div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-[#e5e5e5]">
										<Bot size={22} />
									</div>
									<div className="flex flex-col items-start gap-2">
										<div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3">
											<div className="flex gap-1">
												<div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
												<div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
												<div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-bounce" />
											</div>
											<span className="text-sm font-medium text-slate-400 italic">Thinking...</span>
										</div>
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Input Dock */}
				<div className="p-6 bg-transparent">
					<div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/50 p-1 relative group focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-400/5 transition-all">
						<form onSubmit={handleSendMessage} className="flex items-center gap-2">
							<div className="p-3 text-slate-400 group-focus-within:text-orange-400 transition-colors">
								<Search size={20} />
							</div>
							<input
								type="text"
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								placeholder="Type your message here..."
								className="flex-1 py-3 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
								disabled={isSubmitting}
							/>
							<button
								type="submit"
								disabled={isSubmitting || !inputValue.trim()}
								className={cn(
									"p-3 rounded-xl transition-all active:scale-[0.98] mr-1 shadow-lg",
									inputValue.trim()
										? "bg-slate-900 text-[#e5e5e5] hover:bg-slate-800 shadow-slate-900/10"
										: "bg-slate-100 text-slate-400"
								)}
							>
								{isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
							</button>
						</form>
					</div>
					<p className="text-[10px] text-center mt-3 text-slate-400 font-bold uppercase tracking-[0.2em]">
						Karag AI may display inaccurate info · Grounded by Workspace RAG pipeline
					</p>
				</div>
			</div>
		</WorkspaceGuard>
	);
}

function ArrowRight({ size, className }: { size?: number, className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size || 24}
			height={size || 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M5 12h14" />
			<path d="m12 5 7 7-7 7" />
		</svg>
	)
}
