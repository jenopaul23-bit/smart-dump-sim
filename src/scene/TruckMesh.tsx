// Heavy mining dump truck: chassis, articulated bed, 6 wheels, headlights.
// Drives off Truck state from the simulation.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Truck } from "@/sim/types";

interface Props { truck: Truck }

const SIZE_SCALE = { S: 0.85, M: 1, L: 1.2 } as const;

export function TruckMesh({ truck }: Props) {
  const root = useRef<THREE.Group>(null);
  const bed = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Mesh[]>([]);

  useFrame(() => {
    if (!root.current) return;
    root.current.position.set(truck.position[0], truck.position[1] + 0.6, truck.position[2]);
    root.current.rotation.y = truck.heading;
    if (bed.current) {
      bed.current.rotation.x = -truck.bedTilt * 0.85;
    }
    for (const w of wheels.current) {
      if (w) w.rotation.x = truck.wheelSpin;
    }
  });

  const s = SIZE_SCALE[truck.size];
  const bodyColor = truck.color;
  const dark = "#1a1410";
  const yellow = "#fcd34d";

  return (
    <group ref={root}>
      <group scale={[s, s, s]}>
        {/* Chassis */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[2.2, 0.5, 4.4]} />
          <meshStandardMaterial color={dark} roughness={0.7} metalness={0.4} />
        </mesh>

        {/* Cab */}
        <mesh position={[0, 1.2, 1.5]} castShadow>
          <boxGeometry args={[1.8, 1.0, 1.2]} />
          <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Cab windshield */}
        <mesh position={[0, 1.45, 2.0]} rotation={[-0.2, 0, 0]}>
          <planeGeometry args={[1.4, 0.55]} />
          <meshStandardMaterial color="#0a1418" roughness={0.1} metalness={0.9} emissive="#0a2030" emissiveIntensity={0.3} />
        </mesh>
        {/* Headlights */}
        <mesh position={[-0.6, 1.05, 2.12]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color={yellow} emissive={yellow} emissiveIntensity={1.2} />
        </mesh>
        <mesh position={[0.6, 1.05, 2.12]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color={yellow} emissive={yellow} emissiveIntensity={1.2} />
        </mesh>

        {/* Articulated dump bed */}
        <group ref={bed} position={[0, 0.85, -0.6]}>
          <mesh castShadow position={[0, 0.6, -0.6]}>
            <boxGeometry args={[2.2, 0.15, 3.2]} />
            <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.5} />
          </mesh>
          {/* Side walls */}
          <mesh position={[-1.05, 1.0, -0.6]} castShadow>
            <boxGeometry args={[0.15, 0.9, 3.2]} />
            <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[1.05, 1.0, -0.6]} castShadow>
            <boxGeometry args={[0.15, 0.9, 3.2]} />
            <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.5} />
          </mesh>
          <mesh position={[0, 1.0, -2.15]} castShadow>
            <boxGeometry args={[2.2, 0.9, 0.15]} />
            <meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.5} />
          </mesh>
          {/* Material in bed (shrinks with load) */}
          {truck.load > 0.05 && (
            <mesh position={[0, 0.85 + truck.load * 0.4, -0.6]}>
              <boxGeometry args={[2.0, truck.load * 0.7, 3.0]} />
              <meshStandardMaterial color="#5a3a20" roughness={1} />
            </mesh>
          )}
        </group>

        {/* Wheels — 6 large mining tires */}
        {[
          [-1.2, 0, 1.5], [1.2, 0, 1.5],
          [-1.2, 0, 0], [1.2, 0, 0],
          [-1.2, 0, -1.5], [1.2, 0, -1.5],
        ].map(([x, y, z], i) => (
          <mesh
            key={i}
            ref={(el) => { if (el) wheels.current[i] = el; }}
            position={[x, y, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.55, 0.55, 0.45, 16]} />
            <meshStandardMaterial color="#0a0a0a" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Status indicator on top */}
      <mesh position={[0, 2.6 * s, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial
          color={statusColor(truck.state)}
          emissive={statusColor(truck.state)}
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  );
}

function statusColor(s: Truck["state"]): string {
  switch (s) {
    case "MOVING": return "#22d3ee";
    case "ARRIVED": return "#facc15";
    case "DUMPING": return "#f97316";
    case "RETURNING": return "#a78bfa";
    default: return "#64748b";
  }
}
