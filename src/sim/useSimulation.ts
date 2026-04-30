// Central simulation hook. Owns grid, trucks, metrics. Drives the FSM at
// fixed-step (~30Hz) independent of render frame rate.
import { useEffect, useRef, useState } from "react";
import type { GridCell, Truck, Metrics, DumpEvent } from "@/sim/types";
import {
  GRID_SIZE, CELL_M, MAX_PILE_HEIGHT, makeGrid, gridToWorld, worldToGrid,
} from "@/sim/grid";
import { astar } from "@/sim/pathfinding";
import {
  pickDumpCell, reserveFootprint, clearExpiredReservations, applyDump,
} from "@/sim/dumpEngine";

const TRUCK_COLORS = ["#f59e0b", "#fb923c", "#fbbf24", "#facc15", "#fdba74"];
const ENTRY_POINTS: [number, number][] = [
  [2, 2], [GRID_SIZE - 3, 2], [2, GRID_SIZE - 3], [GRID_SIZE - 3, GRID_SIZE - 3],
];

function makeTrucks(n: number): Truck[] {
  const trucks: Truck[] = [];
  for (let i = 0; i < n; i++) {
    const entry = ENTRY_POINTS[i % ENTRY_POINTS.length];
    const [wx, wz] = gridToWorld(entry[0], entry[1]);
    const sizes: ("S" | "M" | "L")[] = ["M", "L", "M", "S", "L"];
    trucks.push({
      id: `T-${(i + 1).toString().padStart(2, "0")}`,
      state: "IDLE",
      position: [wx, 0, wz],
      heading: 0,
      speed: 0,
      load: 1,
      size: sizes[i % sizes.length],
      color: TRUCK_COLORS[i % TRUCK_COLORS.length],
      path: [],
      pathIndex: 0,
      bedTilt: 0,
      wheelSpin: 0,
      dumpProgress: 0,
      cycleStart: performance.now(),
      lastCycleMs: 0,
      totalDumps: 0,
    });
  }
  return trucks;
}

export interface SimState {
  grid: GridCell[][];
  trucks: Truck[];
  metrics: Metrics;
  events: DumpEvent[];
  tick: number;
}

const TRUCK_SPEED_MPS = 6; // metres/sec

export function useSimulation(numTrucks = 5) {
  const gridRef = useRef<GridCell[][]>(makeGrid());
  const trucksRef = useRef<Truck[]>(makeTrucks(numTrucks));
  const eventsRef = useRef<DumpEvent[]>([]);
  const eventIdRef = useRef(0);
  const cycleSamplesRef = useRef<number[]>([]);
  const dumpTimestampsRef = useRef<number[]>([]);

  const [state, setState] = useState<SimState>(() => ({
    grid: gridRef.current,
    trucks: trucksRef.current,
    events: [],
    tick: 0,
    metrics: { totalDumps: 0, avgHeight: 0, utilization: 0, activeTrucks: 0, packingDensity: 0, throughput: 0, avgCycleMs: 0 },
  }));

  const lastTimeRef = useRef(performance.now());
  const tickRef = useRef(0);
  const runningRef = useRef(true);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      if (runningRef.current) step(dt, now);
      tickRef.current++;
      // Push reactive snapshot every ~6 frames to limit React work
      if (tickRef.current % 4 === 0) {
        setState({
          grid: gridRef.current,
          trucks: [...trucksRef.current],
          events: eventsRef.current.slice(-12),
          tick: tickRef.current,
          metrics: computeMetrics(now),
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function computeMetrics(now: number): Metrics {
    const g = gridRef.current;
    let sum = 0, filled = 0;
    const total = GRID_SIZE * GRID_SIZE;
    for (let y = 0; y < GRID_SIZE; y++)
      for (let x = 0; x < GRID_SIZE; x++) {
        const h = g[y][x].height;
        sum += h;
        if (h > 1.2) filled++;
      }
    const avgHeight = sum / total;
    const utilization = filled / total;
    const packingDensity = avgHeight / MAX_PILE_HEIGHT;
    const recent = dumpTimestampsRef.current.filter(t => now - t < 60000);
    dumpTimestampsRef.current = recent;
    const throughput = recent.length;
    const cs = cycleSamplesRef.current.slice(-20);
    const avgCycleMs = cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : 0;
    return {
      totalDumps: trucksRef.current.reduce((s, t) => s + t.totalDumps, 0),
      avgHeight, utilization, packingDensity, throughput, avgCycleMs,
      activeTrucks: trucksRef.current.filter(t => t.state !== "IDLE").length,
    };
  }

  function step(dt: number, now: number) {
    clearExpiredReservations(gridRef.current, now);
    for (const truck of trucksRef.current) {
      stepTruck(truck, dt, now);
    }
  }

  function stepTruck(truck: Truck, dt: number, now: number) {
    const grid = gridRef.current;
    const [tgx, tgy] = worldToGrid(truck.position[0], truck.position[2]);

    if (truck.state === "IDLE") {
      // Plan: pick a dump cell, route there
      const target = pickDumpCell(grid, [tgx, tgy], now);
      if (!target) return;
      const path = astar(grid, [tgx, tgy], target);
      if (!path || path.length < 2) return;
      reserveFootprint(grid, target, truck.heading, truck.size, now, 12000);
      truck.target = target;
      truck.path = path;
      truck.pathIndex = 1;
      truck.state = "MOVING";
      truck.cycleStart = now;
      return;
    }

    if (truck.state === "MOVING" || truck.state === "RETURNING") {
      // Follow path
      if (!truck.path.length || truck.pathIndex >= truck.path.length) {
        if (truck.state === "MOVING") {
          truck.state = "ARRIVED";
        } else {
          // Returned to entry: cycle complete
          const cycleMs = now - truck.cycleStart;
          truck.lastCycleMs = cycleMs;
          cycleSamplesRef.current.push(cycleMs);
          truck.state = "IDLE";
          truck.load = 1;
        }
        return;
      }
      const [gx, gy] = truck.path[truck.pathIndex];
      const [wx, wz] = gridToWorld(gx, gy);
      const dx = wx - truck.position[0];
      const dz = wz - truck.position[2];
      const d = Math.hypot(dx, dz);
      const move = TRUCK_SPEED_MPS * dt;
      if (d <= move) {
        truck.position = [wx, terrainHeightAt(grid, gx, gy), wz];
        truck.pathIndex++;
      } else {
        const nx = truck.position[0] + (dx / d) * move;
        const nz = truck.position[2] + (dz / d) * move;
        const [ngx, ngy] = worldToGrid(nx, nz);
        truck.position = [nx, terrainHeightAt(grid, ngx, ngy), nz];
        truck.heading = Math.atan2(dx, dz);
      }
      truck.speed = TRUCK_SPEED_MPS;
      truck.wheelSpin += dt * 6;
      return;
    }

    if (truck.state === "ARRIVED") {
      truck.speed = 0;
      truck.state = "DUMPING";
      truck.dumpProgress = 0;
      return;
    }

    if (truck.state === "DUMPING") {
      truck.dumpProgress += dt / 2.5; // ~2.5s dump
      truck.bedTilt = Math.min(1, truck.dumpProgress * 1.4);
      truck.load = Math.max(0, 1 - truck.dumpProgress);
      if (truck.dumpProgress >= 1 && truck.target) {
        // Apply material
        applyDump(grid, truck.target, 1.2);
        truck.totalDumps++;
        eventIdRef.current++;
        eventsRef.current.push({
          id: eventIdRef.current,
          truckId: truck.id,
          cell: truck.target,
          volume: 1.2,
          t: now,
        });
        dumpTimestampsRef.current.push(now);

        // Plan return
        const entry = ENTRY_POINTS[parseInt(truck.id.slice(2)) % ENTRY_POINTS.length];
        const [tgx2, tgy2] = worldToGrid(truck.position[0], truck.position[2]);
        const path = astar(grid, [tgx2, tgy2], entry, { ignoreReserved: true });
        truck.path = path && path.length > 1 ? path : [[tgx2, tgy2], entry];
        truck.pathIndex = 1;
        truck.state = "RETURNING";
        truck.bedTilt = 0;
        truck.dumpProgress = 0;
        truck.target = undefined;
      }
    }
  }

  return { state, gridRef, trucksRef };
}

function terrainHeightAt(grid: GridCell[][], gx: number, gy: number) {
  if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return 0;
  return grid[gy][gx].height;
}

export { GRID_SIZE, CELL_M };
