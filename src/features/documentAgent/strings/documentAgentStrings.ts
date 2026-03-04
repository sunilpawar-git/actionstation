/**
 * Document Agent Strings — all user-facing text for the document intelligence feature.
 * Registered in strings.ts as strings.documentAgent.
 */
export const documentAgentStrings = {
    analyzing: 'Analyzing document...',
    analysisComplete: 'Document analysis complete',
    analysisFailed: 'Could not analyze document',
    insightHeading: 'Document Insight',
    summarySection: 'Summary',
    keyFactsSection: 'Key Facts',
    actionItemsSection: 'Action Items',
    questionsSection: 'Questions to Consider',
    confidenceFooterHigh: 'Auto-analyzed · High confidence',
    confidenceFooterMedium: 'Auto-analyzed · Medium confidence — verify details',
    confidenceFooterLow: 'Auto-analyzed · Low confidence — review carefully',
    autoAnalyzeSetting: 'Auto-analyze documents',
    autoAnalyzeDescription: 'Automatically extract insights when documents are uploaded',
    expandedToNodes: 'Expanded insight into separate nodes',
    extendedFactsSection: 'Details',
    noAttachment: 'No document attached to this card',
    cachedResult: 'Using cached analysis (less than 24h old)',
    reanalyzing: 'Re-analyzing document...',
    queuedForOnline: 'Analysis queued — will run when back online',
    offlineUnavailable: 'Document analysis requires an internet connection',
    crossRefHeading: 'Cross-Document Insight',
    crossRefConnections: 'Connections',
    crossRefContradictions: 'Contradictions',
    crossRefActionItems: 'Suggested Actions',
    crossRefRelated: 'Related Documents',
    crossRefFound: 'Found connections with existing documents',
    crossRefNone: 'No cross-document connections found',
    aggregationHeading: 'Document Summary',
} as const;
