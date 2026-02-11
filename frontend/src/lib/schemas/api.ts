import { z } from 'zod';

/**
 * Generic API response wrapper schema.
 * Matches `backend/app/schemas/base.py`:
 * {
 *   success: boolean,
 *   code: string,
 *   message: string,
 *   data: T | null
 * }
 */
export const AppResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
        success: z.boolean(),
        code: z.string(),
        message: z.string(),
        data: dataSchema.nullable().optional(),
    });

export type AppResponse<T> = {
    success: boolean;
    code: string;
    message: string;
    data: T | null | undefined;
};
