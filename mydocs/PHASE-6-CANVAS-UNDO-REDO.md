# Phase 6: Canvas Undo/Redo — Fearless Thinking

## Problem Statement

Deleting a node is permanent. Moving a node can't be reversed. Disconnecting an edge is gone forever. TipTap provides text-level undo within a single node editor, but there is **zero canvas-level undo/redo**. For a thinking tool where users experiment freely — drag-clustering ideas, pruning dead branches, reorganizing spatial relationships — this creates anxiety. Users hesitate to delete, move, or restructure because mistakes are irreversible. The canvas should feel like a safe playground for thinking, not a minefield where one wrong click destroys work.

## Intended Solution

A lightweight command history stack in the canvas store that captures reversible snapshots of canvas operations. Users press `Ctrl+Z` to undo and `Ctrl+Shift+Z` / `Ctrl+Y` to redo. The stack stores the **inverse operation** (command pattern), not full canvas snapshots, keeping memory usage minimal even with 500+ nodes.

## Architecture Decisions

- **No new Zustand store** — history stack lives as a new factory slice in `canvasStoreActions.ts` pattern: `createHistoryActions()` spread into `canvasStore.ts`
- **New factory file** — `canvasStoreHistory.ts` (~75 lines) keeps `canvasStoreActions.ts` under 300 lines
- **Command pattern** — each undoable action records `{ type, undo: () => Partial<CanvasStore>, redo: () => Partial<CanvasStore> }`. No full-state cloning.
- **Stack depth**: 50 operations max (ring buffer). Beyond 50, oldest entries are discarded.
- **Batching**: Drag operations (continuous position updates) are batched — only the start and end positions are recorded as one entry.
- **Not persisted**: History resets on workspace switch and page reload. This is intentional — undo is a session tool, not a time machine.
- **Scope**: Only structural mutations are undoable (add/delete/move node, add/delete edge, color change). Text editing undo stays in TipTap.
- **ID generation**: N/A — undo restores existing IDs, doesn't create new ones.
- **Atomic Operations & Coalescing**: Commands are grouped to support multi-selection (batch deletion/moves). Rapid, identical actions (like scrubbing through colors) are coalesced into a single history entry to prevent stack pollution.
- **Z-Index Conservation**: Nodes are restored to their original array index to perfectly maintain rendering order.
- **Orphan Guarding**: Restored edges defensively check for existing source/target nodes to prevent ReactFlow crashes.
- **Analytics**: Add `'canvas_undo'` to `SettingKey` union in `analyticsService.ts`.

---

## Sub-phase 6A: History Stack & Command Types

### What We Build

The core history infrastructure: a typed command stack, push/undo/redo operations, and the ring buffer.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/types/history.ts` | NEW | ~35 |
| `src/features/canvas/stores/canvasStoreHistory.ts` | NEW | ~75 |
| `src/features/canvas/stores/canvasStore.ts` | EDIT | Add HistorySlice to CanvasStore type, spread `createHistoryActions` |
| `src/features/canvas/stores/__tests__/canvasStoreHistory.test.ts` | NEW | ~120 |

### Implementation

**`history.ts`** (~35 lines):

```typescript
export const MAX_HISTORY_DEPTH = 50;

export interface CanvasCommand {
  readonly type: CanvasCommandType;
  readonly timestamp: number;
  readonly entityId?: string; // Optional ID for coalescing rapid sequential actions (e.g. scrubbing color picker)
  readonly undo: () => void;
  readonly redo: () => void;
}

export type CanvasCommandType =
  | 'addNode'
  | 'deleteNode'
  | 'moveNode'
  | 'addEdge'
  | 'deleteEdge'
  | 'changeColor'
  | 'togglePin'
  | 'toggleCollapse'
  | 'batchMove';

export interface HistorySlice {
  undoStack: CanvasCommand[];
  redoStack: CanvasCommand[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushCommand: (cmd: CanvasCommand) => void;
  clearHistory: () => void;
}
```

**`canvasStoreHistory.ts`** (~75 lines):

```typescript
import { MAX_HISTORY_DEPTH, type CanvasCommand, type HistorySlice } from '../types/history';
import type { CanvasStore } from './canvasStore';

type SetFn = (partial: Partial<CanvasStore> | ((s: CanvasStore) => Partial<CanvasStore>)) => void;
type GetFn = () => CanvasStore;

export function createHistoryActions(set: SetFn, get: GetFn): HistorySlice {
  return {
    undoStack: [],
    redoStack: [],
    canUndo: false,
    canRedo: false,

    pushCommand: (cmd: CanvasCommand) => {
      set((s) => {
        let newStack = [...s.undoStack];
        const lastCmd = newStack[newStack.length - 1];
        
        // Coalesce fast, identical sequential mutations (e.g. rapid color picking or nudging)
        const isCoalescable =
          lastCmd && cmd.entityId &&
          lastCmd.entityId === cmd.entityId &&
          lastCmd.type === cmd.type &&
          (cmd.timestamp - lastCmd.timestamp < 1000);

        if (isCoalescable) {
          // Update the redo of the previous command, keep the original undo closure
          newStack[newStack.length - 1] = { ...lastCmd, redo: cmd.redo, timestamp: cmd.timestamp };
        } else {
          newStack.push(cmd);
          if (newStack.length > MAX_HISTORY_DEPTH) newStack.shift();
        }

        return {
          undoStack: newStack,
          redoStack: [], // new action clears redo
          canUndo: true,
          canRedo: false,
        };
      });
    },

    undo: () => {
      const { undoStack, redoStack } = get();
      if (undoStack.length === 0) return;
      const cmd = undoStack[undoStack.length - 1];
      cmd.undo();
      set({
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, cmd],
        canUndo: undoStack.length > 1,
        canRedo: true,
      });
    },

    redo: () => {
      const { undoStack, redoStack } = get();
      if (redoStack.length === 0) return;
      const cmd = redoStack[redoStack.length - 1];
      cmd.redo();
      set({
        undoStack: [...undoStack, cmd],
        redoStack: redoStack.slice(0, -1),
        canUndo: true,
        canRedo: redoStack.length > 1,
      });
    },

    clearHistory: () => set({
      undoStack: [], redoStack: [],
      canUndo: false, canRedo: false,
    }),
  };
}
```

### TDD Tests

```
1. pushCommand adds to undoStack
2. pushCommand clears redoStack
3. undo pops from undoStack, pushes to redoStack
4. undo calls cmd.undo()
5. redo pops from redoStack, pushes to undoStack
6. redo calls cmd.redo()
7. undo on empty stack is no-op
8. redo on empty stack is no-op
9. canUndo/canRedo flags update correctly
10. Stack respects MAX_HISTORY_DEPTH (oldest discarded)
11. clearHistory empties both stacks
```

### Tech Debt Checkpoint

- [ ] history.ts under 40 lines
- [ ] canvasStoreHistory.ts under 80 lines
- [ ] canvasStore.ts stays under 130 lines after adding spread
- [ ] All strings from resources
- [ ] Zero lint errors

---

## Sub-phase 6B: Wire Undoable Actions

### What We Build

Wrap existing canvas actions (deleteNode, addNode, addEdge, deleteEdge, updateNodeColor, toggleNodePinned, toggleNodeCollapsed) to push commands before executing.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/hooks/useUndoableActions.ts` | NEW | ~70 |
| `src/features/canvas/hooks/__tests__/useUndoableActions.test.ts` | NEW | ~100 |

### Implementation

**`useUndoableActions.ts`** (~70 lines) — wrapper hook that intercepts canvas actions and records undo commands:

```typescript
export function useUndoableActions() {
  const pushCommand = () => useCanvasStore.getState().pushCommand;

  const deleteElementsWithUndo = useCallback((nodeIds: string[], edgeIds: string[] = []) => {
    const state = useCanvasStore.getState();
    
    // 1. Capture nodes with their original Z-Index (array position)
    const frozenNodes = nodeIds.map(id => {
      const node = getNodeMap(state.nodes).get(id);
      const index = state.nodes.findIndex(n => n.id === id);
      return { node: node ? structuredClone(node) : null, index };
    }).filter(n => n.node !== null) as { node: CanvasNode, index: number }[];

    // 2. Capture explicitly selected edges + edges connected to deleted nodes
    const connectedEdges = state.edges.filter(e => 
      edgeIds.includes(e.id) || nodeIds.includes(e.source) || nodeIds.includes(e.target)
    );
    const frozenEdges = structuredClone(connectedEdges);

    useCanvasStore.getState().pushCommand({
      type: 'deleteNode',
      timestamp: Date.now(),
      undo: () => {
        const s = useCanvasStore.getState();
        // Insert nodes back at original z-index order
        frozenNodes.forEach(({ node, index }) => s.insertNodeAtIndex(node, index));
        // Defensive Edge Guard: Only restore edges if BOTH source and target exist
        const currentNodes = new Set(s.nodes.map(n => n.id));
        frozenEdges.forEach(e => {
           if (currentNodes.has(e.source) && currentNodes.has(e.target)) {
             s.addEdge(e);
           }
        });
      },
      redo: () => {
        const s = useCanvasStore.getState();
        nodeIds.forEach(id => s.deleteNode(id));
        frozenEdges.forEach(e => s.deleteEdge(e.id));
      },
    });

    // Execute the actual deletions immediately
    nodeIds.forEach(id => state.deleteNode(id));
    frozenEdges.forEach(e => state.deleteEdge(e.id));
  }, []);

  // Similar wrappers for addNode, addEdge, deleteEdge, changeColor...
  return { deleteNodeWithUndo, addNodeWithUndo, /* ... */ };
}
```

**Key decisions:**
- `structuredClone` captures node state at deletion time (not a reference)
- Connected edges are restored alongside the node (atomic undo)
- Wrapper hook is used by IdeaCard/canvas handlers — existing `deleteNode` on the store stays unchanged (internal use, batch operations)

### TDD Tests

```
1. deleteNodeWithUndo removes node AND pushes command
2. Undo after deleteNode restores node + connected edges
3. Redo after undo re-deletes the node
4. addNodeWithUndo adds node AND pushes command
5. Undo after addNode removes the node
6. deleteEdgeWithUndo removes edge AND pushes command
7. Undo after deleteEdge restores edge
8. changeColorWithUndo updates color AND pushes command
9. Undo after changeColor restores previous color
```

### Tech Debt Checkpoint

- [ ] useUndoableActions under 75 lines
- [ ] No direct store mutation — all go through existing actions
- [ ] structuredClone for captured state (no stale references)
- [ ] Zero lint errors

---

## Sub-phase 6C: Keyboard Binding & Drag Batching

### What We Build

Wire `Ctrl+Z` / `Ctrl+Shift+Z` globally, and batch drag operations so continuous node movement records as a single undo entry.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/canvas/hooks/useCanvasKeyboard.ts` | EDIT | Add undo/redo key handlers |
| `src/features/canvas/hooks/useDragBatch.ts` | NEW | ~40 |
| `src/features/canvas/hooks/__tests__/useDragBatch.test.ts` | NEW | ~60 |
| `src/shared/localization/canvasStrings.ts` | EDIT | Add undo/redo toast strings |

### Implementation

**Keyboard**: In the existing canvas keyboard handler, add:
- `Ctrl+Z` → `useCanvasStore.getState().undo()`
- `Ctrl+Shift+Z` / `Ctrl+Y` → `useCanvasStore.getState().redo()`
- **Defensive Guard**: DOM focus management. Only fire if `document.activeElement` is `document.body` or the `.react-flow__pane`. Ignore the shortcut if the user is currently focused inside a `<textarea>`, `<input>`, or an element with `contenteditable="true"` (like TipTap), so they don't accidentally undo canvas geometry when typing.

**Drag batching**: `useDragBatch` captures node position on `onNodeDragStart` and pushes a single `moveNode` command on `onNodeDragStop` with the start→end delta.

**Toast feedback**: On undo/redo, show a brief toast: "Undone: deleted node" / "Redone: deleted node" using `toast.info()`.

### TDD Tests

```
1. Ctrl+Z calls undo when no editor focused
2. Ctrl+Z is no-op when TipTap editor is focused
3. Ctrl+Shift+Z calls redo
4. Ctrl+Y calls redo (Windows convention)
5. Drag start + drag stop records single moveNode command
6. Undo after drag restores original position
7. Multiple drags = multiple undo entries (not batched across drags)
8. Toast shown on undo/redo
```

### Tech Debt Checkpoint

- [ ] useDragBatch under 45 lines
- [ ] No interference with TipTap undo
- [ ] Toast strings from resources
- [ ] Zero lint errors

---

## Sub-phase 6D: Workspace Switch & Cleanup

### What We Build

Clear history on workspace switch (history is session-scoped, not workspace-scoped). Add structural tests.

### Files

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/features/workspace/hooks/useWorkspaceLoader.ts` | EDIT | Call `clearHistory()` on workspace switch |
| `src/features/canvas/__tests__/undoRedo.structural.test.ts` | NEW | ~40 |
| `src/shared/localization/canvasStrings.ts` | EDIT | Undo/redo strings if not added in 6C |

### Structural Tests

```
1. canvasStore exports undo, redo, pushCommand, clearHistory
2. useUndoableActions wraps deleteNode (not raw deleteNode in UI)
3. useWorkspaceLoader calls clearHistory on switch
4. Ctrl+Z handler exists in canvas keyboard hook
5. No undoStack/redoStack persisted to Firestore (grep scan)
```

### Tech Debt Checkpoint

- [ ] History cleared on workspace switch
- [ ] No Firestore persistence of undo state
- [ ] All tests pass
- [ ] Zero lint errors

---

## Phase 6 Summary

### Execution Order

| Phase | What | Why This Order |
|-------|------|----------------|
| 6A | History stack + types | Foundation — no UI yet |
| 6B | Undoable action wrappers | Depends on 6A stack |
| 6C | Keyboard binding + drag batch | Depends on 6B wrappers |
| 6D | Workspace cleanup + structural | Depends on all above |

### Net Impact

- **Files created**: 7 (types, store slice, hook, drag batch, + tests)
- **Files edited**: 3 (canvasStore, keyboard hook, workspaceLoader)
- **Net line count change**: ~+400 lines (new capability, no deletions)
- **User impact**: Ctrl+Z restores deleted nodes, moved nodes, removed edges — fearless experimentation
- **Performance**: Ring buffer capped at 50, structuredClone only on mutations (not on every render)

### What's NOT Included

| Item | Reason |
|------|--------|
| Text content undo | TipTap handles this already |
| Cross-workspace undo | History is session-scoped per workspace |
| Persistent undo (survive reload) | Over-engineering — session undo covers 99% of use |
| Undo for AI generation | AI output is additive, not destructive — low undo demand |
| Visual undo timeline | Phase 6 is functional only; visual timeline is future polish |
