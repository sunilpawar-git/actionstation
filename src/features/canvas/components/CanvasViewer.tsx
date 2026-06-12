import { useEffect, useState, useMemo, memo } from 'react';
import { ReactFlow, Background, Controls, ReactFlowProvider } from '@xyflow/react';
import { loadSnapshot, type CanvasSnapshot } from '../services/snapshotService';
import { strings } from '@/shared/localization/strings';
import { logger } from '@/shared/services/logger';

type ViewerStatus = 'loading' | 'loaded' | 'expired' | 'error';

interface ViewerState {
    status: ViewerStatus;
    snapshot: CanvasSnapshot | null;
}

interface Props {
    snapshotId: string;
}

function toFlowNodes(snapshot: CanvasSnapshot) {
    return snapshot.nodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: { label: n.data.heading ?? '' },
        type: 'default',
        draggable: false,
        selectable: false,
        connectable: false,
    }));
}

function toFlowEdges(snapshot: CanvasSnapshot) {
    return snapshot.edges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
    }));
}

const ViewerHeader = memo(function ViewerHeader({ snapshot }: { snapshot: CanvasSnapshot }) {
    const count = snapshot.nodes.length;
    const label = count === 1
        ? strings.snapshot.nodesCountSingular
        : strings.snapshot.nodesCount.replace('{count}', String(count));
    return (
        <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center" style={{ gap: 12 }}>
                <span style={{ fontWeight: 600 }}>{snapshot.workspaceName}</span>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '2px 8px', border: '1px solid var(--color-border)', borderRadius: 4 }}>
                {strings.snapshot.readOnly}
            </span>
        </div>
    );
});

const EmptyState = memo(function EmptyState({ status }: { status: 'expired' | 'error' }) {
    const title = status === 'expired' ? strings.snapshot.expiredTitle : strings.snapshot.notFoundTitle;
    const message = status === 'expired' ? strings.snapshot.expiredMessage : strings.snapshot.notFoundMessage;
    return (
        <div className="flex flex-col items-center justify-center" style={{ height: '100%', gap: 8 }}>
            <p style={{ fontWeight: 600 }}>{title}</p>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>{message}</p>
        </div>
    );
});

export function CanvasViewer({ snapshotId }: Props) {
    const [state, setState] = useState<ViewerState>({ status: 'loading', snapshot: null });

    useEffect(() => {
        loadSnapshot(snapshotId)
            .then((snap) => setState({ status: 'loaded', snapshot: snap }))
            .catch((err: unknown) => {
                const msg = err instanceof Error ? err.message : '';
                logger.error('[CanvasViewer] load failed', err);
                setState({ status: msg.includes('expired') ? 'expired' : 'error', snapshot: null });
            });
    }, [snapshotId]);

    const snap = state.snapshot;
    const flowNodes = useMemo(() => (snap ? toFlowNodes(snap) : []), [snap]);
    const flowEdges = useMemo(() => (snap ? toFlowEdges(snap) : []), [snap]);

    if (state.status === 'loading') {
        return <div role="status" className="flex items-center justify-center" style={{ height: '100vh' }}>{strings.snapshot.loadingCanvas}</div>;
    }

    if (state.status === 'expired' || state.status === 'error') {
        return <div style={{ height: '100vh' }}><EmptyState status={state.status} /></div>;
    }

    if (!snap) return null;
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <ViewerHeader snapshot={snap} />
            <div style={{ flex: 1 }}>
                <ReactFlowProvider>
                    <ReactFlow
                        nodes={flowNodes}
                        edges={flowEdges}
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={false}
                        fitView
                    >
                        <Background />
                        <Controls showInteractive={false} />
                    </ReactFlow>
                </ReactFlowProvider>
            </div>
        </div>
    );
}
