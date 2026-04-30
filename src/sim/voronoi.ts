// Voronoi zoning system. K seeds partition the grid by nearest-seed assignment.
// Each truck is bound to a zone; dump engine biases candidate scores toward
// the truck's zone. When a zone's utilization (avg height / MAX_PILE_HEIGHT)
// exceeds REASSIGN_THRESHOLD, that seed is relocated to the lowest-utilization
// region and partitions are recomputed.
import type { GridCell } from "./types";
import { GRID_SIZE, MAX_PILE_HEIGHT } from "./grid";

export const REASSIGN_THRESHOLD = 0.85;

export interface Zone {
  id: number;
  seed: [number, number]; // grid coords
  color: string;
  cells: number; // count
  avgHeight: number;
  utilization: number; // 0..1
  truckId?: string;
  reassignments: number;
}

const ZONE_COLORS = [
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#f472b6", // pink
  "#84cc16", // lime
  "#fb923c", // orange
  "#38bdf8", // sky
  "#facc15", // yellow
  "#34d399", // emerald
];

export interface VoronoiState {
  zones: Zone[];
  // Per-cell zone id, GRID_SIZE*GRID_SIZE flat array
  assign: Int8Array;
}

function spreadSeeds(k: number): [number, number][] {
  const seeds: [number, number][] = [];
  // Hex-ish spread within central area to avoid edges
  const margin = 6;
  const inner = GRID_SIZE - margin * 2;
  for (let i = 0; i < k; i++) {
    const angle = (i / k) * Math.PI * 2 - Math.PI / 2;
    const r = inner * 0.32;
    const cx = GRID_SIZE / 2 + Math.cos(angle) * r;
    const cy = GRID_SIZE / 2 + Math.sin(angle) * r;
    seeds.push([Math.round(cx), Math.round(cy)]);
  }
  return seeds;
}

export function makeVoronoi(k: number, truckIds: string[]): VoronoiState {
  const seeds = spreadSeeds(k);
  const zones: Zone[] = seeds.map((s, i) => ({
    id: i,
    seed: s,
    color: ZONE_COLORS[i % ZONE_COLORS.length],
    cells: 0,
    avgHeight: 0,
    utilization: 0,
    truckId: truckIds[i],
    reassignments: 0,
  }));
  const assign = new Int8Array(GRID_SIZE * GRID_SIZE);
  const state = { zones, assign };
  recomputePartition(state);
  return state;
}

export function recomputePartition(v: VoronoiState) {
  const { zones, assign } = v;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < zones.length; i++) {
        const [sx, sy] = zones[i].seed;
        const d = (x - sx) * (x - sx) + (y - sy) * (y - sy);
        if (d < bestD) { bestD = d; best = i; }
      }
      assign[y * GRID_SIZE + x] = best;
    }
  }
}

export function zoneIdAt(v: VoronoiState, gx: number, gy: number): number {
  if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return 0;
  return v.assign[gy * GRID_SIZE + gx];
}

export function recomputeUtilization(v: VoronoiState, grid: GridCell[][]) {
  const sums = new Array(v.zones.length).fill(0);
  const counts = new Array(v.zones.length).fill(0);
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const z = v.assign[y * GRID_SIZE + x];
      sums[z] += grid[y][x].height;
      counts[z]++;
    }
  }
  for (let i = 0; i < v.zones.length; i++) {
    const c = counts[i] || 1;
    v.zones[i].cells = counts[i];
    v.zones[i].avgHeight = sums[i] / c;
    v.zones[i].utilization = (sums[i] / c) / MAX_PILE_HEIGHT;
  }
}

// Find the cell furthest (in low-utilization sense) from existing seeds —
// i.e. the centroid of the lowest-height region not already saturated.
function findRelocation(v: VoronoiState, grid: GridCell[][]): [number, number] {
  let best: [number, number] = [GRID_SIZE / 2, GRID_SIZE / 2];
  let bestScore = -Infinity;
  // Sample a coarse grid for performance
  const step = 3;
  for (let y = 4; y < GRID_SIZE - 4; y += step) {
    for (let x = 4; x < GRID_SIZE - 4; x += step) {
      const h = grid[y][x].height;
      // Distance to nearest existing seed (we want far)
      let nearest = Infinity;
      for (const z of v.zones) {
        const d = Math.hypot(x - z.seed[0], y - z.seed[1]);
        if (d < nearest) nearest = d;
      }
      // Prefer low-height + far from current seeds
      const score = (1 - h / MAX_PILE_HEIGHT) * 2 + nearest / GRID_SIZE;
      if (score > bestScore) { bestScore = score; best = [x, y]; }
    }
  }
  return best;
}

// Reassign saturated zones. Returns list of zone ids that were relocated.
export function reassignSaturatedZones(
  v: VoronoiState,
  grid: GridCell[][]
): number[] {
  const relocated: number[] = [];
  for (const z of v.zones) {
    if (z.utilization >= REASSIGN_THRESHOLD) {
      const target = findRelocation(v, grid);
      z.seed = target;
      z.reassignments++;
      relocated.push(z.id);
    }
  }
  if (relocated.length) {
    recomputePartition(v);
    recomputeUtilization(v, grid);
  }
  return relocated;
}

export function bindTrucksToZones(v: VoronoiState, truckIds: string[]) {
  for (let i = 0; i < v.zones.length; i++) {
    v.zones[i].truckId = truckIds[i % truckIds.length];
  }
}

export function zoneForTruck(v: VoronoiState, truckId: string): Zone | undefined {
  return v.zones.find(z => z.truckId === truckId);
}
