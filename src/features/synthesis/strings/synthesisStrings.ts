export const synthesisStrings = {
    modes: {
        summarize: 'Summarize',
        outline: 'Outline',
        narrative: 'Narrative',
        questions: 'Find Gaps',
    },
    modeDescriptions: {
        summarize: 'Distill into a concise summary',
        outline: 'Create a structured outline',
        narrative: 'Write a cohesive document',
        questions: 'Identify gaps and open questions',
    },
    labels: {
        synthesisOf: 'Synthesis of',
        ideas: 'ideas',
        viewSources: (count: number) => `View ${count} sources`,
        selectNodes: 'Select connected nodes to synthesize',
        synthesize: 'Synthesize',
        reSynthesize: 'Re-synthesize',
        highlightSources: 'Highlight source ideas',
        generating: 'Synthesizing...',
        noSelection: 'Select 2 or more connected nodes',
        tooManyNodes: 'Select fewer than 50 nodes for best results',
    },
    prompts: {
        summarizeInstruction:
            'Distill the following connected ideas into a concise, well-structured summary. Preserve key insights and their relationships.',
        outlineInstruction:
            'Create a structured outline from these connected ideas. Use the hierarchy (parent → child) to determine section nesting. Each idea becomes a section or subsection.',
        narrativeInstruction:
            'Write a coherent, flowing document that synthesizes these connected ideas into a unified argument or explanation. Use transitions between sections. The document should read as a single authored piece, not a list of separate ideas.',
        questionsInstruction:
            'Analyze the following connected ideas and identify what is MISSING. What questions remain unanswered? What assumptions are untested? What gaps exist in the reasoning? Return a numbered list of open questions and gaps, grouped by theme.',
        contextPrefix:
            'The user has built a visual canvas of connected ideas. The ideas are listed below in topological order (parents before children). Indentation indicates depth — deeper ideas elaborate on their parent.',
        nodeTemplate: 'Idea',
        depthLabel: 'depth',
        childrenNote: 'elaborates on',
    },
} as const;
