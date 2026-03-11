/**
 * Grid Constants — SSOT for masonry layout dimensions.
 *
 * Shared by gridLayoutService, snapToMasonrySlot, and freeFlowPlacementService.
 * Extracted to keep gridLayoutService under the 300-line limit.
 */

/** Number of columns in the masonry grid. */
export const GRID_COLUMNS = 4;

/** Pixel gap between nodes (horizontal and vertical). */
export const GRID_GAP = 40;

/** Left/top padding of the masonry grid. */
export const GRID_PADDING = 32;
