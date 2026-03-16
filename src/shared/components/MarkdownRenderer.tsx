/**
 * MarkdownRenderer - Renders markdown content as formatted HTML
 * Uses react-markdown for safe rendering (XSS prevention built-in)
 */
import React from 'react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import './markdownContent.css';

interface MarkdownRendererProps {
    /** Markdown content to render */
    content: string;
    /** Optional additional CSS class name */
    className?: string;
}

/** Renders markdown as safe formatted HTML using react-markdown (XSS-safe by design). */
export const MarkdownRenderer = React.memo(({
    content,
    className,
}: MarkdownRendererProps) => {
    return (
        <div className={clsx('markdown-content text-[var(--color-text-primary)] leading-[1.7] break-words tracking-[0.01em]', className)} style={{ fontSize: 'var(--font-size-sm)' }}>
            <ReactMarkdown>{content}</ReactMarkdown>
        </div>
    );
});
