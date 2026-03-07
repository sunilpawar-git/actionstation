import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const CLUSTERING_DIR = path.resolve(__dirname, '..');
const CANVAS_NODES_DIR = path.resolve(__dirname, '../../canvas/components/nodes');

function getSourceFiles(dir: string, ext = '.ts'): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && e.name !== '__tests__' && e.name !== 'node_modules') {
            files.push(...getSourceFiles(full, ext));
        } else if (e.isFile() && (e.name.endsWith(ext) || e.name.endsWith('.tsx'))) {
            files.push(full);
        }
    }
    return files;
}

describe('clustering structural tests', () => {
    it('all clustering source files are under 300 lines', () => {
        const files = getSourceFiles(CLUSTERING_DIR);
        for (const f of files) {
            const lines = fs.readFileSync(f, 'utf-8').split('\n').length;
            expect(lines, `${path.relative(CLUSTERING_DIR, f)} has ${lines} lines`).toBeLessThanOrEqual(300);
        }
    });

    it('no hardcoded strings in clustering components', () => {
        const componentFiles = getSourceFiles(path.join(CLUSTERING_DIR, 'components'));
        for (const f of componentFiles) {
            const content = fs.readFileSync(f, 'utf-8');
            const jsxStrings = content.match(/>\s*[A-Z][a-z]+(\s+[a-z]+)+\s*</g) ?? [];
            const filtered = jsxStrings.filter((s) => !s.includes('data-') && !s.includes('role='));
            expect(filtered, `Hardcoded string in ${path.basename(f)}: ${filtered.join(', ')}`).toHaveLength(0);
        }
    });

    it('no any types in clustering feature', () => {
        const files = getSourceFiles(CLUSTERING_DIR);
        for (const f of files) {
            const content = fs.readFileSync(f, 'utf-8');
            const anyMatches = content.match(/:\s*any\b/g) ?? [];
            expect(anyMatches, `'any' type in ${path.basename(f)}`).toHaveLength(0);
        }
    });

    it('ClusterBoundaries uses React.memo', () => {
        const file = path.join(CLUSTERING_DIR, 'components', 'ClusterBoundaries.tsx');
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).toContain('React.memo');
    });

    it('no Zustand bare destructuring in clustering feature', () => {
        const files = getSourceFiles(CLUSTERING_DIR);
        const pattern = /const\s*\{[^}]+\}\s*=\s*use(CanvasStore|ClusterPreviewStore|AuthStore|WorkspaceStore)\(\s*\)/;
        for (const f of files) {
            const content = fs.readFileSync(f, 'utf-8');
            expect(content, `Zustand anti-pattern in ${path.basename(f)}`).not.toMatch(pattern);
        }
    });

    it('cluster color variables defined in cluster-colors.css', () => {
        const cssPath = path.resolve(__dirname, '../../../styles/cluster-colors.css');
        const content = fs.readFileSync(cssPath, 'utf-8');
        for (let i = 1; i <= 8; i++) {
            expect(content).toContain(`--cluster-color-${i}`);
        }
    });

    it('ClusterGroup type has no stored bounding box', () => {
        const typesFile = path.join(CLUSTERING_DIR, 'types', 'cluster.ts');
        const content = fs.readFileSync(typesFile, 'utf-8');
        const clusterGroupBlock = content.split('export interface ClusterGroupWithBounds')[0];
        expect(clusterGroupBlock).not.toContain('bounds');
        expect(clusterGroupBlock).not.toContain('boundingBox');
    });

    it('similarityService imports from existing tfidfScorer or relevanceScorer', () => {
        const file = path.join(CLUSTERING_DIR, 'services', 'similarityService.ts');
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).toContain('knowledgeBank/services/relevanceScorer');
    });

    it('semanticZoom.css uses data-node-section selectors', () => {
        const cssPath = path.resolve(__dirname, '../../../styles/semanticZoom.css');
        const content = fs.readFileSync(cssPath, 'utf-8');
        expect(content).toContain('data-node-section');
        expect(content).toContain('data-zoom-level');
    });

    it('IdeaCard sub-components have data-node-section attributes', () => {
        const headingFile = path.join(CANVAS_NODES_DIR, 'IdeaCardHeadingSection.tsx');
        const contentFile = path.join(CANVAS_NODES_DIR, 'IdeaCardContentSection.tsx');
        const tagsFile = path.join(CANVAS_NODES_DIR, 'IdeaCardTagsSection.tsx');
        const utilsFile = path.join(CANVAS_NODES_DIR, 'NodeUtilsBar.tsx');

        expect(fs.readFileSync(headingFile, 'utf-8')).toContain('data-node-section="heading"');
        expect(fs.readFileSync(contentFile, 'utf-8')).toContain('data-node-section="content"');
        expect(fs.readFileSync(tagsFile, 'utf-8')).toContain('data-node-section="tags"');
        expect(fs.readFileSync(utilsFile, 'utf-8')).toContain('data-node-section="utils"');
    });
});
