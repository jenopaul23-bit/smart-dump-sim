/**
 * @file MeasurementLine.tsx
 * @description Draws an animated dashed line between Point A and Point B,
 * with an animated midpoint distance label.
 *
 * Uses a BufferGeometry line so the geometry updates reactively when
 * either point changes.
 */

import { useMemo } from "react";
import { Line, Html } from "@react-three/drei";
import * as THREE from "three";
import {
  Point3D,
  midpoint,
  formatDistance,
} from "@/lib/distanceMeasurement";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeasurementLineProps {
  /** First anchor point (Point A). */
  pointA: Point3D;
  /** Second anchor point (Point B). */
  pointB: Point3D;
  /** Pre-computed Euclidean distance between the two points. */
  distance: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a dashed line between two world-space points and displays the
 * Euclidean distance in a floating HTML chip at the midpoint.
 */
export function MeasurementLine({ pointA, pointB, distance }: MeasurementLineProps) {
  const points = useMemo(() => [
    new THREE.Vector3(pointA.x, pointA.y, pointA.z),
    new THREE.Vector3(pointB.x, pointB.y, pointB.z),
  ], [pointA, pointB]);

  const mid = midpoint(pointA, pointB);

  return (
    <group>
      {/* Dashed measurement line using Drei's Line for robust rendering and types */}
      <Line
        points={points}
        color="#00e5ff"
        lineWidth={3}
        dashed
        dashScale={1}
        dashSize={0.5}
        gapSize={0.25}
        depthTest={false}
      />

      {/* Distance chip at midpoint */}
      <group position={[mid.x, mid.y + 1.2, mid.z]}>
        <Html distanceFactor={20} style={{ pointerEvents: "none" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #0d1b2acc, #1a2e44cc)",
              border: "1.5px solid #00e5ff",
              borderRadius: "10px",
              padding: "5px 10px",
              backdropFilter: "blur(10px)",
              boxShadow: "0 0 16px #00e5ff55",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                fontFamily: "'Inter', monospace",
                fontSize: "11px",
                fontWeight: 700,
                color: "#00e5ff",
                letterSpacing: "0.06em",
                textShadow: "0 0 8px #00e5ff",
              }}
            >
              📏 {formatDistance(distance)}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
}
