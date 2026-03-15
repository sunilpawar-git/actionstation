/**
 * Node Model - Type definitions for canvas nodes
 */
import type { CalendarEventMetadata } from '@/features/calendar/types/calendarEvent';
import type { AttachmentMeta } from './document';
import type { ContentMode } from './contentMode';

/**
 * Node dimension constraints (in pixels)
 * SSOT: These constants are the single source of truth for node sizing
 * @see nodeDimensionSync.test.ts - Automated test validates CSS/TS sync
 */
export const MIN_NODE_WIDTH = 180;
export const MAX_NODE_WIDTH = 900;
export const MIN_NODE_HEIGHT = 100;
export const MAX_NODE_HEIGHT = 800;

export const DEFAULT_NODE_WIDTH = 280;
export const DEFAULT_NODE_HEIGHT = 220;

/** Minimum width for mindmap rendering — equals DEFAULT_NODE_WIDTH so toggling
 *  to mindmap mode keeps the node the same size as its neighbours, giving an
 *  even tile grid. markmap's autoFit scales the SVG to fill any container. */
export const MINDMAP_MIN_WIDTH = DEFAULT_NODE_WIDTH;
/** Minimum height for mindmap rendering — equals DEFAULT_NODE_HEIGHT. */
export const MINDMAP_MIN_HEIGHT = DEFAULT_NODE_HEIGHT;

/** Resize increment per arrow click (96px = 1 CSS inch = 6 grid snaps) */
export const RESIZE_INCREMENT_PX = 96;

/**
 * Clamp dimensions to valid bounds
 * Pure utility function for dimension validation
 */
export function clampNodeDimensions(
    width: number,
    height: number
): { width: number; height: number } {
    return {
        width: Math.max(MIN_NODE_WIDTH, Math.min(MAX_NODE_WIDTH, width)),
        height: Math.max(MIN_NODE_HEIGHT, Math.min(MAX_NODE_HEIGHT, height)),
    };
}

/**
 * Node types - 'idea' is the primary type for IdeaCard nodes
 */
export type NodeType = 'idea' | 'media';

export const NODE_COLOR_KEYS = ['default', 'danger', 'warning', 'success', 'synthesis'] as const;
export type NodeColorKey = (typeof NODE_COLOR_KEYS)[number];

/** Maps legacy Firestore keys to current keys (backward compatibility) */
const LEGACY_COLOR_MAP: Record<string, NodeColorKey> = { primary: 'danger' };

export function normalizeNodeColorKey(value: unknown): NodeColorKey {
    if (typeof value !== 'string') return 'default';
    const mapped = LEGACY_COLOR_MAP[value];
    if (mapped) return mapped;
    return (NODE_COLOR_KEYS as readonly string[]).includes(value) ? (value as NodeColorKey) : 'default';
}

export interface NodePosition {
    x: number;
    y: number;
}

/**
 * Input mode for IdeaCard (note = plain text, ai = AI prompt)
 * Re-exported from slashCommand.ts for convenience
 */
export type { InputMode } from './slashCommand';

/**
 * Metadata fetched from a URL for rich link preview cards
 * Parsed from Open Graph and Twitter Card meta tags
 */
export interface LinkPreviewMetadata {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    favicon?: string;
    domain?: string;
    cardType?: 'summary' | 'summary_large_image' | 'player' | 'app';
    fetchedAt: number;
    error?: boolean;
}

/**
 * Data structure for IdeaCard nodes (unified prompt + output)
 */
export interface IdeaNodeData {
    heading?: string;
    /** @deprecated Legacy field — heading is SSOT for prompts. Kept for backward compatibility. */
    prompt?: string;
    output?: string;
    isGenerating?: boolean;
    isPromptCollapsed?: boolean;
    /** Prevents drag when true (Phase 5: NodeUX) */
    isPinned?: boolean;
    /** Shows only heading when true (Phase 5: NodeUX) */
    isCollapsed?: boolean;
    tags?: string[];
    linkPreviews?: Record<string, LinkPreviewMetadata>;
    calendarEvent?: CalendarEventMetadata;
    colorKey?: NodeColorKey;
    /** Opts this node into the AI Canvas Memory pool */
    includeInAIPool?: boolean;
    /** Attached documents (PDFs, CSVs, etc.) — lightweight metadata only */
    attachments?: AttachmentMeta[];
    /** IDs of source nodes used to produce this synthesis (enables re-synthesis) */
    synthesisSourceIds?: string[];
    /** Synthesis mode used to create this node */
    synthesisMode?: string;
    /** Rendering mode: 'text' (default) or 'mindmap'. Undefined treated as 'text'. */
    contentMode?: ContentMode;
    [key: string]: unknown;
}

/**
 * SSOT check for whether a node is pinned.
 * Defensive: handles missing/null data gracefully (e.g., legacy Firestore docs).
 */
export function isNodePinned(node: CanvasNode | { data?: IdeaNodeData | null }): boolean {
    if (!node.data) {
        return false;
    }
    return node.data.isPinned === true;
}

export interface CanvasNode {
    id: string;
    workspaceId: string;
    /** Denormalized for auditability — path-based auth is primary */
    userId?: string;
    type: NodeType;
    data: IdeaNodeData;
    position: NodePosition;
    width?: number;
    height?: number;
    createdAt: Date;
    updatedAt: Date;
    /** Schema version for forward-compatible migrations */
    schemaVersion?: number;
    /** Spatial tile ID derived from position (e.g. 'tile_3_4') */
    tileId?: string;
}

/**
 * Create a unified IdeaCard node (prompt + output in one)
 * Returns node with default dimensions for consistent sizing
 */
export function createIdeaNode(
    id: string,
    workspaceId: string,
    position: NodePosition,
    prompt = ''
): CanvasNode {
    const now = new Date();
    return {
        id,
        workspaceId,
        type: 'idea',
        data: {
            heading: '',
            ...(prompt ? { prompt } : {}),
            output: undefined,
            isGenerating: false,
            isPromptCollapsed: false,
            isPinned: false,
            isCollapsed: false,
            colorKey: 'default',
        },
        position,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
        createdAt: now,
        updatedAt: now,
    };
}

