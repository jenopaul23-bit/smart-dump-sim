// Voronoi zone overlay: instanced flat tiles colored per-zone with utilization
// pulse, plus seed pillars showing each zone's centroid + utilization label.
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { GRID_SIZE, CELL_M, gridToWorld } from "@/sim/grid";
import type { VoronoiState } from "@/sim/voronoi";
import { REASSIGN_THRESHOLD } from "@/sim/voronoi";

interface Props {
  voronoi: VoronoiState;
  visible: boolean;
}

const TOTAL = GRID_SIZE * GRID_SIZE;

export function VoronoiOverlay({ voronoi, visible }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorCache = useMemo(() => new THREE.Color(), []);

  // Pre-bake instance positions once (cells are static positions)
  useEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    let i = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const [wx, wz] = gridToWorld(x, y);
        dummy.position.set(wx, 0.08, wz);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.scale.set(CELL_M * 0.98, CELL_M * 0.98, 1);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        i++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  // Recolor on voronoi mutation (reassignments shift cells)
  useFrame((_, dt) => {
    const m = meshRef.current;
    if (!m || !visible) return;
    const t = performance.now() / 1000;
    let i = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const zid = voronoi.assign[i];
        const zone = voronoi.zones[zid];
        colorCache.set(zone.color);
        // Pulse if saturated
        if (zone.utilization >= REASSIGN_THRESHOLD) {
          const pulse = 0.7 + 0.3 * Math.sin(t * 6);
          colorCache.multiplyScalar(pulse);
        }
        m.setColorAt(i, colorCache);
        i++;
      }
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  if (!visible) return null;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[undefined as any, undefined as any, TOTAL]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>

      {/* Zone seed pillars + utilization labels */}
      {voronoi.zones.map((z) => {
        const [wx, wz] = gridToWorld(z.seed[0], z.seed[1]);
        const saturated = z.utilization >= REASSIGN_THRESHOLD;
        return (
          <group key={z.id} position={[wx, 0, wz]}>
            <mesh position={[0, 6, 0]}>
              <cylinderGeometry args={[0.25, 0.25, 12, 8]} />
              <meshBasicMaterial color={z.color} transparent opacity={0.55} />
            </mesh>
            <mesh position={[0, 12.4, 0]}>
              <sphereGeometry args={[0.6, 12, 12]} />
              <meshBasicMaterial color={z.color} />
            </mesh>
            <Html
              position={[0, 14, 0]}
              center
              distanceFactor={28}
              zIndexRange={[100, 0]}
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  color: z.color,
                  background: "rgba(10,13,18,0.78)",
                  border: `1px solid ${z.color}`,
                  padding: "3px 8px",
                  whiteSpace: "nowrap",
                  textShadow: `0 0 8px ${z.color}`,
                  boxShadow: saturated ? `0 0 14px ${z.color}` : "none",
                }}
              >
                Z{z.id} · {(z.utilization * 100).toFixed(0)}%
                {saturated && " ⚠"}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
