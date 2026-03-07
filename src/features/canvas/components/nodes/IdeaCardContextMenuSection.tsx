/**
 * IdeaCardContextMenuSection — Renders NodeContextMenu when open.
 * Extracted from IdeaCard to keep it under max-lines-per-function.
 */
import React from 'react';
import { NodeContextMenu } from './NodeContextMenu';
import type { NodeContextMenuProps } from './NodeContextMenu';

export const IdeaCardContextMenuSection = React.memo(function IdeaCardContextMenuSection(
    props: NodeContextMenuProps,
) {
    return <NodeContextMenu {...props} />;
});
