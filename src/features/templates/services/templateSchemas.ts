/**
 * Template Schemas — Zod validation schemas for template data.
 * Used when reading custom templates from Firestore to prevent malformed data.
 */
import { z } from 'zod';

const templateNodeSchema = z.object({
    templateId: z.string().min(1).max(128),
    heading: z.string().max(500),
    output: z.string().max(10000),
    position: z.object({ x: z.number(), y: z.number() }),
    colorKey: z.enum(['default', 'danger', 'warning', 'success', 'synthesis']),
});

const templateEdgeSchema = z.object({
    sourceTemplateId: z.string().min(1).max(128),
    targetTemplateId: z.string().min(1).max(128),
});

export const workspaceTemplateSchema = z.object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(50),
    description: z.string().max(500),
    category: z.enum(['basb', 'project', 'creative', 'research', 'custom']),
    isCustom: z.boolean(),
    nodes: z.array(templateNodeSchema).max(50),
    edges: z.array(templateEdgeSchema).max(300),
});

export const customTemplatesSchema = z.array(workspaceTemplateSchema).max(10);

export type ValidatedTemplate = z.infer<typeof workspaceTemplateSchema>;
