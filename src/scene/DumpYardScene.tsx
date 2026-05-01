// Main scene wrapper + camera controller (default isometric, follow-truck mode).
import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Terrain, GridOverlay } from "@/scene/Terrain";
import { TruckMesh } from "@/scene/TruckMesh";
import { PathLines, ReservationMarkers, DustParticles, V2XBeams } from "@/scene/Effects";
import { HudOverlay } from "@/components/HudOverlay";
import { useSimulation } from "@/sim/useSimulation";
import { WORLD_SIZE } from "@/sim/grid";

function CameraRig({ followId, trucks }: { followId: string | null; trucks: any[] }) {
  const { camera } = useThree();
  const lerpTarget = useRef(new THREE.Vector3());

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (followId) {
        const t = trucks.find((x) => x.id === followId);
        if (t) {
          lerpTarget.current.set(t.position[0], t.position[1] + 2, t.position[2]);
          const offset = new THREE.Vector3(
            -Math.sin(t.heading) * 18,
            14,
            -Math.cos(t.heading) * 18
          );
          const desired = lerpTarget.current.clone().add(offset);
          camera.position.lerp(desired, 0.08);
          camera.lookAt(lerpTarget.current);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [followId, trucks, camera]);

  return null;
}

export function DumpYardScene() {
  const { state, gridRef, targetTruckCount, setTargetTruckCount, simSpeed, setSimSpeed, selectedMaterial, setSelectedMaterial } = useSimulation(5);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showEmptyGrid, setShowEmptyGrid] = useState(false);
  const [followTruck, setFollowTruck] = useState<string | null>(null);
  const [isNight, setIsNight] = useState(false);

  return (
    <div className={`relative h-full w-full ${isNight ? "bg-[#02040a]" : "bg-background"}`}>
      <Canvas
        shadows
        camera={{ position: [WORLD_SIZE * 0.55, WORLD_SIZE * 0.45, WORLD_SIZE * 0.55], fov: 38, near: 0.1, far: 1000 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[isNight ? "#02040a" : "#ffffff"]} />
        <fog attach="fog" args={[isNight ? "#02040a" : "#ffffff", 100, 350]} />

        {/* Lighting */}
        <ambientLight intensity={isNight ? 0.15 : 1.2} color={isNight ? "#445566" : "#fff0d8"} />
        <directionalLight
          position={[80, 120, 60]}
          intensity={isNight ? 0.3 : 2.0}
          color={isNight ? "#aaccff" : "#ffd9a8"}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-WORLD_SIZE / 2}
          shadow-camera-right={WORLD_SIZE / 2}
          shadow-camera-top={WORLD_SIZE / 2}
          shadow-camera-bottom={-WORLD_SIZE / 2}
          shadow-camera-near={1}
          shadow-camera-far={300}
        />
        <directionalLight position={[-60, 40, -80]} intensity={isNight ? 0.1 : 0.6} color={isNight ? "#334466" : "#8aa8d0"} />
        <hemisphereLight args={["#c8a878", "#0a0610", isNight ? 0.1 : 0.5]} />

        {/* Night Mode Stadium Floodlights */}
        {isNight && (
          <group>
            <pointLight position={[WORLD_SIZE / 2.5, 30, WORLD_SIZE / 2.5]} intensity={300} color="#ffeedd" distance={120} decay={1.5} />
            <pointLight position={[-WORLD_SIZE / 2.5, 30, -WORLD_SIZE / 2.5]} intensity={300} color="#ffeedd" distance={120} decay={1.5} />
            <pointLight position={[-WORLD_SIZE / 2.5, 30, WORLD_SIZE / 2.5]} intensity={300} color="#ffeedd" distance={120} decay={1.5} />
            <pointLight position={[WORLD_SIZE / 2.5, 30, -WORLD_SIZE / 2.5]} intensity={300} color="#ffeedd" distance={120} decay={1.5} />
          </group>
        )}

        <Terrain gridRef={gridRef} showHeatmap={showHeatmap} showEmptyGrid={showEmptyGrid} />
        <GridOverlay />

        {state.trucks.map((t) => <TruckMesh key={t.id} truck={t} isNight={isNight} />)}
        <PathLines trucks={state.trucks} />
        <ReservationMarkers gridRef={gridRef} tick={state.tick} />
        <DustParticles trucks={state.trucks} />
        <V2XBeams trucks={state.trucks} tick={state.tick} />

        {!followTruck && (
          <OrbitControls
            target={[0, 2, 0]}
            enablePan
            enableZoom
            enableRotate
            minDistance={20}
            maxDistance={250}
            maxPolarAngle={Math.PI / 2.1}
          />
        )}
        <CameraRig followId={followTruck} trucks={state.trucks} />
      </Canvas>

      <HudOverlay
        truckCount={targetTruckCount}
        onTruckCountChange={setTargetTruckCount}
        simSpeed={simSpeed}
        onSimSpeedChange={setSimSpeed}
        metrics={state.metrics}
        trucks={state.trucks}
        events={state.events}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((v) => !v)}
        showEmptyGrid={showEmptyGrid}
        onToggleEmptyGrid={() => setShowEmptyGrid((v) => !v)}
        followTruck={followTruck}
        onFollowTruck={setFollowTruck}
        selectedMaterial={selectedMaterial}
        onSelectedMaterialChange={setSelectedMaterial}
        isNight={isNight}
        onToggleNight={() => setIsNight(v => !v)}
        gridRef={gridRef}
      />
    </div>
  );
}
