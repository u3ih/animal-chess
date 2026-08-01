"use client";

import type { PieceKind, Player } from "@animal-chess/game-core";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PIECE_PALETTE } from "@/lib/piece-palette";
import {
  getBasicMaterial,
  getCapsuleGeometry,
  getCollarGeometry,
  getConeGeometry,
  getCylinderGeometry,
  getStandardMaterial,
  UNIT_BOX,
  UNIT_SPHERE
} from "./shared-assets";
import { type CostumeId, DEFAULT_COSTUME, getCostume } from "./skins";

/** body = main coat, belly = lighter underside/face, dark = markings/limbs — shared with the 2D avatars. */
const PALETTE = PIECE_PALETTE;

const OWNER_COLOR: Record<Player, string> = { red: "#c95c44", blue: "#5f8cc8" };
/** Vivid team tones for the base disc + neck scarf so each side reads at a glance. */
const TEAM_BASE: Record<Player, string> = { red: "#e0563c", blue: "#4a82d6" };
const TEAM_SCARF: Record<Player, string> = { red: "#ff6a44", blue: "#5a9bff" };

const RANK: Record<PieceKind, number> = {
  rat: 1,
  cat: 2,
  dog: 3,
  wolf: 4,
  leopard: 5,
  tiger: 6,
  lion: 7,
  elephant: 8
};

/** Head-crown anchor (hat costumes) and chest anchor (body costumes), per kind. */
const HEAD_TOP: Record<PieceKind, Vec3> = {
  rat: [0, 0.66, 0.1],
  cat: [0, 0.78, 0.08],
  dog: [0, 0.78, 0.1],
  wolf: [0, 0.84, 0.1],
  leopard: [0, 0.8, 0.1],
  tiger: [0, 0.84, 0.1],
  lion: [0, 0.98, 0.06],
  elephant: [0, 0.92, 0.1]
};
const CHEST: Record<PieceKind, Vec3> = {
  rat: [0, 0.42, 0.16],
  cat: [0, 0.46, 0.18],
  dog: [0, 0.47, 0.2],
  wolf: [0, 0.5, 0.2],
  leopard: [0, 0.48, 0.2],
  tiger: [0, 0.5, 0.2],
  lion: [0, 0.5, 0.18],
  elephant: [0, 0.56, 0.22]
};

type Vec3 = [number, number, number];

function Ball({
  c,
  p,
  s = 1,
  rough = 0.5,
  metal = 0.03
}: {
  c: string;
  p: Vec3;
  s?: number | Vec3;
  rough?: number;
  metal?: number;
}) {
  return (
    <mesh castShadow position={p} scale={s} geometry={UNIT_SPHERE} material={getStandardMaterial(c, rough, metal)} />
  );
}

function Cyl({ c, p, r, rot = [0, 0, 0], rough = 0.55 }: { c: string; p: Vec3; r: Vec3; rot?: Vec3; rough?: number }) {
  return (
    <mesh
      castShadow
      position={p}
      rotation={rot}
      geometry={getCylinderGeometry(r[0], r[1], r[2])}
      material={getStandardMaterial(c, rough, 0.02)}
    />
  );
}

function Capsule({
  c,
  p,
  r,
  len,
  rot = [0, 0, 0],
  rough = 0.55
}: {
  c: string;
  p: Vec3;
  r: number;
  len: number;
  rot?: Vec3;
  rough?: number;
}) {
  return (
    <mesh
      castShadow
      position={p}
      rotation={rot}
      geometry={getCapsuleGeometry(r, len)}
      material={getStandardMaterial(c, rough, 0.02)}
    />
  );
}

function Box({
  c,
  p,
  size,
  rot = [0, 0, 0],
  rough = 0.5
}: {
  c: string;
  p: Vec3;
  size: Vec3;
  rot?: Vec3;
  rough?: number;
}) {
  return (
    <mesh
      castShadow
      position={p}
      rotation={rot}
      scale={size}
      geometry={UNIT_BOX}
      material={getStandardMaterial(c, rough, 0.02)}
    />
  );
}

function Cone({
  c,
  p,
  r = 0.12,
  h = 0.2,
  seg = 14,
  rot = [0, 0, 0],
  rough = 0.5
}: {
  c: string;
  p: Vec3;
  r?: number;
  h?: number;
  seg?: number;
  rot?: Vec3;
  rough?: number;
}) {
  return (
    <mesh
      castShadow
      position={p}
      rotation={rot}
      scale={[r, h, r]}
      geometry={getConeGeometry(seg)}
      material={getStandardMaterial(c, rough, 0.02)}
    />
  );
}

/** Crouched ellipsoid torso. */
function Body({ c, s = [0.34, 0.32, 0.46], y = 0.34 }: { c: string; s?: Vec3; y?: number }) {
  return <Ball c={c} p={[0, y, -0.02]} s={s} />;
}

/** Four stubby legs at the body corners, grounding the piece, with darker paw pads. */
function Legs({
  c,
  pad,
  spread = 0.2,
  front = 0.2,
  h = 0.22,
  r = 0.07
}: {
  c: string;
  pad?: string;
  spread?: number;
  front?: number;
  h?: number;
  r?: number;
}) {
  const ys = h / 2 + 0.04;
  const corners: [number, number][] = [
    [spread, front],
    [-spread, front],
    [spread, -front],
    [-spread, -front]
  ];
  return (
    <group>
      {corners.map(([x, z]) => (
        <Capsule key={`${x}-${z}`} c={c} p={[x, ys, z]} r={r} len={h} rough={0.6} />
      ))}
      {pad
        ? corners.map(([x, z]) => (
            <Ball
              key={`pad-${x}-${z}`}
              c={pad}
              p={[x, 0.04, z + 0.02]}
              s={[r * 1.05, r * 0.55, r * 1.15]}
              rough={0.7}
            />
          ))
        : null}
    </group>
  );
}

function Ear({ c, p, size = 0.12, tiltZ = Math.PI / 4 }: { c: string; p: Vec3; size?: number; tiltZ?: number }) {
  return <Cone c={c} p={p} r={size} h={0.22} seg={4} rot={[-0.18, 0, tiltZ]} />;
}

function RoundEar({ c, p, s = 0.1 }: { c: string; p: Vec3; s?: number }) {
  return <Ball c={c} p={p} s={s} />;
}

/** Snout pad on the front of the face. */
function Snout({ c, p = [0, 0.56, 0.27], s = 0.1 }: { c: string; p?: Vec3; s?: number }) {
  return <Ball c={c} p={p} s={[s, s * 0.72, s * 0.7]} />;
}

/** A glossy eye: white sclera, dark pupil, tiny catch-light. */
function Eye({ x, y = 0.62, z = 0.26 }: { x: number; y?: number; z?: number }) {
  return (
    <group>
      <Ball c="#fbf7ee" p={[x, y, z]} s={0.05} rough={0.2} />
      <mesh
        position={[x, y, z + 0.035]}
        scale={0.03}
        geometry={UNIT_SPHERE}
        material={getStandardMaterial("#120d09", 0.15, 0.03)}
      />
      <mesh
        position={[x + 0.012, y + 0.014, z + 0.05]}
        scale={0.011}
        geometry={UNIT_SPHERE}
        material={getBasicMaterial("#ffffff")}
      />
    </group>
  );
}

/** Angled brow ridge over each eye — gives predators a fierce read. */
function Brows({
  c,
  y,
  z = 0.3,
  x = 0.1,
  tilt = 0.5
}: {
  c: string;
  y: number;
  z?: number;
  x?: number;
  tilt?: number;
}) {
  return (
    <group>
      <Box c={c} p={[-x, y, z]} size={[0.13, 0.028, 0.03]} rot={[0, 0, tilt]} rough={0.6} />
      <Box c={c} p={[x, y, z]} size={[0.13, 0.028, 0.03]} rot={[0, 0, -tilt]} rough={0.6} />
    </group>
  );
}

function Nose({ p = [0, 0.555, 0.33], s = 0.026 }: { p?: Vec3; s?: number }) {
  return <Ball c="#1a120e" p={p} s={s} rough={0.25} />;
}

function Tail({ c, p, len, r = 0.045, rot }: { c: string; p: Vec3; len: number; r?: number; rot: Vec3 }) {
  return <Capsule c={c} p={p} r={r} len={len} rot={rot} rough={0.6} />;
}

function Whiskers() {
  const make = (side: -1 | 1) => (
    <group key={side}>
      <Box c="#fff0cf" p={[side * 0.15, 0.55, 0.32]} size={[0.17, 0.01, 0.01]} rot={[0, 0, side * -0.18]} />
      <Box c="#fff0cf" p={[side * 0.15, 0.51, 0.31]} size={[0.15, 0.01, 0.01]} rot={[0, 0, side * 0.16]} />
    </group>
  );
  return (
    <group>
      {make(-1)}
      {make(1)}
    </group>
  );
}

function AnimalGeometry({ kind }: { kind: PieceKind }) {
  const pal = PALETTE[kind];
  switch (kind) {
    case "rat":
      return (
        <group>
          <Legs c={pal.dark} pad={pal.dark} spread={0.13} front={0.13} h={0.14} r={0.045} />
          <Body c={pal.body} s={[0.24, 0.24, 0.34]} y={0.3} />
          <Ball c={pal.belly} p={[0, 0.2, 0.12]} s={[0.18, 0.13, 0.22]} />
          <Ball c={pal.body} p={[0, 0.5, 0.16]} s={[0.18, 0.17, 0.2]} />
          <RoundEar c={pal.belly} p={[-0.14, 0.64, 0.13]} s={0.085} />
          <RoundEar c={pal.belly} p={[0.14, 0.64, 0.13]} s={0.085} />
          <RoundEar c="#caa090" p={[-0.14, 0.64, 0.16]} s={0.05} />
          <RoundEar c="#caa090" p={[0.14, 0.64, 0.16]} s={0.05} />
          <Cone c={pal.belly} p={[0, 0.46, 0.34]} r={0.07} h={0.16} seg={14} rot={[Math.PI / 2, 0, 0]} />
          <Nose p={[0, 0.46, 0.42]} s={0.03} />
          <Eye x={-0.08} y={0.55} z={0.28} />
          <Eye x={0.08} y={0.55} z={0.28} />
          <Whiskers />
          <Tail c={pal.belly} p={[0, 0.28, -0.4]} len={0.4} r={0.025} rot={[0.5, 0, 0]} />
        </group>
      );
    case "cat":
      return (
        <group>
          <Legs c={pal.dark} pad={pal.dark} spread={0.16} front={0.16} h={0.18} r={0.055} />
          <Body c={pal.body} s={[0.28, 0.28, 0.4]} y={0.34} />
          <Ball c={pal.belly} p={[0, 0.22, 0.16]} s={[0.2, 0.15, 0.24]} />
          <Ball c={pal.body} p={[0, 0.58, 0.14]} s={[0.21, 0.2, 0.2]} />
          <Ear c={pal.body} p={[-0.13, 0.76, 0.1]} size={0.1} />
          <Ear c={pal.body} p={[0.13, 0.76, 0.1]} size={0.1} />
          <Ear c="#e8b6c0" p={[-0.13, 0.74, 0.12]} size={0.05} />
          <Ear c="#e8b6c0" p={[0.13, 0.74, 0.12]} size={0.05} />
          {/* tabby forehead stripes */}
          <Box c={pal.dark} p={[0, 0.68, 0.27]} size={[0.025, 0.12, 0.02]} rough={0.7} />
          <Box c={pal.dark} p={[-0.08, 0.67, 0.25]} size={[0.02, 0.1, 0.02]} rot={[0, 0, 0.3]} rough={0.7} />
          <Box c={pal.dark} p={[0.08, 0.67, 0.25]} size={[0.02, 0.1, 0.02]} rot={[0, 0, -0.3]} rough={0.7} />
          <Snout c={pal.belly} p={[0, 0.55, 0.3]} s={0.11} />
          <Nose p={[0, 0.57, 0.36]} />
          <Eye x={-0.09} y={0.63} z={0.28} />
          <Eye x={0.09} y={0.63} z={0.28} />
          <Whiskers />
          <Tail c={pal.body} p={[0, 0.42, -0.36]} len={0.34} rot={[0.9, 0, 0]} />
        </group>
      );
    case "dog":
      return (
        <group>
          <Legs c={pal.dark} pad={pal.dark} spread={0.18} front={0.18} h={0.2} r={0.06} />
          <Body c={pal.body} s={[0.3, 0.3, 0.44]} y={0.35} />
          <Ball c={pal.belly} p={[0, 0.22, 0.18]} s={[0.22, 0.16, 0.26]} />
          <Ball c={pal.body} p={[0, 0.58, 0.16]} s={[0.22, 0.21, 0.21]} />
          {/* floppy ears */}
          <Box c={pal.dark} p={[-0.21, 0.56, 0.13]} size={[0.11, 0.28, 0.07]} rot={[0, 0, -0.4]} rough={0.65} />
          <Box c={pal.dark} p={[0.21, 0.56, 0.13]} size={[0.11, 0.28, 0.07]} rot={[0, 0, 0.4]} rough={0.65} />
          <Ball c={pal.belly} p={[0, 0.5, 0.32]} s={[0.13, 0.11, 0.15]} />
          <Nose p={[0, 0.52, 0.45]} s={0.03} />
          <Eye x={-0.1} y={0.63} z={0.29} />
          <Eye x={0.1} y={0.63} z={0.29} />
          {/* lolling tongue */}
          <Box c="#e08a8a" p={[0, 0.44, 0.42]} size={[0.05, 0.09, 0.02]} rot={[0.4, 0, 0]} rough={0.5} />
          <Tail c={pal.body} p={[0, 0.5, -0.34]} len={0.3} rot={[1.0, 0, 0]} />
        </group>
      );
    case "wolf":
      return (
        <group>
          <Legs c={pal.dark} pad={pal.dark} spread={0.19} front={0.2} h={0.24} r={0.06} />
          <Body c={pal.body} s={[0.31, 0.31, 0.47]} y={0.37} />
          <Ball c={pal.belly} p={[0, 0.24, 0.18]} s={[0.22, 0.16, 0.28]} />
          <Ball c={pal.body} p={[0, 0.62, 0.16]} s={[0.21, 0.22, 0.21]} />
          <Ear c={pal.body} p={[-0.15, 0.82, 0.12]} size={0.11} tiltZ={0.12} />
          <Ear c={pal.body} p={[0.15, 0.82, 0.12]} size={0.11} tiltZ={0.12} />
          <Ear c={pal.dark} p={[-0.15, 0.8, 0.14]} size={0.06} tiltZ={0.12} />
          <Ear c={pal.dark} p={[0.15, 0.8, 0.14]} size={0.06} tiltZ={0.12} />
          {/* long muzzle */}
          <Cone c={pal.belly} p={[0, 0.55, 0.34]} r={0.12} h={0.26} seg={16} rot={[Math.PI / 2, 0, 0]} />
          <Nose p={[0, 0.55, 0.47]} s={0.032} />
          <Brows c={pal.dark} y={0.72} z={0.28} x={0.1} tilt={0.55} />
          <Eye x={-0.1} y={0.66} z={0.27} />
          <Eye x={0.1} y={0.66} z={0.27} />
          <Tail c={pal.body} p={[0, 0.45, -0.4]} len={0.4} r={0.06} rot={[0.7, 0, 0]} />
        </group>
      );
    case "leopard":
      return (
        <group>
          <Legs c={pal.body} pad={pal.dark} spread={0.19} front={0.2} h={0.24} r={0.062} />
          <Body c={pal.body} s={[0.31, 0.3, 0.48]} y={0.37} />
          <Ball c={pal.belly} p={[0, 0.24, 0.18]} s={[0.22, 0.15, 0.3]} />
          <Ball c={pal.body} p={[0, 0.6, 0.16]} s={[0.2, 0.2, 0.2]} />
          <Ear c={pal.body} p={[-0.13, 0.76, 0.12]} size={0.09} />
          <Ear c={pal.body} p={[0.13, 0.76, 0.12]} size={0.09} />
          {/* rosettes */}
          {(
            [
              [-0.16, 0.34, 0.22],
              [0.13, 0.46, 0.24],
              [-0.05, 0.28, 0.3],
              [0.2, 0.3, 0.18],
              [-0.2, 0.5, 0.14],
              [0.18, 0.5, 0.12],
              [0, 0.4, 0.31]
            ] as Vec3[]
          ).map((pp) => (
            <Ball key={`${pp[0]}-${pp[1]}-${pp[2]}`} c={pal.dark} p={pp} s={[0.04, 0.04, 0.018]} rough={0.7} />
          ))}
          <Brows c={pal.dark} y={0.69} z={0.29} x={0.09} tilt={0.45} />
          <Snout c={pal.belly} p={[0, 0.56, 0.3]} s={0.11} />
          <Nose p={[0, 0.58, 0.36]} />
          <Eye x={-0.09} y={0.64} z={0.28} />
          <Eye x={0.09} y={0.64} z={0.28} />
          <Tail c={pal.body} p={[0, 0.42, -0.42]} len={0.44} r={0.045} rot={[0.6, 0, 0]} />
        </group>
      );
    case "tiger":
      return (
        <group>
          <Legs c={pal.body} pad={pal.dark} spread={0.21} front={0.22} h={0.26} r={0.07} />
          <Body c={pal.body} s={[0.34, 0.32, 0.5]} y={0.38} />
          <Ball c={pal.belly} p={[0, 0.24, 0.2]} s={[0.24, 0.16, 0.32]} />
          <Ball c={pal.body} p={[0, 0.62, 0.16]} s={[0.23, 0.22, 0.21]} />
          <RoundEar c={pal.body} p={[-0.16, 0.79, 0.1]} s={0.08} />
          <RoundEar c={pal.body} p={[0.16, 0.79, 0.1]} s={0.08} />
          <RoundEar c={pal.dark} p={[-0.16, 0.79, 0.13]} s={0.04} />
          <RoundEar c={pal.dark} p={[0.16, 0.79, 0.13]} s={0.04} />
          {/* stripes */}
          <Box c={pal.dark} p={[-0.16, 0.42, 0.26]} size={[0.045, 0.3, 0.03]} rot={[0, 0, 0.3]} rough={0.7} />
          <Box c={pal.dark} p={[0.16, 0.42, 0.26]} size={[0.045, 0.3, 0.03]} rot={[0, 0, -0.3]} rough={0.7} />
          <Box c={pal.dark} p={[0, 0.66, 0.27]} size={[0.045, 0.26, 0.03]} rough={0.7} />
          <Box c={pal.dark} p={[-0.1, 0.7, 0.24]} size={[0.03, 0.14, 0.02]} rot={[0, 0, 0.4]} rough={0.7} />
          <Box c={pal.dark} p={[0.1, 0.7, 0.24]} size={[0.03, 0.14, 0.02]} rot={[0, 0, -0.4]} rough={0.7} />
          <Box c={pal.dark} p={[-0.28, 0.4, -0.05]} size={[0.04, 0.34, 0.03]} rot={[0, 0, 0.25]} rough={0.7} />
          <Box c={pal.dark} p={[0.28, 0.4, -0.05]} size={[0.04, 0.34, 0.03]} rot={[0, 0, -0.25]} rough={0.7} />
          <Brows c={pal.dark} y={0.71} z={0.29} x={0.11} tilt={0.5} />
          <Snout c={pal.belly} p={[0, 0.56, 0.31]} s={0.13} />
          <Nose p={[0, 0.58, 0.39]} />
          <Eye x={-0.1} y={0.66} z={0.29} />
          <Eye x={0.1} y={0.66} z={0.29} />
          <Tail c={pal.body} p={[0, 0.44, -0.44]} len={0.46} r={0.05} rot={[0.6, 0, 0]} />
        </group>
      );
    case "lion":
      return (
        <group>
          <Legs c={pal.body} pad={pal.dark} spread={0.21} front={0.22} h={0.26} r={0.07} />
          <Body c={pal.body} s={[0.35, 0.33, 0.5]} y={0.39} />
          <Ball c={pal.belly} p={[0, 0.25, 0.2]} s={[0.24, 0.16, 0.32]} />
          {/* shaggy mane ring (two layers for fullness) */}
          <Ball c={pal.dark} p={[0, 0.62, 0.06]} s={0.34} rough={0.9} />
          {Array.from({ length: 13 }, (_, i) => (i / 13) * Math.PI * 2).map((a) => (
            <Ball key={a} c={pal.dark} p={[Math.cos(a) * 0.33, 0.62 + Math.sin(a) * 0.33, 0.04]} s={0.11} rough={0.9} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (i / 9) * Math.PI * 2 + 0.3).map((a) => (
            <Ball
              key={`m2-${a}`}
              c="#6a451f"
              p={[Math.cos(a) * 0.26, 0.62 + Math.sin(a) * 0.26, -0.04]}
              s={0.09}
              rough={0.9}
            />
          ))}
          <Ball c={pal.body} p={[0, 0.63, 0.2]} s={[0.21, 0.2, 0.2]} />
          <RoundEar c={pal.dark} p={[-0.18, 0.78, 0.08]} s={0.07} />
          <RoundEar c={pal.dark} p={[0.18, 0.78, 0.08]} s={0.07} />
          <Brows c="#5e3e1a" y={0.73} z={0.31} x={0.1} tilt={0.4} />
          <Snout c={pal.belly} p={[0, 0.58, 0.34]} s={0.13} />
          <Nose p={[0, 0.6, 0.42]} />
          <Eye x={-0.1} y={0.67} z={0.32} />
          <Eye x={0.1} y={0.67} z={0.32} />
          <Tail c={pal.body} p={[0, 0.42, -0.46]} len={0.46} r={0.045} rot={[0.6, 0, 0]} />
          <Ball c={pal.dark} p={[0, 0.18, -0.66]} s={0.07} rough={0.9} />
        </group>
      );
    case "elephant":
      return (
        <group>
          <Legs c={pal.dark} pad={pal.dark} spread={0.24} front={0.24} h={0.28} r={0.09} />
          <Body c={pal.body} s={[0.4, 0.4, 0.5]} y={0.42} />
          <Ball c={pal.belly} p={[0, 0.28, 0.22]} s={[0.28, 0.2, 0.32]} />
          <Ball c={pal.body} p={[0, 0.66, 0.18]} s={[0.28, 0.26, 0.24]} />
          {/* big ears */}
          <Ball c={pal.dark} p={[-0.34, 0.64, 0.1]} s={[0.18, 0.22, 0.05]} rough={0.65} />
          <Ball c={pal.dark} p={[0.34, 0.64, 0.1]} s={[0.18, 0.22, 0.05]} rough={0.65} />
          <Ball c={pal.body} p={[-0.32, 0.64, 0.13]} s={[0.12, 0.16, 0.03]} rough={0.65} />
          <Ball c={pal.body} p={[0.32, 0.64, 0.13]} s={[0.12, 0.16, 0.03]} rough={0.65} />
          {/* trunk */}
          <Capsule c={pal.body} p={[0, 0.5, 0.38]} r={0.075} len={0.2} rot={[Math.PI / 2.4, 0, 0]} />
          <Capsule c={pal.body} p={[0, 0.32, 0.46]} r={0.06} len={0.18} rot={[0.5, 0, 0]} />
          {/* tusks */}
          <Cone
            c="#fff3d7"
            p={[-0.11, 0.46, 0.36]}
            r={0.035}
            h={0.24}
            seg={12}
            rot={[Math.PI / 2, 0, 0.3]}
            rough={0.3}
          />
          <Cone
            c="#fff3d7"
            p={[0.11, 0.46, 0.36]}
            r={0.035}
            h={0.24}
            seg={12}
            rot={[Math.PI / 2, 0, -0.3]}
            rough={0.3}
          />
          <Eye x={-0.13} y={0.68} z={0.3} />
          <Eye x={0.13} y={0.68} z={0.3} />
          <Tail c={pal.body} p={[0, 0.34, -0.5]} len={0.26} r={0.03} rot={[0.4, 0, 0]} />
        </group>
      );
  }
}

function makeBadgeTexture(rank: number, label: string, owner: Player): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");
  const color = OWNER_COLOR[owner];
  // pill background — borderless; the team read comes from the rank chip and the piece's scarf
  ctx.fillStyle = "rgba(10, 12, 10, 0.82)";
  roundRect(ctx, 6, 6, 244, 84, 26);
  ctx.fill();
  // rank chip
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(52, 48, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff8df";
  ctx.font = "800 40px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(rank), 52, 50);
  // name
  ctx.fillStyle = "#fff8df";
  ctx.font = "700 38px Arial";
  ctx.textAlign = "left";
  ctx.fillText(label, 92, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Team-colored scarf — worn by every animal so red/blue reads instantly on the board. One fixed
 * torus can't fit eight very differently sized bodies (it swallowed the elephant and sat on top of
 * the rat), so each kind carries its own band: `y` = shoulder height, `rx`/`rz` = the ring radii,
 * sized to just clear that body's silhouette at that height. Lion wears it low, under the mane.
 */
const COLLAR: Record<PieceKind, { y: number; r: number }> = {
  rat: { y: 0.44, r: 0.26 },
  cat: { y: 0.5, r: 0.3 },
  dog: { y: 0.52, r: 0.32 },
  wolf: { y: 0.55, r: 0.33 },
  leopard: { y: 0.54, r: 0.33 },
  tiger: { y: 0.56, r: 0.35 },
  lion: { y: 0.5, r: 0.36 },
  elephant: { y: 0.64, r: 0.34 }
};

function Collar({ kind, owner }: { kind: PieceKind; owner: Player }) {
  const c = TEAM_SCARF[owner];
  const { y, r } = COLLAR[kind];
  return (
    <group>
      <mesh
        castShadow
        position={[0, y, -0.02]}
        rotation={[Math.PI / 2, 0, 0]}
        geometry={getCollarGeometry(r)}
        material={getStandardMaterial(c, 0.48, 0.05)}
      />
      {/* knot at the throat, riding the front of the band */}
      <Ball c={c} p={[0, y - 0.03, r - 0.06]} s={0.055} rough={0.45} />
      <Cone c={c} p={[0.035, y - 0.11, r - 0.05]} r={0.04} h={0.14} seg={4} rot={[0.4, 0, -0.3]} rough={0.45} />
      <Cone c={c} p={[-0.035, y - 0.11, r - 0.05]} r={0.04} h={0.14} seg={4} rot={[0.4, 0, 0.3]} rough={0.45} />
    </group>
  );
}

/**
 * Floating rank/name badge. Stays always-on-top (`depthTest:false`, never clips into neighbors) but
 * fades out as the camera drops toward a low angle — where the badges would otherwise pile up and
 * clutter — and back in for top-down views. The selected/hovered piece keeps its badge at full
 * opacity via `emphasis`, so rank info is always one tap away.
 */
function RankBadge({
  kind,
  owner,
  label,
  emphasis,
  reduced
}: {
  kind: PieceKind;
  owner: Player;
  label: string;
  emphasis?: boolean;
  reduced?: boolean;
}) {
  const material = useRef<THREE.SpriteMaterial>(null);
  const texture = useMemo(() => makeBadgeTexture(RANK[kind], label, owner), [kind, owner, label]);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame(({ camera }, delta) => {
    const m = material.current;
    if (!m) return;
    const len = camera.position.length() || 1;
    // polar angle from the +Y axis: ~0.52rad at the default camera, up to maxPolarAngle 1.2 when low.
    const polar = Math.acos(THREE.MathUtils.clamp(camera.position.y / len, -1, 1));
    const target = emphasis ? 1 : 1 - THREE.MathUtils.smoothstep(polar, 0.62, 0.95);
    m.opacity = reduced ? target : THREE.MathUtils.damp(m.opacity, target, 12, delta);
  });
  return (
    <sprite position={[0, 1.22, 0]} scale={[0.52, 0.2, 1]} renderOrder={10}>
      <spriteMaterial ref={material} map={texture} transparent depthTest={false} />
    </sprite>
  );
}

/** A mounted costume accessory at its slot anchor (hat = head crown, body = chest). */
function Costume({ kind, owner, costumeId }: { kind: PieceKind; owner: Player; costumeId: CostumeId }) {
  const def = getCostume(costumeId);
  if (def.id === DEFAULT_COSTUME) return null;
  const anchor = def.slot === "hat" ? HEAD_TOP[kind] : CHEST[kind];
  return (
    <group position={anchor}>
      <def.Accessory owner={owner} />
    </group>
  );
}

/** Full piece model: base disc (team-colored), animal body, costume, floating rank/name badge. */
export function AnimalModel({
  kind,
  owner,
  label,
  costumeId = DEFAULT_COSTUME,
  showBadge = true,
  badgeEmphasis,
  reduced
}: {
  kind: PieceKind;
  owner: Player;
  /** Localized piece name baked into the badge — passed in (i18n context doesn't cross the Canvas). */
  label: string;
  /** Equipped costume id (shop). Defaults to the bare look. */
  costumeId?: CostumeId;
  showBadge?: boolean;
  /** Keep this piece's badge at full opacity regardless of camera angle (selected/hovered). */
  badgeEmphasis?: boolean;
  reduced?: boolean;
}) {
  return (
    <group>
      {/* team base disc + rim */}
      <Cyl c={TEAM_BASE[owner]} p={[0, -0.06, 0]} r={[0.36, 0.4, 0.12]} rough={0.38} />
      <Cyl c="#1d241b" p={[0, -0.13, 0]} r={[0.4, 0.42, 0.05]} />
      <AnimalGeometry kind={kind} />
      <Collar kind={kind} owner={owner} />
      <Costume kind={kind} owner={owner} costumeId={costumeId} />
      {showBadge ? (
        <RankBadge kind={kind} owner={owner} label={label} emphasis={badgeEmphasis} reduced={reduced} />
      ) : null}
    </group>
  );
}
