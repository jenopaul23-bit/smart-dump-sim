// Main scene wrapper + camera controller (default isometric, follow-truck mode).
import { useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Sky } from "@react-three/drei";
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
  const { state, gridRef } = useSimulation(5);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [followTruck, setFollowTruck] = useState<string | null>(null);

  return (
    <div className="relative h-full w-full bg-background">
      <Canvas
        shadows
        camera={{ position: [WORLD_SIZE * 0.7, WORLD_SIZE * 0.6, WORLD_SIZE * 0.7], fov: 45, near: 0.1, far: 1000 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0d12"]} />
        <fog attach="fog" args={["#0a0d12", 100, 350]} />

        {/* Lighting */}
        <ambientLight intensity={0.35} color="#5a4a3a" />
        <directionalLight
          position={[80, 120, 60]}
          intensity={2.2}
          color="#ffd9a8"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-WORLD_SIZE / 2}
          shadow-camera-right={WORLD_SIZE / 2}
          shadow-camera-top={WORLD_SIZE / 2}
          shadow-camera-bottom={-WORLD_SIZE / 2}
          shadow-camera-near={1}
          shadow-camera-far={300}
        />
        <directionalLight position={[-60, 40, -80]} intensity={0.4} color="#8aa8d0" />
        <hemisphereLight args={["#c8a878", "#1a1410", 0.3]} />

        <Sky distance={4500} sunPosition={[80, 30, 60]} mieCoefficient={0.012} mieDirectionalG={0.85} rayleigh={2.5} turbidity={9} />

        <Terrain gridRef={gridRef} showHeatmap={showHeatmap} />
        <GridOverlay />

        {state.trucks.map((t) => <TruckMesh key={t.id} truck={t} />)}
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
        metrics={state.metrics}
        trucks={state.trucks}
        events={state.events}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((v) => !v)}
        followTruck={followTruck}
        onFollowTruck={setFollowTruck}
      />
    </div>
  );
}
