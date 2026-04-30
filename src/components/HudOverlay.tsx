// HUD overlay: metrics panel + truck roster + live charts + heatmap toggle.
import { useEffect, useRef } from "react";
import type { Metrics, Truck, DumpEvent } from "@/sim/types";

interface Props {
  metrics: Metrics;
  trucks: Truck[];
  events: DumpEvent[];
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  followTruck: string | null;
  onFollowTruck: (id: string | null) => void;
}

export function HudOverlay({ metrics, trucks, events, showHeatmap, onToggleHeatmap, followTruck, onFollowTruck }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
      {/* Top bar */}
      <header className="pointer-events-auto flex items-center justify-between px-6 py-3 hud-panel border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" style={{ boxShadow: "0 0 12px hsl(var(--primary))" }} />
            <h1 className="text-sm font-bold tracking-[0.3em] text-primary hud-glow">OREPACK</h1>
          </div>
          <span className="text-[10px] text-muted-foreground tracking-widest">
            AUTONOMOUS DUMP YARD · DIGITAL TWIN v1.0
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <button
            onClick={onToggleHeatmap}
            className={`px-3 py-1.5 border tracking-widest transition ${
              showHeatmap ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            HEATMAP {showHeatmap ? "ON" : "OFF"}
          </button>
          <div className="px-3 py-1.5 border border-border text-muted-foreground tracking-widest">
            STATUS: <span className="text-primary">ONLINE</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex justify-between p-4 gap-4 overflow-hidden">
        {/* Left: Metrics + Charts */}
        <div className="pointer-events-auto flex flex-col gap-3 w-72">
          <MetricsPanel metrics={metrics} />
          <ChartCard title="PACKING DENSITY" value={metrics.packingDensity} max={1} unit="%" series="density" tick={metrics.totalDumps} />
          <ChartCard title="THROUGHPUT (60s)" value={metrics.throughput} max={20} unit="dumps" series="throughput" tick={metrics.totalDumps} />
          <ChartCard title="AVG CYCLE TIME" value={metrics.avgCycleMs / 1000} max={60} unit="s" series="cycle" tick={metrics.totalDumps} />
        </div>

        {/* Right: Truck roster */}
        <div className="pointer-events-auto flex flex-col gap-3 w-72">
          <TruckRoster trucks={trucks} followTruck={followTruck} onFollow={onFollowTruck} />
          <EventLog events={events} />
        </div>
      </div>

      {/* Bottom: Legend */}
      <footer className="pointer-events-auto flex items-center justify-center gap-6 px-6 py-2 hud-panel border-t text-[10px] tracking-widest text-muted-foreground">
        <Legend color="#22d3ee" label="MOVING" />
        <Legend color="#facc15" label="ARRIVED" />
        <Legend color="#f97316" label="DUMPING" />
        <Legend color="#a78bfa" label="RETURNING" />
        <span className="text-muted-foreground">·</span>
        <span>SLOPE LIMIT: 0.6</span>
        <span>·</span>
        <span>GRID: 64×64 @ 2m</span>
      </footer>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      <span>{label}</span>
    </div>
  );
}

function MetricsPanel({ metrics }: { metrics: Metrics }) {
  return (
    <div className="hud-panel p-4">
      <div className="text-[10px] tracking-widest text-primary mb-3">// SYSTEM METRICS</div>
      <div className="grid grid-cols-2 gap-3">
        <Metric label="DUMPS" value={metrics.totalDumps.toString()} />
        <Metric label="ACTIVE" value={`${metrics.activeTrucks}`} />
        <Metric label="UTIL" value={`${(metrics.utilization * 100).toFixed(1)}%`} />
        <Metric label="AVG H" value={`${metrics.avgHeight.toFixed(2)}m`} />
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-muted-foreground tracking-widest">PACKING</span>
          <span className="text-primary">{(metrics.packingDensity * 100).toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-secondary overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
            style={{ width: `${Math.min(100, metrics.packingDensity * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] text-muted-foreground tracking-widest">{label}</div>
      <div className="text-xl font-bold text-foreground hud-glow tabular-nums">{value}</div>
    </div>
  );
}

const seriesStore: Record<string, number[]> = {};

function ChartCard({ title, value, max, unit, series, tick }: { title: string; value: number; max: number; unit: string; series: string; tick: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!seriesStore[series]) seriesStore[series] = [];
    const arr = seriesStore[series];
    arr.push(value);
    if (arr.length > 60) arr.shift();
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const w = c.width = c.offsetWidth * devicePixelRatio;
    const h = c.height = c.offsetHeight * devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    // grid
    ctx.strokeStyle = "rgba(245,158,11,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // line
    if (arr.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2 * devicePixelRatio;
      arr.forEach((v, i) => {
        const x = (i / (arr.length - 1)) * w;
        const y = h - (Math.min(max, v) / max) * h * 0.92 - 4;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      // fill
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = "rgba(245,158,11,0.15)";
      ctx.fill();
    }
  }, [tick, value, max, series]);
  return (
    <div className="hud-panel p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] tracking-widest text-primary">{title}</span>
        <span className="text-xs tabular-nums text-foreground">{value.toFixed(1)} {unit}</span>
      </div>
      <canvas ref={ref} className="w-full h-16 block" />
    </div>
  );
}

function TruckRoster({ trucks, followTruck, onFollow }: { trucks: Truck[]; followTruck: string | null; onFollow: (id: string | null) => void }) {
  return (
    <div className="hud-panel p-4">
      <div className="text-[10px] tracking-widest text-primary mb-3">// FLEET ({trucks.length})</div>
      <div className="flex flex-col gap-1.5">
        {trucks.map((t) => {
          const active = followTruck === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onFollow(active ? null : t.id)}
              className={`flex items-center justify-between px-2 py-1.5 border text-[10px] transition ${
                active ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.color, boxShadow: `0 0 6px ${t.color}` }} />
                <span className="font-bold tracking-widest">{t.id}</span>
                <span className="text-muted-foreground">{t.size}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground tabular-nums">{t.totalDumps}</span>
                <span className="text-primary tracking-widest w-16 text-right">{t.state}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventLog({ events }: { events: DumpEvent[] }) {
  return (
    <div className="hud-panel p-4 flex-1 overflow-hidden">
      <div className="text-[10px] tracking-widest text-primary mb-3">// EVENT LOG</div>
      <div className="flex flex-col gap-1 text-[10px] font-mono">
        {events.length === 0 && <span className="text-muted-foreground">Awaiting first dump...</span>}
        {events.slice().reverse().map((e) => (
          <div key={e.id} className="flex items-center gap-2 text-muted-foreground">
            <span className="text-primary">▸</span>
            <span className="text-foreground">{e.truckId}</span>
            <span>dumped @</span>
            <span className="text-accent">[{e.cell[0]},{e.cell[1]}]</span>
            <span className="ml-auto tabular-nums">{((performance.now() - e.t) / 1000).toFixed(0)}s</span>
          </div>
        ))}
      </div>
    </div>
  );
}
