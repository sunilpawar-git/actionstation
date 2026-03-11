/**
 * PanToNodeContext — Provides panToPosition from CanvasView to per-node hooks.
 * Avoids per-node useReactFlow() subscription (500 nodes × full store = cascade).
 * Only CanvasView calls useReactFlow(); children consume via this context.
 */
import { createContext, useContext } from 'react';

type PanToPositionFn = (x: number, y: number, options?: { duration?: number; zoom?: number }) => void;

interface PanToNodeContextValue {
    panToPosition: PanToPositionFn;
}

// eslint-disable-next-line @typescript-eslint/no-empty-function -- intentional no-op default
const noop: PanToPositionFn = () => {};
export const PanToNodeContext = createContext<PanToNodeContextValue>({ panToPosition: noop });

export function usePanToNodeContext(): PanToNodeContextValue {
    return useContext(PanToNodeContext);
}
