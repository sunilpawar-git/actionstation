/** Localized strings for clustering feature */
export const clusterStrings = {
    labels: {
        cluster: 'Cluster',
        suggestClusters: 'Find themes',
        accept: 'Accept',
        dismiss: 'Dismiss',
        clearClusters: 'Clear themes',
        analyzing: 'Analyzing themes...',
        noThemes: 'No clear themes detected',
        clusterError: 'Failed to analyze themes. Please try again.',
        unclustered: 'Unclustered',
        foundThemes: (count: number) =>
            `Found ${count} theme${count !== 1 ? 's' : ''}`,
    },
    prompts: {
        labelInstruction:
            'You are labeling groups of related ideas. For each numbered group below, provide a short label (2-4 words) that describes the common theme. Return ONLY the labels, one per line, in order.',
        groupPrefix: 'Group',
    },
} as const;
