"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Link as LinkIcon, ExternalLink } from "lucide-react";

export interface Document {
    id: string;
    name: string;
    source?: string;
    created_at: string;
    [key: string]: any;
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
        <div className="grid gap-2">
            {documents.map((doc) => (
                <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-background hover:bg-muted/20 transition-colors"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-primary/10 rounded-md">
                            <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-medium truncate">{doc.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mr-4">
                                <span>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Unknown date"}</span>
                                {doc.source && (
                                    <>
                                        <span>•</span>
                                        <span className="truncate max-w-[200px]">{doc.source}</span>
                                    </>
                                )}
                                {doc.status && (
                                    <>
                                        <span>•</span>
                                        <span className={cn(
                                            "font-medium",
                                            doc.status === "processing" ? "text-blue-500 animate-pulse" :
                                                doc.status === "failed" ? "text-destructive" :
                                                    "text-green-500"
                                        )}>
                                            {doc.status}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {showAttach && onAttach && (
                            <Button variant="outline" size="sm" onClick={() => onAttach(doc.id)}>
                                <LinkIcon className="w-4 h-4 mr-2" />
                                Attach
                            </Button>
                        )}
                        {showDetach && onDetach && (
                            <Button variant="outline" size="sm" onClick={() => onDetach(doc.id)}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Detach
                            </Button>
                        )}
                        {showDelete && onDelete && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(doc.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
