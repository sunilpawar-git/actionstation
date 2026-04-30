/**
 * Shared Zod validation schemas
 * Defines input contracts for all user-facing forms that write to Firestore.
 */
import { z } from 'zod';
import { KB_MAX_CONTENT_SIZE } from '@/features/knowledgeBank/types/knowledgeBank';

// ── Knowledge Bank ────────────────────────────────────────────────────────────

export const kbEntrySchema = z.object({
    title: z
        .string()
        .min(1, 'Title is required')
        .max(100, 'Title must be 100 characters or fewer')
        .transform((v) => v.trim()),
    content: z
        .string()
        .min(1, 'Content is required')
        .max(KB_MAX_CONTENT_SIZE, `Content must be ${KB_MAX_CONTENT_SIZE.toLocaleString()} characters or fewer`),
});

export type KbEntryInput = z.input<typeof kbEntrySchema>;
export type KbEntryOutput = z.output<typeof kbEntrySchema>;

// ── Tags ──────────────────────────────────────────────────────────────────────

export const tagNameSchema = z
    .string()
    .min(1, 'Tag name is required')
    .max(50, 'Tag name must be 50 characters or fewer')
    .regex(/^[^\s].*[^\s]$|^[^\s]$/, 'Tag name must not start or end with a space')
    .transform((v) => v.trim());

// ── Templates ────────────────────────────────────────────────────────────────

export const templateNameSchema = z
    .string()
    .min(1, 'Template name is required')
    .max(50, 'Template name must be 50 characters or fewer')
    .regex(/^[^\s].*[^\s]$|^[^\s]$/, 'Template name must not start or end with a space')
    .transform((v) => v.trim());

// ── Workspace ─────────────────────────────────────────────────────────────────

export const workspaceNameSchema = z
    .string()
    .min(1, 'Name is required')
    .max(80, 'Workspace name must be 80 characters or fewer')
    .transform((v) => v.trim());
