/** Cluster Label Service — AI-powered labeling via single batched Gemini call */
import { callGemini, extractGeminiText } from '@/features/knowledgeBank/services/geminiClient';
import type { GeminiRequestBody } from '@/features/knowledgeBank/services/geminiClient';
import { clusterStrings } from '@/shared/localization/clusterStrings';
import type { CanvasNode } from '@/features/canvas/types/node';
import type { ClusterGroup } from '../types/cluster';
import { HTML_TAG_RE } from '@/shared/utils/htmlUtils';

const MAX_HEADINGS_PER_CLUSTER = 5;
const MAX_CLUSTERS_TO_LABEL = 10;
const MAX_LABEL_LENGTH = 40;
const MAX_HEADING_LENGTH = 80;

function sanitizeLabel(raw: string): string {
    return raw.replace(HTML_TAG_RE, '').replace(/^\d+[.)]\s*/, '').trim().slice(0, MAX_LABEL_LENGTH);
}

function buildPrompt(clusters: readonly ClusterGroup[], nodes: readonly CanvasNode[]): string {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const lines = [clusterStrings.prompts.labelInstruction, ''];

    for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        if (!cluster) continue;
        lines.push(`${clusterStrings.prompts.groupPrefix} ${i + 1}:`);
        const headings = cluster.nodeIds
            .slice(0, MAX_HEADINGS_PER_CLUSTER)
            .map((id) => nodeMap.get(id)?.data.heading ?? '')
            .filter((h) => h.length > 0);
        for (const h of headings) {
            const safe = h.replace(HTML_TAG_RE, '').replace(/["\n\\]/g, '').slice(0, MAX_HEADING_LENGTH);
            if (safe.length > 0) lines.push(`- "${safe}"`);
        }
        lines.push('');
    }
    return lines.join('\n');
}

export async function labelClusters(
    clusters: readonly ClusterGroup[],
    nodes: readonly CanvasNode[],
): Promise<readonly ClusterGroup[]> {
    if (clusters.length === 0) return clusters;

    const toLabelCount = Math.min(clusters.length, MAX_CLUSTERS_TO_LABEL);
    const toLabel = clusters.slice(0, toLabelCount);

    try {
        const body: GeminiRequestBody = {
            contents: [{ parts: [{ text: buildPrompt(toLabel, nodes) }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
        };

        const result = await callGemini(body);
        const text = extractGeminiText(result.data);
        if (!text) return clusters;

        const labels = text.split('\n').map(sanitizeLabel).filter((l) => l.length > 0);

        return clusters.map((cluster, idx) => {
            const newLabel = idx < toLabelCount ? labels[idx] : undefined;
            if (!newLabel) return cluster;
            return { ...cluster, label: newLabel };
        });
    } catch (err: unknown) {
        console.error('[clusterLabelService] AI labeling failed, using default labels:', err);
        return clusters;
    }
}
