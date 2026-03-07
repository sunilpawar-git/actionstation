/** Cluster types — data model for AI-powered node grouping */

export interface ClusterGroup {
    readonly id: string;
    readonly nodeIds: readonly string[];
    readonly label: string;
    readonly colorIndex: number; // 0-7, indexes into CSS variable palette
}

export interface ClusterBounds {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

