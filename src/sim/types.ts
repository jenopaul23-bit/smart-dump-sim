// Digital twin domain types
export type MaterialType = "COAL" | "IRON_ORE" | "LIMESTONE" | "OVERBURDEN";

export interface GridCell {
  x: number;
  y: number;
  occupied: boolean;
  height: number;
  slope: number;
  accessibility: boolean;
  reserved: boolean;
  reservedUntil: number; // ms timestamp
  material?: MaterialType;
}

export type TruckState = "MOVING" | "ARRIVED" | "DUMPING" | "RETURNING" | "IDLE";

export interface Truck {
  id: string;
  state: TruckState;
  position: [number, number, number];
  heading: number; // radians
  speed: number;
  load: number; // 0..1
  size: "S" | "M" | "L";
  color: string;
  material: MaterialType;
  path: [number, number][]; // grid coords
  pathIndex: number;
  target?: [number, number]; // grid coord
  bedTilt: number; // 0..1
  wheelSpin: number;
  dumpProgress: number; // 0..1 during DUMPING
  cycleStart: number;
  lastCycleMs: number;
  totalDumps: number;
}

export interface DumpEvent {
  id: number;
  truckId: string;
  cell: [number, number];
  volume: number;
  t: number;
}

export interface Metrics {
  totalDumps: number;
  avgHeight: number;
  utilization: number;
  activeTrucks: number;
  packingDensity: number;
  throughput: number; // dumps/min
  avgCycleMs: number;
}
