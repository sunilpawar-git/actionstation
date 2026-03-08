import { useClearCanvasWithUndo } from '@/features/canvas/hooks/useClearCanvasWithUndo';
import { EraserIcon } from '@/shared/components/icons';
import { strings } from '@/shared/localization/strings';
import { captureError } from '@/shared/services/sentryService';
import styles from './WorkspaceControls.module.css';

interface ClearCanvasButtonProps {
    nodeCount: number;
}

export function ClearCanvasButton({ nodeCount }: ClearCanvasButtonProps) {
    const { clearCanvasWithUndo } = useClearCanvasWithUndo();

    return (
        <button
            className={styles.button}
            onClick={() => void clearCanvasWithUndo().catch((e) => captureError(e as Error))}
            disabled={nodeCount === 0}
            title={strings.canvas.clearCanvas}
        >
            <EraserIcon size={20} />
        </button>
    );
}
