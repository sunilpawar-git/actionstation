# Task
Canvas node creation, editing, and heading save

## Changed Files
- src/features/canvas/components/CanvasNode.tsx
- src/features/canvas/hooks/useHeadingEditor.ts
- src/features/canvas/stores/canvasStore.ts

## Acceptance Criteria

### AC-1: New node appears on double-click
- Double-clicking an empty area of the canvas creates a new text node
- The node is visible within 300 ms
- The node's editor is immediately focused (cursor inside)

### AC-2: Heading text saves on blur
- Typing text into a node's heading and clicking away persists the text
- Re-opening the node shows the same text (no data loss on deferred save)
- The save does NOT fire while the user is still typing (debounce ≥ 300 ms)

### AC-3: Escape key exits editing without saving partial draft
- Pressing Escape while editing a heading cancels the draft
- The node reverts to its previous text
- Focus returns to the canvas (not trapped inside the node)

### AC-4: Node drag and drop
- A node can be dragged to a new position
- After dropping, the node stays at the new coordinates (not snapping back)
- Other nodes are not displaced during drag

### AC-5: Delete node via keyboard
- Selecting a node and pressing Backspace/Delete removes it from the canvas
- The deletion is undoable with Cmd+Z
- No stale references remain (the deleted node ID is absent from canvasStore)
