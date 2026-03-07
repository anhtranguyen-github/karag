import { z } from 'zod';

export const SearchResultItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    workspace_id: z.string().optional(),
    description: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    extension: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
}).passthrough();

export const SearchResultsSchema = z.object({
    workspaces: z.array(SearchResultItemSchema),
    threads: z.array(SearchResultItemSchema),
    documents: z.array(SearchResultItemSchema),
});

export type SearchResults = z.infer<typeof SearchResultsSchema>;
