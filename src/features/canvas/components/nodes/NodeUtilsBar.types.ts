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
}
