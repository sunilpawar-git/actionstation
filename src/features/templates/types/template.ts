/**
 * Template Types — type definitions for workspace templates
 */
import type { NodeColorKey } from '@/features/canvas/types/node';

export interface WorkspaceTemplate {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly category: TemplateCategory;
    readonly nodes: TemplateNode[];
    readonly edges: TemplateEdge[];
    readonly isCustom: boolean;
}

export type TemplateCategory = 'basb' | 'project' | 'creative' | 'research' | 'custom';

export interface TemplateNode {
    readonly templateId: string;
    readonly heading: string;
    readonly output: string;
    readonly position: { readonly x: number; readonly y: number };
    readonly colorKey: NodeColorKey;
}

export interface TemplateEdge {
    readonly sourceTemplateId: string;
    readonly targetTemplateId: string;
}

export const MAX_CUSTOM_TEMPLATES = 10;
export const VALID_CATEGORIES: TemplateCategory[] = [
    'basb', 'project', 'creative', 'research', 'custom',
];
