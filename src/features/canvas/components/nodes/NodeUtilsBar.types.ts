import type { TransformationType } from '@/features/ai/hooks/useNodeTransformation';

export interface NodeUtilsBarProps {
    onAIClick?: () => void;
    onConnectClick: () => void;
    onCopyClick?: () => void;
    onDelete: () => void;
    onTransform?: (type: TransformationType) => void;
    onRegenerate?: () => void;
    onMoreClick: () => void;
    hasContent?: boolean;
    isTransforming?: boolean;
    disabled?: boolean;
    registerProximityLostFn?: (fn: () => void) => void;
    // Context-menu actions that may appear in the UtilsBar via icon placement
    onPinToggle?: () => void;
    onDuplicateClick?: () => void;
    onCollapseToggle?: () => void;
    onFocusClick?: () => void;
    onTagClick?: () => void;
    onImageClick?: () => void;
    onAttachmentClick?: () => void;
    onPoolToggle?: () => void;
    onContentModeToggle?: () => void;
    // State needed for toggle labels (Pin/Unpin, Collapse/Expand, etc.)
    isPinned?: boolean;
    isCollapsed?: boolean;
    isInPool?: boolean;
    isMindmapMode?: boolean;
}
