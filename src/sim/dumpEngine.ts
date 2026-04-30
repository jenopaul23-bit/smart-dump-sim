// Dump decision engine: scores candidate cells, picks from top decile,
// validates with BFS + slope, reserves footprint with time window.
import type { GridCell } from "./types";
import { GRID_SIZE, SLOPE_LIMIT, MAX_PILE_HEIGHT, gridToWorld, recomputeSlopesLocal } from "./grid";
import { bfsReachable } from "./pathfinding";

const W1 = 1.6;   // low-height preference
const W2 = 0.8;   // proximity to truck
const W3 = 0.5;   // center proximity (uniform packing)
const W4 = 2.5;   // slope penalty
const W5 = 1.4;   // zone affinity (Voronoi)

export interface ZoneHint {
  // Per-cell zone id for grid (flat GRID_SIZE*GRID_SIZE)
  assign: Int8Array;
  // Preferred zone id for this truck
  preferredZone: number;
  // Seed of preferred zone (for distance bias inside zone)
  seed: [number, number];
}

export function pickDumpCell(
  grid: GridCell[][],
  truckGrid: [number, number],
  now: number,
  zoneHint?: ZoneHint
): [number, number] | null {
  const [tx, ty] = truckGrid;
  const candidates: { x: number; y: number; score: number }[] = [];
  const cx = GRID_SIZE / 2, cy = GRID_SIZE / 2;
  const maxDist = GRID_SIZE * 1.4;

  for (let y = 2; y < GRID_SIZE - 2; y++) {
    for (let x = 2; x < GRID_SIZE - 2; x++) {
      const c = grid[y][x];
      if (c.reserved && c.reservedUntil > now) continue;
      if (c.slope > SLOPE_LIMIT) continue;
      if (c.height >= MAX_PILE_HEIGHT) continue;
      const dist = Math.hypot(x - tx, y - ty);
      const centerProx = 1 - Math.hypot(x - cx, y - cy) / (GRID_SIZE / 2);
      let zoneBonus = 0;
      if (zoneHint) {
        const z = zoneHint.assign[y * GRID_SIZE + x];
        if (z === zoneHint.preferredZone) {
          // Inside own zone: bonus + small pull toward seed
          const sd = Math.hypot(x - zoneHint.seed[0], y - zoneHint.seed[1]);
          zoneBonus = W5 * (1 - sd / GRID_SIZE);
        } else {
          zoneBonus = -W5 * 0.6; // soft penalty for poaching
        }
      }
      const score =
        W1 * (1 / (c.height + 0.5)) +
        W2 * (1 / (dist / maxDist + 0.1)) +
        W3 * centerProx -
        W4 * c.slope +
        zoneBonus;
      candidates.push({ x, y, score });
    }
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  // Top-decile sampling to avoid clustering
  const topN = Math.max(1, Math.floor(candidates.length * 0.1));
  const top = candidates.slice(0, topN);
  // Try a few until BFS passes
  for (let i = 0; i < Math.min(8, top.length); i++) {
    const pick = top[Math.floor(Math.random() * top.length)];
    if (bfsReachable(grid, truckGrid, [pick.x, pick.y], 250)) {
      return [pick.x, pick.y];
    }
  }
  return null;
}

export function reserveFootprint(
  grid: GridCell[][],
  cell: [number, number],
  heading: number,
  size: "S" | "M" | "L",
  now: number,
  windowMs = 8000
) {
  const half = size === "L" ? 2 : size === "M" ? 1 : 1;
  const [cx, cy] = cell;
  // Orientation-aware (axis-aligned approx by quadrant)
  const horiz = Math.abs(Math.cos(heading)) > 0.5;
  const w = horiz ? half + 1 : half;
  const h = horiz ? half : half + 1;
  for (let y = cy - h; y <= cy + h; y++) {
    for (let x = cx - w; x <= cx + w; x++) {
      if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) continue;
      grid[y][x].reserved = true;
      grid[y][x].reservedUntil = now + windowMs;
    }
  }
}

export function clearExpiredReservations(grid: GridCell[][], now: number) {
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const c = grid[y][x];
      if (c.reserved && c.reservedUntil <= now) c.reserved = false;
    }
  }
}

// Apply material to grid as a conical pile spreading by slope.
// Returns the affected cells for visualization.
export function applyDump(
  grid: GridCell[][],
  cell: [number, number],
  volume: number
): [number, number][] {
  const [cx, cy] = cell;
  const radius = 3;
  const affected: [number, number][] = [];
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (d > radius) continue;
      // Conical falloff
      const factor = Math.max(0, 1 - d / radius);
      const add = volume * factor * 0.6;
      grid[y][x].height = Math.min(MAX_PILE_HEIGHT, grid[y][x].height + add);
      affected.push([x, y]);
    }
  }
  recomputeSlopesLocal(grid, cx, cy, radius + 1);
  return affected;
}
