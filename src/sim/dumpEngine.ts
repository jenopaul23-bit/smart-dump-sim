// Dump decision engine: scores candidate cells, picks from top decile,
// validates with BFS + slope, reserves footprint with time window.
import type { GridCell } from "./types";
import { GRID_SIZE, SLOPE_LIMIT, MAX_PILE_HEIGHT, gridToWorld, recomputeSlopesLocal } from "./grid";
import { bfsReachable } from "./pathfinding";

const W1 = 1.6;   // low-height preference
const W2 = 0.8;   // proximity to truck
const W4 = 2.5;   // slope penalty
const W6 = 5.0;   // furthest from entry (back-to-front packing)

export function pickDumpCell(
  grid: GridCell[][],
  truckGrid: [number, number],
  now: number,
  entryPoint: [number, number] = [2, 2],
  isDemoMode: boolean = false
): [number, number] | null {
  // 1. Hexagonal/Staggered Grid: Enforcing exactly 3.03m gap between dumps
  // Dump diameter is ~4m. 4m + 3.03m gap = 7.03m center-to-center.
  // 7.03m / 2m per cell = 3.515 cells step.
  const stepCells = (4.0 + 3.03) / 2.0;
  const rowStepCells = stepCells * 0.866; // Hexagonal row spacing (sin 60)

  // 1. Single BFS pass to find all reachable cells from the truck (O(N) = fast)
  const reachable = new Set<number>();
  const q: [number, number][] = [truckGrid];
  reachable.add(truckGrid[1] * GRID_SIZE + truckGrid[0]);
  let head = 0;
  while (head < q.length) {
    const [cx, cy] = q[head++];
    // Add neighbors
    for (const [dx, dy] of [[1,0], [-1,0], [0,1], [0,-1], [1,1], [1,-1], [-1,1], [-1,-1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        const k = ny * GRID_SIZE + nx;
        // Only reachable if it's mostly flat (not a mountain)
        if (!reachable.has(k) && grid[ny][nx].slope <= SLOPE_LIMIT && grid[ny][nx].height <= 1.0) {
          reachable.add(k);
          q.push([nx, ny]);
        }
      }
    }
  }

  let candidates: { x: number; y: number; score: number }[] = [];

  const maxX = isDemoMode ? 22 : GRID_SIZE - 4;
  const minX = isDemoMode ? 8 : 4;
  const maxY = isDemoMode ? 18 : GRID_SIZE - 4;
  const minY = isDemoMode ? 8 : 4;

  for (let yF = maxY; yF >= minY; yF -= rowStepCells) {
    // Offset every other row to create a honeycomb pattern
    const rowIdx = Math.round((maxY - yF) / rowStepCells);
    const rowOffset = (rowIdx % 2 === 0) ? 0 : (stepCells / 2);

    for (let xF = maxX - rowOffset; xF >= minX; xF -= stepCells) {
      const x = Math.round(xF);
      const y = Math.round(yF);
      
      if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) continue;

      const c = grid[y][x];

      // Blocked if reserved
      if (c.reserved && c.reservedUntil > now) continue;

      // 2. "The Low Spot" Problem Fix:
      // 2. Do not target cells that already have a dump on them!
      if (c.height > 0.5) continue;

      // Safety check (must be flat enough)
      if (c.slope > SLOPE_LIMIT) continue;

      // Must be reachable by the truck without driving over mountains
      if (!reachable.has(y * GRID_SIZE + x)) continue;

      // 3. Multi-objective Scoring
      const distFromEntry = Math.hypot(x - entryPoint[0], y - entryPoint[1]);
      let score = distFromEntry * 5.0; // Back-to-front sweeping priority

      // Minor penalty for being far from truck
      const distFromTruck = Math.hypot(x - truckGrid[0], y - truckGrid[1]);
      score -= distFromTruck * 0.8;

      candidates.push({ x, y, score });
    }
  }

  if (candidates.length === 0) return null;

  // Sort candidates from best to worst
  candidates.sort((a, b) => b.score - a.score);
  return [candidates[0].x, candidates[0].y];
}

export function reserveFootprint(
  grid: GridCell[][],
  cell: [number, number],
  heading: number,
  size: "S" | "M" | "L",
  now: number,
  windowMs = 8000
) {
  const [cx, cy] = cell;
  // Reserve a solid 5x5 block to ensure no other trucks collide or enter this 4-grid column
  const radius = 2;

  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
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

// Material properties: Gaussian distributions
// Coal: Base spread (k=1.8), wide ellipse (matFactor=1.2), normal peak (peakFactor=1.0)
// Iron Ore: Dense spread (k=1.4), tight ellipse (matFactor=0.9), high peak (peakFactor=1.3)
// Limestone: Moderate spread (k=1.6), circular (matFactor=1.0), moderate peak (peakFactor=1.1)
// Overburden: Loose spread (k=2.0), wide ellipse (matFactor=1.3), low peak (peakFactor=0.9)
const k = 1.4;
const matFactor = 0.9;
const peakFactor = 1.3;

// Apply material to grid as a 2D Gaussian distribution
export function applyDump(
  grid: GridCell[][],
  cell: [number, number],
  volume: number,
  material: string = "OVERBURDEN"
): [number, number][] {
  const [cx, cy] = cell;

  // Random jittering algorithm slightly mutates rx, ry, peak by up to 20%
  const jitterRx = 1 + (Math.random() * 0.4 - 0.2);
  const jitterRy = 1 + (Math.random() * 0.4 - 0.2);
  const jitterPeak = 1 + (Math.random() * 0.4 - 0.2);

  const v13 = Math.cbrt(volume);

  let matFactor = 1.0;
  let peakFactor = 1.0;
  if (material === "COAL") { matFactor = 1.25; peakFactor = 0.8; }
  else if (material === "IRON_ORE") { matFactor = 0.8; peakFactor = 1.35; }
  else if (material === "LIMESTONE") { matFactor = 1.05; peakFactor = 1.05; }
  else { matFactor = 1.15; peakFactor = 0.9; }

  // Tightly constrain the spread so it perfectly fits within the 4-grid column
  const rx = v13 * 1.2 * jitterRx * matFactor;
  const ry = v13 * 1.2 * jitterRy * matFactor;

  // Increase the peak height to visually account for the tighter spread
  const peakAdd = v13 * 5.5 * jitterPeak * peakFactor;

  // Strict radius of 2 ensures it NEVER touches the truck parked 3 cells away!
  const radius = 2;
  const affected: [number, number][] = [];

  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) continue;
      const dx = x - cx;
      const dy = y - cy;

      // Gaussian distribution
      const expNode = Math.exp(-((dx * dx) / (2 * rx * rx) + (dy * dy) / (2 * ry * ry)));
      const gaussianHeight = grid[y][x].height + peakAdd * expNode;
      
      grid[y][x].height = Math.min(MAX_PILE_HEIGHT, gaussianHeight);
      if (grid[y][x].height > 0.1) {
        // assign material to the cell if it's the core of the dump
        if (!grid[y][x].material || gaussianHeight > grid[y][x].height - 1.5) {
          grid[y][x].material = material as any;
        }
      }
      affected.push([x, y]);
    }
  }
  recomputeSlopesLocal(grid, cx, cy, radius + 1);
  return affected;
}
