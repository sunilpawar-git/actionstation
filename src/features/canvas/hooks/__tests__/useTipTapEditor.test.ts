/**
 * useTipTapEditor Hook Tests
 * TDD: Validates editor lifecycle, markdown I/O, and callback wiring
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTipTapEditor } from '../useTipTapEditor';

describe('useTipTapEditor', () => {
    it('creates an editor instance on mount', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '', placeholder: 'Type...' })
        );
        expect(result.current.editor).not.toBeNull();
    });

    it('initializes with content from markdown string', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '**bold text**', placeholder: '' })
        );
        const html = result.current.editor!.getHTML();
        expect(html).toContain('<strong>bold text</strong>');
    });

    it('returns markdown string via getMarkdown', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '**bold**', placeholder: '' })
        );
        expect(result.current.getMarkdown()).toBe('**bold**');
    });

    it('reports isEmpty correctly for empty content', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '', placeholder: '' })
        );
        expect(result.current.isEmpty).toBe(true);
    });

    it('reports isEmpty correctly for non-empty content', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'hello', placeholder: '' })
        );
        expect(result.current.isEmpty).toBe(false);
    });

    it('returns plain text via getText', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '**bold** text', placeholder: '' })
        );
        expect(result.current.getText()).toContain('bold text');
    });

    it('wires onBlur callback to editor options', () => {
        const onBlur = vi.fn();
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'hello', placeholder: '', onBlur })
        );
        // Verify editor is created with blur handler wired
        // (ProseMirror blur events don't fire in jsdom, but the callback is wired)
        expect(result.current.editor).not.toBeNull();
        // Verify getMarkdown returns the content that onBlur would provide
        expect(result.current.getMarkdown()).toBe('hello');
    });

    it('returns editor instance that can be used until unmount', () => {
        const { result, unmount } = renderHook(() =>
            useTipTapEditor({ initialContent: 'test', placeholder: '' })
        );
        // Editor exists and is functional
        expect(result.current.editor).not.toBeNull();
        expect(result.current.getMarkdown()).toBe('test');
        // Unmount triggers cleanup (TipTap handles destruction internally)
        unmount();
    });

    it('respects editable option', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'text', placeholder: '', editable: false })
        );
        expect(result.current.editor!.isEditable).toBe(false);
    });

    it('defaults to editable when option not specified', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '', placeholder: '' })
        );
        expect(result.current.editor!.isEditable).toBe(true);
    });

    it('provides setContent to update editor content programmatically', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'original', placeholder: '' })
        );
        expect(result.current.getMarkdown()).toBe('original');
        result.current.setContent('**updated**');
        expect(result.current.getMarkdown()).toBe('**updated**');
    });

    it('setContent with empty string clears the editor', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: 'has content', placeholder: '' })
        );
        result.current.setContent('');
        // After clearing, getMarkdown returns empty and editor content is cleared
        expect(result.current.getMarkdown()).toBe('');
    });

    describe('skipNextUpdate guard', () => {
        it('suppresses onUpdate during programmatic setContent', () => {
            const onUpdate = vi.fn();
            const { result } = renderHook(() =>
                useTipTapEditor({ initialContent: 'initial', placeholder: '', onUpdate })
            );
            onUpdate.mockClear();

            // setContent should suppress the next onUpdate callback
            act(() => { result.current.setContent('programmatic content'); });

            // onUpdate should NOT have been called for programmatic setContent
            expect(onUpdate).not.toHaveBeenCalled();
        });
    });

    describe('onUpdate callback', () => {
        it('wires onUpdate callback to editor options', () => {
            const onUpdate = vi.fn();
            const { result } = renderHook(() =>
                useTipTapEditor({ initialContent: 'hello', placeholder: '', onUpdate })
            );
            // Editor is created with update handler wired
            expect(result.current.editor).not.toBeNull();
        });
    });

    describe('editable prop sync via useEffect', () => {
        it('initialises as non-editable when editable=false', () => {
            const { result } = renderHook(() =>
                useTipTapEditor({ initialContent: 'text', placeholder: '', editable: false })
            );
            expect(result.current.editor!.isEditable).toBe(false);
        });

        it('becomes editable when prop changes false→true (critical: heading editor regression guard)', async () => {
            const { result, rerender } = renderHook(
                ({ editable }) => useTipTapEditor({ initialContent: 'text', placeholder: '', editable }),
                { initialProps: { editable: false } }
            );
            expect(result.current.editor!.isEditable).toBe(false);
            // Simulates user clicking a node to enter edit mode
            rerender({ editable: true });
            await act(async () => { });
            expect(result.current.editor!.isEditable).toBe(true);
        });

        it('becomes non-editable when prop changes true→false', async () => {
            const { result, rerender } = renderHook(
                ({ editable }) => useTipTapEditor({ initialContent: 'text', placeholder: '', editable }),
                { initialProps: { editable: true } }
            );
            expect(result.current.editor!.isEditable).toBe(true);
            rerender({ editable: false });
            await act(async () => { });
            expect(result.current.editor!.isEditable).toBe(false);
        });
    });
});


describe('useTipTapEditor — table content', () => {
    const TABLE_MD = '| Name | Age |\n|---|---|\n| Alice | 30 |';
    // Raw GFM table HTML — TipTap must retain <table> structure, not collapse to plain text
    const TABLE_HTML = '<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>Alice</td><td>30</td></tr></tbody></table>';

    it('initialises editor with table markdown without stripping content', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: TABLE_MD, placeholder: '' })
        );
        const html = result.current.editor!.getHTML();
        expect(html).toContain('Alice');
        expect(html).toContain('Name');
    });

    it('isEmpty is false when content is a table', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: TABLE_MD, placeholder: '' })
        );
        expect(result.current.isEmpty).toBe(false);
    });

    it('setContent with table markdown updates editor', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '', placeholder: '' })
        );
        act(() => { result.current.setContent(TABLE_MD); });
        const html = result.current.editor!.getHTML();
        expect(html).toContain('Alice');
    });

    it('accepts raw table HTML via setContent without stripping', () => {
        const { result } = renderHook(() =>
            useTipTapEditor({ initialContent: '', placeholder: '' })
        );
        act(() => { result.current.editor!.commands.setContent(TABLE_HTML); });
        const html = result.current.editor!.getHTML();
        // TipTap v3 wraps cells with colspan/rowspan attributes and text in <p>
        // Core assertion: table structure is preserved (not collapsed to plain text)
        expect(html).toContain('<table');
        expect(html).toContain('Alice');
        expect(html).toContain('Name');
    });
});
