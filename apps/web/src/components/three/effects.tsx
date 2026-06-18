"use client";

import type { Player, Position } from "@animal-chess/game-core";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { tileToWorld } from "./coords";

const TEAM: Record<Player, string> = { red: "#ffb066", blue: "#67b6ff" };

/** Soft additive light shaft rising from a den to mark the goal cell. */
export function DenBeam({ pos, owner }: { pos: Position; owner: Player }) {
  const ref = useRef<THREE.Mesh>(null);
  const [wx, , wz] = tileToWorld(pos);
  useFrame((s) => {
    const m = ref.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) m.opacity = 0.16 + Math.sin(s.clock.elapsedTime * 1.6) * 0.07;
  });
  return (
    <mesh ref={ref} position={[wx, 1.7, wz]}>
      <cylinderGeometry args={[0.16, 0.52, 3.4, 22, 1, true]} />
      <meshBasicMaterial
        color={TEAM[owner]}
        transparent
        opacity={0.18}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Slow-drifting warm dust motes that give the gorge some atmosphere. */
export function Motes({ count = 70 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 13;
      speeds[i] = 0.12 + Math.random() * 0.32;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 0.7 + i) * delta * 0.15;
      if (arr[i * 3 + 1] > 5.4) arr[i * 3 + 1] = 0;
    }
    pts.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#ffe7b0"
        size={0.07}
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/** One-shot particle poof at a captured piece, mounted via a changing `key`. */
export function CaptureBurst({ pos, color }: { pos: Position; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const t = useRef(0);
  const N = 28;
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(N * 3);
    const velocities = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.4 + Math.random() * 2.6;
      velocities[i * 3] = Math.cos(a) * sp;
      velocities[i * 3 + 1] = 1.2 + Math.random() * 2.4;
      velocities[i * 3 + 2] = Math.sin(a) * sp;
    }
    return { positions, velocities };
  }, []);
  const [wx, , wz] = tileToWorld(pos);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    t.current += delta;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < N; i++) {
      arr[i * 3] += velocities[i * 3] * delta;
      arr[i * 3 + 1] += (velocities[i * 3 + 1] - t.current * 3.4) * delta;
      arr[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    const m = pts.material as THREE.PointsMaterial;
    m.opacity = Math.max(0, 1 - t.current / 0.72);
  });

  return (
    <points ref={ref} position={[wx, 0.42, wz]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.17}
        transparent
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}
