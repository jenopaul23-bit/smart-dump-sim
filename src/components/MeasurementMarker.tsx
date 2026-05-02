/**
 * @file MeasurementMarker.tsx
 * @description Renders a glowing sphere marker at a given 3D position.
 *
 * Used to visually indicate Point A (cyan) and Point B (orange) on the model surface.
 * The marker pulses via a spring animation to draw the user's attention.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere, Html } from "@react-three/drei";
import * as THREE from "three";
import { Point3D, formatPoint } from "@/lib/distanceMeasurement";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeasurementMarkerProps {
  /** World-space coordinates of the marker. */
  position: Point3D;
  /** Colour of the marker sphere and label badge. */
  color: string;
  /** Human-readable label shown as a floating HTML tag (e.g. "A" or "B"). */
  label: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a pulsing sphere + floating HTML label at the given 3D position.
 * The sphere is drawn on top of the model (depthTest = false) so it stays
 * visible regardless of viewing angle.
 */
export function MeasurementMarker({ position, color, label }: MeasurementMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Animate: gentle pulsing scale to make marker pop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 1 + 0.15 * Math.sin(t * 4);
    if (meshRef.current) meshRef.current.scale.setScalar(pulse);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1.6 + 0.3 * Math.sin(t * 4));
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.18 + 0.1 * Math.sin(t * 4);
    }
  });

  const pos: [number, number, number] = [position.x, position.y, position.z];

  return (
    <group position={pos}>
      {/* Soft glow halo – rendered first at larger scale */}
      <Sphere ref={glowRef} args={[0.8, 16, 16]}>
        <meshBasicMaterial color={color} transparent opacity={0.22} depthTest={false} />
      </Sphere>

      {/* Core marker sphere */}
      <Sphere ref={meshRef} args={[0.5, 24, 24]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          roughness={0.1}
          metalness={0.3}
          depthTest={false}
        />
      </Sphere>

      {/* Floating HTML badge — rendered in screen-space */}
      <Html distanceFactor={20} style={{ pointerEvents: "none" }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${color}cc, ${color}88)`,
            border: `1.5px solid ${color}`,
            borderRadius: "8px",
            padding: "4px 8px",
            minWidth: "120px",
            backdropFilter: "blur(8px)",
            boxShadow: `0 0 12px ${color}66`,
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', monospace",
              fontSize: "11px",
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: "0.05em",
            }}
          >
            Point {label}
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "9px",
              color: "#ffffffcc",
              marginTop: "2px",
            }}
          >
            {formatPoint(position)}
          </div>
        </div>
      </Html>
    </group>
  );
}
