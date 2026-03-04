/**
 * Search Types - Type definitions for search functionality
 */

export interface SearchResult {
    nodeId: string;
    workspaceId: string;
    workspaceName: string;
    matchedContent: string;
    matchType: 'heading' | 'prompt' | 'output';
    relevance: number;
}

