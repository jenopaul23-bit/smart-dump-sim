// Heightmap terrain mesh with layered ochre/brown coloring & subtle slope shading.
// Re-uploads vertex positions/colors when the underlying grid mutates.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GridCell } from "@/sim/types";
import { GRID_SIZE, CELL_M, MAX_PILE_HEIGHT } from "@/sim/grid";

interface Props {
  gridRef: React.MutableRefObject<GridCell[][]>;
  showHeatmap: boolean;
}

const SEG = GRID_SIZE; // one vertex per cell corner
const SIZE = GRID_SIZE * CELL_M;

// Color mining palette
const C_LOW = new THREE.Color("#3d2a1a");
const C_MID = new THREE.Color("#7a5230");
const C_HIGH = new THREE.Color("#b88a55");
const C_CREST = new THREE.Color("#d9b27a");

const H_LOW = new THREE.Color("#1f7a3a");
const H_MID = new THREE.Color("#e0b020");
const H_HIGH = new THREE.Color("#c0392b");

export function Terrain({ gridRef, showHeatmap }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tickRef = useRef(0);

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG - 1, SEG - 1);
    g.rotateX(-Math.PI / 2);
    const colors = new Float32Array(g.attributes.position.count * 3);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);

  useFrame(() => {
    tickRef.current++;
    if (tickRef.current % 3 !== 0) return; // throttle
    const grid = gridRef.current;
    const pos = geom.attributes.position as THREE.BufferAttribute;
    const col = geom.attributes.color as THREE.BufferAttribute;
    const c = new THREE.Color();
    for (let y = 0; y < SEG; y++) {
      for (let x = 0; x < SEG; x++) {
        const cell = grid[Math.min(GRID_SIZE - 1, y)][Math.min(GRID_SIZE - 1, x)];
        const i = y * SEG + x;
        pos.setY(i, cell.height);
        if (showHeatmap) {
          const t = Math.min(1, cell.height / MAX_PILE_HEIGHT);
          if (t < 0.5) c.lerpColors(H_LOW, H_MID, t * 2);
          else c.lerpColors(H_MID, H_HIGH, (t - 0.5) * 2);
          // mix with slope warning
          if (cell.slope > 0.45) c.lerp(new THREE.Color("#ff3030"), 0.4);
        } else {
          const t = Math.min(1, cell.height / 5);
          if (t < 0.4) c.lerpColors(C_LOW, C_MID, t / 0.4);
          else if (t < 0.75) c.lerpColors(C_MID, C_HIGH, (t - 0.4) / 0.35);
          else c.lerpColors(C_HIGH, C_CREST, (t - 0.75) / 0.25);
          // slope shading
          const sh = Math.max(0, 1 - cell.slope * 0.8);
          c.multiplyScalar(0.6 + 0.4 * sh);
        }
        col.setXYZ(i, c.r, c.g, c.b);
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    geom.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geom} receiveShadow castShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0.05} flatShading={false} />
    </mesh>
  );
}

// Subtle grid overlay
export function GridOverlay() {
  return (
    <gridHelper
      args={[SIZE, SEG, "#f59e0b", "#3a2a18"]}
      position={[0, 0.05, 0]}
    />
  );
}
