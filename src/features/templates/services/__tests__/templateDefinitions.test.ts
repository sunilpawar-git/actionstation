/**
 * TDD: templateDefinitions tests — verifies BUILT_IN_TEMPLATES integrity.
 * Write tests first; implementation follows.
 */
import { describe, it, expect } from 'vitest';
import { BUILT_IN_TEMPLATES } from '../templateDefinitions';
import { customTemplatesSchema } from '../templateSchemas';
import { VALID_CATEGORIES } from '../../types/template';

describe('BUILT_IN_TEMPLATES integrity', () => {
    it('contains exactly 5 templates', () => {
        expect(BUILT_IN_TEMPLATES).toHaveLength(5);
    });

    it('each template has a unique id', () => {
        const ids = BUILT_IN_TEMPLATES.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('each template has at least 8 nodes', () => {
        for (const template of BUILT_IN_TEMPLATES) {
            expect(template.nodes.length).toBeGreaterThanOrEqual(8);
        }
    });

    it('all node templateIds within a template are unique', () => {
        for (const template of BUILT_IN_TEMPLATES) {
            const nodeIds = template.nodes.map((n) => n.templateId);
            expect(new Set(nodeIds).size).toBe(nodeIds.length);
        }
    });

    it('all edge source/target IDs reference valid node templateIds within same template', () => {
        for (const template of BUILT_IN_TEMPLATES) {
            const nodeIdSet = new Set(template.nodes.map((n) => n.templateId));
            for (const edge of template.edges) {
                expect(nodeIdSet.has(edge.sourceTemplateId)).toBe(true);
                expect(nodeIdSet.has(edge.targetTemplateId)).toBe(true);
            }
        }
    });

    it('all node headings are non-empty strings', () => {
        for (const template of BUILT_IN_TEMPLATES) {
            for (const node of template.nodes) {
                expect(typeof node.heading).toBe('string');
                expect(node.heading.length).toBeGreaterThan(0);
            }
        }
    });

    it('all node positions are {x: number, y: number}', () => {
        for (const template of BUILT_IN_TEMPLATES) {
            for (const node of template.nodes) {
                expect(typeof node.position.x).toBe('number');
                expect(typeof node.position.y).toBe('number');
            }
        }
    });

    it('all template categories are valid TemplateCategory values', () => {
        for (const template of BUILT_IN_TEMPLATES) {
            expect(VALID_CATEGORIES).toContain(template.category);
        }
    });

    it('all templates have isCustom = false', () => {
        for (const template of BUILT_IN_TEMPLATES) {
            expect(template.isCustom).toBe(false);
        }
    });

    it('customTemplatesSchema validates an empty array', () => {
        expect(() => customTemplatesSchema.parse([])).not.toThrow();
    });

    it('customTemplatesSchema rejects an array exceeding 10 items', () => {
        const fakeTemplates = Array.from({ length: 11 }, (_, i) => ({
            id: `t${i}`, name: `Template ${i}`, description: '',
            category: 'custom', isCustom: true, nodes: [], edges: [],
        }));
        expect(() => customTemplatesSchema.parse(fakeTemplates)).toThrow();
    });

    it('customTemplatesSchema rejects a template with invalid colorKey', () => {
        const bad = [{
            id: 'x', name: 'X', description: '', category: 'custom', isCustom: true,
            nodes: [{ templateId: 'n1', heading: 'H', output: '', position: { x: 0, y: 0 }, colorKey: 'neon' }],
            edges: [],
        }];
        expect(() => customTemplatesSchema.parse(bad)).toThrow();
    });
});
