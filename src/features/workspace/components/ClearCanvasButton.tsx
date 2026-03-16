import { useClearCanvasWithUndo } from '@/features/canvas/hooks/useClearCanvasWithUndo';
import { EraserIcon } from '@/shared/components/icons';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import { CONTROLS_BUTTON } from './workspaceControlsStyles';

interface ClearCanvasButtonProps {
    nodeCount: number;
}

export function ClearCanvasButton({ nodeCount }: ClearCanvasButtonProps) {
    const { clearCanvasWithUndo } = useClearCanvasWithUndo();

    return (
        <button
            className={CONTROLS_BUTTON}
            onClick={() => void clearCanvasWithUndo().catch((e: unknown) => captureError(e))}
            disabled={nodeCount === 0}
            title={strings.canvas.clearCanvas}
        >
            <EraserIcon size={20} />
        </button>
    );
}
