"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Link as LinkIcon, ExternalLink } from "lucide-react";

export interface Document {
    id: string;
    name: string;
    source?: string;
    created_at: string;
    status?: string;
    [key: string]: string | undefined;
}

interface DocumentListProps {
    documents: Document[];
    onDelete?: (id: string) => void;
    onAttach?: (id: string) => void;
    onDetach?: (id: string) => void;
    showAttach?: boolean;
    showDetach?: boolean;
    showDelete?: boolean;
}

export function DocumentList({
    documents = [],
    onDelete,
    onAttach,
    onDetach,
    showAttach,
    showDetach,
    showDelete
}: DocumentListProps) {
    if (!documents || documents.length === 0) {
        return (
            <div className="text-center py-12 border rounded-lg bg-muted/50 border-dashed">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">No documents found</h3>
            </div>
        );
    }

    return (
        <div className="flex flex-col border border-white/5 rounded-2xl bg-white/[0.02] overflow-hidden">
            {documents.map((doc, idx) => (
                <div
                    key={doc.id}
                    className={cn(
                        "flex items-center justify-between p-5 transition-all hover:bg-white/[0.04] group",
                        idx !== 0 && "border-t border-white/5"
                    )}
                >
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/10 group-hover:scale-110 transition-transform duration-300">
                            <FileText className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-gray-200 truncate group-hover:text-white transition-colors tracking-tight">{doc.name}</h4>
                            <div className="flex items-center gap-2 text-tiny font-bold text-gray-500 mt-1">
                                <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Unknown date"}</span>
                                {doc.source && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <span className="truncate max-w-[200px]">{doc.source}</span>
                                    </>
                                )}
                                {doc.status && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                        <span className={cn(
                                            "uppercase tracking-widest text-[10px]",
                                            doc.status === "processing" || doc.status === "indexing" ? "text-blue-500 animate-pulse" :
                                                doc.status === "failed" ? "text-red-500" :
                                                    "text-emerald-500"
                                        )}>
                                            {doc.status}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {showAttach && onAttach && (
                            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-400 text-gray-500 transition-all font-bold text-tiny uppercase tracking-widest" onClick={() => onAttach(doc.id)}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Attach
                            </Button>
                        )}
                        {showDetach && onDetach && (
                            <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl hover:bg-amber-500/10 hover:text-amber-400 text-gray-500 transition-all font-bold text-tiny uppercase tracking-widest" onClick={() => onDetach(doc.id)}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Detach
                            </Button>
                        )}
                        {showDelete && onDelete && (
                            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all" onClick={() => onDelete(doc.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
