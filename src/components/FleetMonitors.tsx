import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TruckMesh } from "@/scene/TruckMesh";
import { Terrain } from "@/scene/Terrain";
import { Truck, GridCell } from "@/sim/types";

function FPVCamera({ truck }: { truck: Truck }) {
  useFrame(({ camera }) => {
    // Cab position offset slightly left and forward
    const cabX = truck.position[0] + Math.sin(truck.heading) * 1.5 - Math.cos(truck.heading) * 0.8;
    const cabZ = truck.position[2] + Math.cos(truck.heading) * 1.5 + Math.sin(truck.heading) * 0.8;
    const cabY = truck.position[1] + 2.6; // High up in the cab
    camera.position.set(cabX, cabY, cabZ);

    const target = new THREE.Vector3(
      truck.position[0] + Math.sin(truck.heading) * 20,
      truck.position[1] + 0.5,
      truck.position[2] + Math.cos(truck.heading) * 20
    );
    camera.lookAt(target);
  });
  return null;
}

export function FleetMonitors({ trucks, isNight, gridRef }: { trucks: Truck[], isNight: boolean, gridRef: React.MutableRefObject<GridCell[][]> }) {
  return (
    <div className="absolute inset-0 z-[5] bg-background/95 backdrop-blur-xl p-6 pt-20 overflow-y-auto pointer-events-auto">
      <div className="flex items-center gap-4 mb-6 border-b border-border pb-4">
        <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: "0 0 12px red" }} />
        <h1 className="text-2xl font-bold tracking-[0.3em] text-primary">LIVE FLEET MONITORS (FPV)</h1>
        <span className="text-muted-foreground tracking-widest text-xs ml-auto">
          {trucks.length} FEED{trucks.length !== 1 && "S"} ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {trucks.map((truck) => (
          <div key={truck.id} className="hud-panel flex flex-col border border-border bg-card shadow-lg overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-border bg-black/40">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: truck.color, boxShadow: `0 0 8px ${truck.color}` }} />
                <span className="font-mono text-xs font-bold">{truck.id} FPV</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 bg-primary/20 text-primary border border-primary/50 tracking-widest">
                {truck.state}
              </span>
            </div>

            {/* 3D Viewport (First Person Camera Feed) */}
            <div className="relative h-48 w-full bg-black overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none z-10" 
                   style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)" }} />
              <div className="absolute top-2 right-2 text-[10px] text-white/50 font-mono z-10">REC</div>
              <div className="absolute top-2 left-2 text-[10px] text-white/50 font-mono z-10 animate-pulse">●</div>
              
              <Canvas camera={{ fov: 65, near: 0.5, far: 200 }} gl={{ antialias: false }}>
                <color attach="background" args={[isNight ? "#02040a" : "#6f8899"]} />
                <fogExp2 attach="fog" args={[isNight ? "#02040a" : "#6f8899", 0.015]} />
                <ambientLight intensity={isNight ? 0.2 : 1.0} />
                <directionalLight position={[80, 120, 60]} intensity={isNight ? 0.3 : 1.5} />
                <hemisphereLight args={["#c8a878", "#0a0610", isNight ? 0.1 : 0.5]} />
                
                <FPVCamera truck={truck} />
                
                <Terrain gridRef={gridRef} showHeatmap={false} showEmptyGrid={false} />
                
                {trucks.map(t => (
                  t.id !== truck.id && <TruckMesh key={t.id} truck={t} isNight={isNight} />
                ))}
              </Canvas>
            </div>

            {/* Telemetry Footer */}
            <div className="grid grid-cols-2 gap-px bg-border">
              <div className="bg-card p-2 flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground tracking-widest">PAYLOAD</span>
                <span className="text-xs font-mono text-primary">{(truck.load * 100).toFixed(0)}% {truck.material}</span>
              </div>
              <div className="bg-card p-2 flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground tracking-widest">SPEED</span>
                <span className="text-xs font-mono">{truck.speed.toFixed(1)} m/s</span>
              </div>
              <div className="bg-card p-2 flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground tracking-widest">POS (X,Z)</span>
                <span className="text-xs font-mono">{truck.position[0].toFixed(0)}, {truck.position[2].toFixed(0)}</span>
              </div>
              <div className="bg-card p-2 flex flex-col gap-0.5">
                <span className="text-[9px] text-muted-foreground tracking-widest">DUMPS</span>
                <span className="text-xs font-mono">{truck.totalDumps}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
