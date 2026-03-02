/**
 * NodePoolBuilder — Pure functions for building AI context from pooled nodes
 * Filters pooled nodes, converts to entries, ranks by relevance, formats context.
 * No side effects, no store access, no API calls.
 */
import type { CanvasNode } from '@/features/canvas/types/node';
import type { Workspace } from '@/features/workspace/types/workspace';
import type { NodePoolEntry, NodePoolGenerationType } from '../types/nodePool';
import { NODE_POOL_TOKEN_BUDGETS, NODE_POOL_CHARS_PER_TOKEN } from '../types/nodePool';
import { nodePoolStrings } from '@/shared/localization/nodePoolStrings';
import { NodePoolCache } from './nodePoolCache';
import { tokenize, scoreEntry } from '@/features/knowledgeBank/services/relevanceScorer';

const sharedCache = new NodePoolCache();

/** Cap for entries before expensive TF-IDF ranking. Pre-filter by keyword score. */
const MAX_ENTRIES_FOR_RANKING = 100;

/**
 * Filter canvas nodes to those included in the AI Memory pool.
 * When workspace.includeAllNodesInPool is true, all nodes qualify.
 * Otherwise only individually starred nodes are included.
 * Nodes in excludeNodeIds are always filtered out (upstream chain + self).
 */
export function getPooledNodes(
    nodes: readonly CanvasNode[],
    workspace: Workspace | null,
    excludeNodeIds: ReadonlySet<string>
): CanvasNode[] {
    const useAll = workspace?.includeAllNodesInPool === true;

    return nodes.filter((n) => {
        if (excludeNodeIds.has(n.id)) return false;
        return useAll || n.data.includeInAIPool === true;
    });
}

/** Convert a CanvasNode into a NodePoolEntry for ranking and context */
export function nodeToPoolEntry(node: CanvasNode): NodePoolEntry {
    const heading = node.data.heading?.trim() ?? '';
    const output = node.data.output?.trim() ?? '';
    const title = heading.length > 0 ? heading : nodePoolStrings.untitled;

    let content: string;
    if (output && heading) {
        content = `${heading}\n\n${output}`;
    } else {
        content = output.length > 0 ? output : heading;
    }

    const tags: string[] = Array.isArray(node.data.tags) ? node.data.tags : [];

    return { id: node.id, title, content, tags };
}

/**
 * Build the full node pool context string for AI prompt injection.
 * 1. Filters pooled nodes (excluding self + upstream chain)
 * 2. Converts to entries
 * 3. Ranks by relevance using memoized TF-IDF corpus
 * 4. Formats within token budget
 * Returns empty string if no pooled nodes qualify.
 */
export function buildNodePoolContext(
    nodes: readonly CanvasNode[],
    workspace: Workspace | null,
    prompt: string,
    generationType: NodePoolGenerationType,
    excludeNodeIds: ReadonlySet<string>
): string {
    const pooled = getPooledNodes(nodes, workspace, excludeNodeIds);
    if (pooled.length === 0) return '';

    let entries = pooled.map(nodeToPoolEntry);

    if (entries.length > MAX_ENTRIES_FOR_RANKING) {
        const keywords = tokenize(prompt);
        if (keywords.length > 0) {
            const scored = entries.map((e, i) => ({ e, s: scoreEntry(e, keywords), i }));
            scored.sort((a, b) => b.s !== a.s ? b.s - a.s : a.i - b.i);
            entries = scored.slice(0, MAX_ENTRIES_FOR_RANKING).map((x) => x.e);
        } else {
            entries = entries.slice(0, MAX_ENTRIES_FOR_RANKING);
        }
    }

    const ranked = sharedCache.rankEntries(entries, prompt);

    const maxChars = NODE_POOL_TOKEN_BUDGETS[generationType] * NODE_POOL_CHARS_PER_TOKEN;
    let budget = maxChars;
    const parts: string[] = [];

    for (const entry of ranked) {
        const block = `[Memory: ${entry.title}]\n${entry.content}`;
        if (budget - block.length < 0) break;
        parts.push(block);
        budget -= block.length;
    }

    if (parts.length === 0) return '';

    return `${nodePoolStrings.contextHeader}\n${parts.join('\n\n')}\n${nodePoolStrings.contextFooter}`;
}
