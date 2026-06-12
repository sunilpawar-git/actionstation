/**
 * customTemplateService — Firestore CRUD for user-defined workspace templates.
 * Path: users/{userId}/templates/{templateId}
 * All reads are Zod-validated before returning to callers.
 */
import { collection, doc, getDocs, setDoc, deleteDoc, query, limit } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { logger } from '@/shared/services/logger';
import { templateNameSchema } from '@/shared/validation/schemas';
import { workspaceTemplateSchema } from './templateSchemas';
import { templateStrings } from '../strings/templateStrings';
import { MAX_CUSTOM_TEMPLATES } from '../types/template';
import type { WorkspaceTemplate, TemplateNode, TemplateEdge } from '../types/template';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { CanvasEdge } from '@/features/canvas/types/edge';

function templatesCollection(userId: string) {
    return collection(db, 'users', userId, 'templates');
}

function toTemplateNode(node: CanvasNode): TemplateNode {
    const { id, position, data } = node;
    return {
        templateId: id,
        heading: data.heading ?? '',
        output: data.output ?? '',
        position,
        colorKey: data.colorKey ?? 'default',
    };
}

function toTemplateEdge(edge: CanvasEdge): TemplateEdge {
    return {
        sourceTemplateId: edge.sourceNodeId,
        targetTemplateId: edge.targetNodeId,
    };
}

export async function saveTemplate(
    userId: string,
    rawName: string,
    nodes: CanvasNode[],
    edges: CanvasEdge[],
): Promise<WorkspaceTemplate> {
    const name = templateNameSchema.parse(rawName.trim());

    if (nodes.length === 0) {
        throw new Error(templateStrings.errors.emptyCanvas);
    }

    const existing = await getCustomTemplates(userId);
    if (existing.length >= MAX_CUSTOM_TEMPLATES) {
        throw new Error(templateStrings.errors.maxTemplatesReached);
    }

    const id = `tpl-${crypto.randomUUID()}`;
    const template: WorkspaceTemplate = {
        id,
        name,
        description: '',
        category: 'custom',
        isCustom: true,
        nodes: nodes.map(toTemplateNode),
        edges: edges.map(toTemplateEdge),
    };

    const ref = doc(templatesCollection(userId), id);
    await setDoc(ref, template);
    return template;
}

export async function getCustomTemplates(userId: string): Promise<WorkspaceTemplate[]> {
    const q = query(templatesCollection(userId), limit(MAX_CUSTOM_TEMPLATES));
    const snap = await getDocs(q);
    const results: WorkspaceTemplate[] = [];

    for (const docSnap of snap.docs) {
        const raw = docSnap.data();
        const parsed = workspaceTemplateSchema.safeParse(raw);
        if (parsed.success) {
            results.push(parsed.data as WorkspaceTemplate);
        } else {
            logger.warn('[customTemplateService] Skipping invalid template doc', { id: docSnap.id });
        }
    }

    return results;
}

export async function deleteCustomTemplate(userId: string, templateId: string): Promise<void> {
    const ref = doc(templatesCollection(userId), templateId);
    await deleteDoc(ref);
}
