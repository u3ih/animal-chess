"use client";

import type { Move, Player, Position } from "@animal-chess/game-core";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getTerrain, pieceSurfaceY, surfaceY, tileToWorld } from "./coords";
import { tileDistance, travelDuration } from "./motion";
import { getRingGeometry } from "./shared-assets";

const TEAM: Record<Player, string> = { red: "#ffb066", blue: "#67b6ff" };
/** Kicked-up earth at the take-off / landing tile. */
const DUST_COLOR = "#d8c9a4";
const SPLASH_COLOR = "#bfe6ff";

/** Soft additive light shaft rising from a den to mark the goal cell. */
export function DenBeam({ pos, owner, reduced }: { pos: Position; owner: Player; reduced?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const [wx, , wz] = tileToWorld(pos);
  useFrame((s) => {
    if (reduced) return; // hold a static opacity under prefers-reduced-motion
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

/**
 * Generic one-shot particle poof, mounted via a changing `key` and self-expiring by opacity.
 * `delay` holds it invisible until the animal actually gets there — landing dust must not fire
 * while the piece is still mid-hop (see [motion.ts](./motion.ts)).
 */
function ParticleBurst({
  pos,
  y,
  color,
  count = 24,
  size = 0.13,
  spread = 1.4,
  rise = 1.6,
  gravity = 3.4,
  life = 0.7,
  delay = 0,
  additive = true
}: {
  pos: Position;
  y: number;
  color: string;
  count?: number;
  size?: number;
  /** Horizontal launch speed (randomised up to 2×). */
  spread?: number;
  /** Vertical launch speed (randomised up to 2×). */
  rise?: number;
  gravity?: number;
  life?: number;
  delay?: number;
  additive?: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const t = useRef(0);
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = spread * (0.5 + Math.random());
      velocities[i * 3] = Math.cos(a) * sp;
      velocities[i * 3 + 1] = rise * (0.5 + Math.random());
      velocities[i * 3 + 2] = Math.sin(a) * sp;
    }
    return { positions, velocities };
  }, [count, spread, rise]);
  const [wx, , wz] = tileToWorld(pos);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    t.current += delta;
    const age = t.current - delay;
    if (age < 0) {
      pts.visible = false;
      return;
    }
    pts.visible = true;
    const arr = pts.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += velocities[i * 3] * delta;
      arr[i * 3 + 1] += (velocities[i * 3 + 1] - age * gravity) * delta;
      arr[i * 3 + 2] += velocities[i * 3 + 2] * delta;
    }
    pts.geometry.attributes.position.needsUpdate = true;
    const m = pts.material as THREE.PointsMaterial;
    m.opacity = Math.max(0, 1 - age / life);
  });

  return (
    <points ref={ref} position={[wx, y, wz]} visible={delay === 0}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={1}
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
        sizeAttenuation
      />
    </points>
  );
}

/** One-shot particle poof at a captured piece, mounted via a changing `key`. */
export function CaptureBurst({ pos, color, delay = 0 }: { pos: Position; color: string; delay?: number }) {
  return (
    <ParticleBurst
      pos={pos}
      y={pieceSurfaceY(pos) + 0.42}
      color={color}
      count={28}
      size={0.17}
      spread={2}
      rise={2}
      delay={delay}
    />
  );
}

/** Flat ring that expands and fades — the shockwave under a take-off or a landing. */
function Shockwave({
  pos,
  color,
  from = 0.18,
  to = 0.9,
  life = 0.42,
  delay = 0,
  opacity = 0.7
}: {
  pos: Position;
  color: string;
  from?: number;
  to?: number;
  life?: number;
  delay?: number;
  opacity?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const [wx, , wz] = tileToWorld(pos);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    t.current += delta;
    const age = t.current - delay;
    if (age < 0) {
      m.visible = false;
      return;
    }
    m.visible = true;
    const k = Math.min(1, age / life);
    const s = from + (to - from) * k;
    m.scale.set(s, s, s);
    (m.material as THREE.MeshBasicMaterial).opacity = opacity * (1 - k);
  });

  return (
    <mesh
      ref={ref}
      position={[wx, surfaceY(pos) + 0.05, wz]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={delay === 0}
      renderOrder={4}
      geometry={getRingGeometry(0.62, 0.82, 30)}
    >
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Dry earth kicked up on grass: brown grit plus a low dust ring. */
function DustPuff({ pos, delay, strength = 1 }: { pos: Position; delay: number; strength?: number }) {
  return (
    <>
      <ParticleBurst
        pos={pos}
        y={surfaceY(pos) + 0.08}
        color={DUST_COLOR}
        count={Math.round(14 * strength)}
        size={0.11}
        spread={1.1 * strength}
        rise={0.9 * strength}
        gravity={2.6}
        life={0.5}
        delay={delay}
        additive={false}
      />
      <Shockwave pos={pos} color={DUST_COLOR} to={0.7 + 0.3 * strength} life={0.38} delay={delay} opacity={0.42} />
    </>
  );
}

/** Water entry/exit: pale droplets thrown upward plus a spreading ripple ring. */
function Splash({ pos, delay, strength = 1 }: { pos: Position; delay: number; strength?: number }) {
  return (
    <>
      <ParticleBurst
        pos={pos}
        y={surfaceY(pos) + 0.06}
        color={SPLASH_COLOR}
        count={Math.round(20 * strength)}
        size={0.09}
        spread={0.9}
        rise={2.1 * strength}
        gravity={5}
        life={0.6}
        delay={delay}
      />
      <Shockwave pos={pos} color={SPLASH_COLOR} from={0.14} to={1.05} life={0.55} delay={delay} opacity={0.6} />
    </>
  );
}

/**
 * All the one-shot feedback for a single move: a puff where the animal pushed off and a puff +
 * shockwave where it lands, delayed by the exact hop duration. Mount with a per-move `key` so a new
 * move restarts the animation; skip entirely under prefers-reduced-motion.
 */
export function MoveFx({ move }: { move: Move }) {
  const dist = tileDistance(move.from, move.to);
  const land = travelDuration(dist);
  // a long leap (lion/tiger over the river) hits harder at both ends
  const strength = dist > 1.2 ? 1.5 : 1;
  const fromWater = getTerrain(move.from) === "water";
  const toWater = getTerrain(move.to) === "water";

  return (
    <>
      {fromWater ? (
        <Splash pos={move.from} delay={0} />
      ) : (
        <DustPuff pos={move.from} delay={0} strength={strength} />
      )}
      {toWater ? (
        <Splash pos={move.to} delay={land} strength={strength} />
      ) : (
        <DustPuff pos={move.to} delay={land} strength={strength} />
      )}
    </>
  );
}
