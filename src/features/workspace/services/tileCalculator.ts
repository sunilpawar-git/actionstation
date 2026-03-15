/**
 * Tile Calculator — Pure spatial math for tile-based graph storage.
 * Divides the infinite canvas into fixed-size grid tiles so that
 * only viewport-relevant tiles need to be loaded from Firestore.
 *
 * All functions are pure and side-effect-free.
 */
import type { NodePosition } from '@/features/canvas/types/node';
import { TILE_SIZE } from '@/config/firestoreQueryConfig';

export interface TileCoords {
    tileX: number;
    tileY: number;
}

export interface Viewport {
    x: number;
    y: number;
    zoom: number;
}

function coordLabel(n: number): string {
    return n < 0 ? `n${Math.abs(n)}` : String(n);
}

export function getTileCoords(position: NodePosition): TileCoords {
    return {
        tileX: Math.floor(position.x / TILE_SIZE),
        tileY: Math.floor(position.y / TILE_SIZE),
    };
}

export function getTileIdFromCoords(tileX: number, tileY: number): string {
    return `tile_${coordLabel(tileX)}_${coordLabel(tileY)}`;
}

export function getTileId(position: NodePosition): string {
    const { tileX, tileY } = getTileCoords(position);
    return getTileIdFromCoords(tileX, tileY);
}

/**
 * Returns all tile IDs that intersect the current viewport.
 *
 * The viewport transform from ReactFlow uses:
 *   canvasX = (screenX - viewport.x) / zoom
 *   canvasY = (screenY - viewport.y) / zoom
 *
 * So the visible canvas rectangle is:
 *   left   = -viewport.x / zoom
 *   top    = -viewport.y / zoom
 *   right  = (-viewport.x + containerWidth) / zoom
 *   bottom = (-viewport.y + containerHeight) / zoom
 */
export function getViewportTileIds(
    viewport: Viewport,
    zoom: number,
    containerWidth: number,
    containerHeight: number,
): string[] {
    const left = -viewport.x / zoom;
    const top = -viewport.y / zoom;
    const right = left + containerWidth / zoom;
    const bottom = top + containerHeight / zoom;

    const minTileX = Math.floor(left / TILE_SIZE);
    const maxTileX = Math.floor(right / TILE_SIZE);
    const minTileY = Math.floor(top / TILE_SIZE);
    const maxTileY = Math.floor(bottom / TILE_SIZE);

    const tileIds: string[] = [];
    for (let tx = minTileX; tx <= maxTileX; tx++) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
            tileIds.push(getTileIdFromCoords(tx, ty));
        }
    }
    return tileIds;
}

export function hasNodeChangedTile(
    oldPos: NodePosition,
    newPos: NodePosition,
): boolean {
    const oldCoords = getTileCoords(oldPos);
    const newCoords = getTileCoords(newPos);
    return oldCoords.tileX !== newCoords.tileX || oldCoords.tileY !== newCoords.tileY;
}
