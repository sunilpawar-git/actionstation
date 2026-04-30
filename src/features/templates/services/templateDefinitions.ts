/**
 * Built-in template definitions — 5 rich workspace starting points.
 * Each template has 8+ nodes with sample content and semantic edges.
 */
import type { TemplateNode, TemplateEdge, WorkspaceTemplate } from '../types/template';
import type { NodeColorKey } from '@/features/canvas/types/node';
import { templateStrings as s } from '../strings/templateStrings';

const n = (
    id: string,
    heading: string,
    output: string,
    x: number,
    y: number,
    colorKey: NodeColorKey = 'default',
): TemplateNode => ({ templateId: id, heading, output, position: { x, y }, colorKey });

const e = (src: string, tgt: string): TemplateEdge =>
    ({ sourceTemplateId: src, targetTemplateId: tgt });

export const BUILT_IN_TEMPLATES: readonly WorkspaceTemplate[] = [
    {
        id: 'basb-code',
        name: s.basb.name,
        description: s.basb.description,
        category: 'basb',
        isCustom: false,
        nodes: [
            n('n1', s.basb.captureHeading,         s.basb.captureOutput,         0,    0,   'success'),
            n('n2', s.basb.captureRefHeading,       s.basb.captureRefOutput,      400,  0,   'success'),
            n('n3', s.basb.organizeProjectsHeading, s.basb.organizeProjectsOutput, 0,   320, 'warning'),
            n('n4', s.basb.organizeAreasHeading,    s.basb.organizeAreasOutput,   400,  320, 'warning'),
            n('n5', s.basb.distillInsightsHeading,  s.basb.distillInsightsOutput,  0,   640, 'synthesis'),
            n('n6', s.basb.distillQuestionsHeading, s.basb.distillQuestionsOutput, 400,  640, 'synthesis'),
            n('n7', s.basb.expressNowHeading,       s.basb.expressNowOutput,       0,   960, 'default'),
            n('n8', s.basb.expressNextHeading,      s.basb.expressNextOutput,      400,  960, 'default'),
        ],
        edges: [
            e('n1', 'n3'), e('n2', 'n4'),
            e('n3', 'n5'), e('n4', 'n6'),
            e('n5', 'n7'), e('n6', 'n8'),
        ],
    },
    {
        id: 'project-kickoff',
        name: s.project.name,
        description: s.project.description,
        category: 'project',
        isCustom: false,
        nodes: [
            n('n1', s.project.goalHeading,         s.project.goalOutput,         400,  160, 'warning'),
            n('n2', s.project.scopeInHeading,      s.project.scopeInOutput,       0,    0,  'success'),
            n('n3', s.project.scopeOutHeading,     s.project.scopeOutOutput,      800,  0,  'danger'),
            n('n4', s.project.timelineHeading,     s.project.timelineOutput,      0,   320, 'default'),
            n('n5', s.project.risksHeading,        s.project.risksOutput,         800, 320, 'danger'),
            n('n6', s.project.resourcesHeading,    s.project.resourcesOutput,     0,   640, 'default'),
            n('n7', s.project.stakeholdersHeading, s.project.stakeholdersOutput,  800, 640, 'default'),
            n('n8', s.project.questionsHeading,    s.project.questionsOutput,     400, 480, 'synthesis'),
        ],
        edges: [
            e('n1', 'n2'), e('n1', 'n3'), e('n1', 'n4'),
            e('n1', 'n5'), e('n1', 'n6'), e('n1', 'n7'), e('n1', 'n8'),
        ],
    },
    {
        id: 'research-canvas',
        name: s.research.name,
        description: s.research.description,
        category: 'research',
        isCustom: false,
        nodes: [
            n('n1', s.research.questionHeading, s.research.questionOutput,  400,   0, 'warning'),
            n('n2', s.research.sub1Heading,     s.research.sub1Output,        0, 320, 'default'),
            n('n3', s.research.sub2Heading,     s.research.sub2Output,      400, 320, 'default'),
            n('n4', s.research.sub3Heading,     s.research.sub3Output,      800, 320, 'default'),
            n('n5', s.research.evAHeading,      s.research.evAOutput,         0, 640, 'success'),
            n('n6', s.research.evBHeading,      s.research.evBOutput,       400, 640, 'success'),
            n('n7', s.research.evCHeading,      s.research.evCOutput,       800, 640, 'success'),
            n('n8', s.research.synthesisHeading, s.research.synthesisOutput, 400, 960, 'synthesis'),
        ],
        edges: [
            e('n1', 'n2'), e('n1', 'n3'), e('n1', 'n4'),
            e('n2', 'n5'), e('n3', 'n6'), e('n4', 'n7'),
            e('n5', 'n8'), e('n6', 'n8'), e('n7', 'n8'),
        ],
    },
    {
        id: 'brainstorm',
        name: s.brainstorm.name,
        description: s.brainstorm.description,
        category: 'creative',
        isCustom: false,
        nodes: [
            n('n1', s.brainstorm.ideaHeading.replace('{n}', '1'), s.brainstorm.ideaOutput,    0,   0),
            n('n2', s.brainstorm.ideaHeading.replace('{n}', '2'), s.brainstorm.ideaOutput,  400,   0),
            n('n3', s.brainstorm.ideaHeading.replace('{n}', '3'), s.brainstorm.ideaOutput,  800,   0),
            n('n4', s.brainstorm.ideaHeading.replace('{n}', '4'), s.brainstorm.ideaOutput, 1200,   0),
            n('n5', s.brainstorm.ideaHeading.replace('{n}', '5'), s.brainstorm.ideaOutput,    0, 320),
            n('n6', s.brainstorm.ideaHeading.replace('{n}', '6'), s.brainstorm.ideaOutput,  400, 320),
            n('n7', s.brainstorm.ideaHeading.replace('{n}', '7'), s.brainstorm.ideaOutput,  800, 320),
            n('n8', s.brainstorm.ideaHeading.replace('{n}', '8'), s.brainstorm.ideaOutput, 1200, 320),
        ],
        edges: [],
    },
    {
        id: 'weekly-review',
        name: s.review.name,
        description: s.review.description,
        category: 'basb',
        isCustom: false,
        nodes: [
            n('n1', s.review.happenedHeading, s.review.happenedOutput,   0,   0, 'default'),
            n('n2', s.review.winsHeading,     s.review.winsOutput,     400,   0, 'success'),
            n('n3', s.review.strugglesHeading, s.review.strugglesOutput, 800, 0, 'danger'),
            n('n4', s.review.learnedHeading,  s.review.learnedOutput,  1200,  0, 'default'),
            n('n5', s.review.openLoopsHeading, s.review.openLoopsOutput,   0, 320, 'warning'),
            n('n6', s.review.nextHeading,     s.review.nextOutput,      400, 320, 'default'),
            n('n7', s.review.actionsHeading,  s.review.actionsOutput,   800, 320, 'success'),
            n('n8', s.review.energyHeading,   s.review.energyOutput,   1200, 320, 'default'),
        ],
        edges: [
            e('n1', 'n2'), e('n1', 'n3'), e('n2', 'n6'),
            e('n3', 'n6'), e('n4', 'n6'), e('n5', 'n6'),
            e('n6', 'n7'),
        ],
    },
] as const;
