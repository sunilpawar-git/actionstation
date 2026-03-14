/**
 * ImageViewer — Simple contained image viewer for the reader shell.
 * Renders the image with scroll/zoom-safe behavior.
 * Supports text selection from alt text via aria attributes.
 */
import React, { useState } from 'react';
import { strings } from '@/shared/localization/strings';
import type { SafeReaderUrl, ReaderLoadState } from '../types/reader';

interface ImageViewerProps {
    url: SafeReaderUrl;
    filename: string;
    onLoadStateChange: (state: ReaderLoadState) => void;
}

export const ImageViewer = React.memo(function ImageViewer({
    url,
    filename,
    onLoadStateChange,
}: ImageViewerProps) {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-muted)] p-6">
                <p className="text-sm">{strings.reader.loadError}</p>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--color-primary)] hover:underline"
                >
                    {strings.reader.openExternal}
                </a>
            </div>
        );
    }

    return (
        <div
            className="flex items-center justify-center h-full overflow-auto bg-[var(--color-surface)] p-4"
            role="document"
            aria-label={strings.reader.sourcePane}
        >
            <img
                src={url}
                alt={filename}
                className="max-w-full max-h-full object-contain rounded"
                onLoad={() => onLoadStateChange('ready')}
                onError={() => {
                    setHasError(true);
                    onLoadStateChange('error');
                }}
            />
        </div>
    );
});
