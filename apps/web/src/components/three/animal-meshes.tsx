"use client";

import type { PieceKind, Player } from "@animal-chess/game-core";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** body = main coat, belly = lighter underside/face, dark = markings/limbs. */
const PALETTE: Record<PieceKind, { body: string; belly: string; dark: string }> = {
  rat: { body: "#9b9289", belly: "#d8c4b6", dark: "#6f655d" },
  cat: { body: "#e0a85c", belly: "#f7dcab", dark: "#a9762f" },
  dog: { body: "#a87145", belly: "#e0bd92", dark: "#6f4626" },
  wolf: { body: "#737d8a", belly: "#c4ccd6", dark: "#454d58" },
  leopard: { body: "#d2a64c", belly: "#f3dd95", dark: "#3c2a14" },
  tiger: { body: "#e08234", belly: "#ffd79a", dark: "#34200f" },
  lion: { body: "#d4a047", belly: "#f1d28c", dark: "#7d5324" },
  elephant: { body: "#9aa1a6", belly: "#c6ccd0", dark: "#6c7378" }
};

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

type Vec3 = [number, number, number];

function Ball({
  c,
  p,
  s = 1,
  rough = 0.55,
  metal = 0.03
}: {
  c: string;
  p: Vec3;
  s?: number | Vec3;
  rough?: number;
  metal?: number;
}) {
  return (
    <mesh castShadow position={p} scale={s}>
      <sphereGeometry args={[1, 28, 22]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} />
    </mesh>
  );
}

function Cyl({ c, p, r, rot = [0, 0, 0], rough = 0.55 }: { c: string; p: Vec3; r: Vec3; rot?: Vec3; rough?: number }) {
  return (
    <mesh castShadow position={p} rotation={rot}>
      <cylinderGeometry args={[r[0], r[1], r[2], 18]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={0.02} />
    </mesh>
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
    <mesh castShadow position={p} rotation={rot}>
      <capsuleGeometry args={[r, len, 6, 16]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={0.02} />
    </mesh>
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
    <mesh castShadow position={p} rotation={rot}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={c} roughness={rough} metalness={0.02} />
    </mesh>
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
    <mesh castShadow position={p} rotation={rot}>
      <coneGeometry args={[r, h, seg]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={0.02} />
    </mesh>
  );
}

/** Crouched ellipsoid torso. */
function Body({ c, s = [0.34, 0.32, 0.46], y = 0.34 }: { c: string; s?: Vec3; y?: number }) {
  return <Ball c={c} p={[0, y, -0.02]} s={s} />;
}

/** Four stubby legs at the body corners, grounding the piece. */
function Legs({
  c,
  spread = 0.2,
  front = 0.2,
  h = 0.22,
  r = 0.07
}: {
  c: string;
  spread?: number;
  front?: number;
  h?: number;
  r?: number;
}) {
  const ys = h / 2 + 0.04;
  return (
    <group>
      {(
        [
          [spread, front],
          [-spread, front],
          [spread, -front],
          [-spread, -front]
        ] as [number, number][]
      ).map(([x, z]) => (
        <Capsule key={`${x}-${z}`} c={c} p={[x, ys, z]} r={r} len={h} rough={0.6} />
      ))}
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
      <Ball c="#fbf7ee" p={[x, y, z]} s={0.05} rough={0.25} />
      <mesh position={[x, y, z + 0.035]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#120d09" roughness={0.2} />
      </mesh>
      <mesh position={[x + 0.012, y + 0.014, z + 0.05]}>
        <sphereGeometry args={[0.011, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Nose({ p = [0, 0.555, 0.33], s = 0.026 }: { p?: Vec3; s?: number }) {
  return <Ball c="#1a120e" p={p} s={s} rough={0.3} />;
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
          <Legs c={pal.dark} spread={0.13} front={0.13} h={0.14} r={0.045} />
          <Body c={pal.body} s={[0.24, 0.24, 0.34]} y={0.3} />
          <Ball c={pal.belly} p={[0, 0.2, 0.12]} s={[0.18, 0.13, 0.22]} />
          <Ball c={pal.body} p={[0, 0.5, 0.16]} s={[0.18, 0.17, 0.2]} />
          <RoundEar c={pal.belly} p={[-0.14, 0.64, 0.13]} s={0.085} />
          <RoundEar c={pal.belly} p={[0.14, 0.64, 0.13]} s={0.085} />
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
          <Legs c={pal.dark} spread={0.16} front={0.16} h={0.18} r={0.055} />
          <Body c={pal.body} s={[0.28, 0.28, 0.4]} y={0.34} />
          <Ball c={pal.belly} p={[0, 0.22, 0.16]} s={[0.2, 0.15, 0.24]} />
          <Ball c={pal.body} p={[0, 0.58, 0.14]} s={[0.21, 0.2, 0.2]} />
          <Ear c={pal.dark} p={[-0.13, 0.76, 0.1]} size={0.1} />
          <Ear c={pal.dark} p={[0.13, 0.76, 0.1]} size={0.1} />
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
          <Legs c={pal.dark} spread={0.18} front={0.18} h={0.2} r={0.06} />
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
          <Tail c={pal.body} p={[0, 0.5, -0.34]} len={0.3} rot={[1.0, 0, 0]} />
        </group>
      );
    case "wolf":
      return (
        <group>
          <Legs c={pal.dark} spread={0.19} front={0.2} h={0.24} r={0.06} />
          <Body c={pal.body} s={[0.31, 0.31, 0.47]} y={0.37} />
          <Ball c={pal.belly} p={[0, 0.24, 0.18]} s={[0.22, 0.16, 0.28]} />
          <Ball c={pal.body} p={[0, 0.62, 0.16]} s={[0.21, 0.22, 0.21]} />
          <Ear c={pal.dark} p={[-0.15, 0.82, 0.12]} size={0.11} tiltZ={0.12} />
          <Ear c={pal.dark} p={[0.15, 0.82, 0.12]} size={0.11} tiltZ={0.12} />
          {/* long muzzle */}
          <Cone c={pal.belly} p={[0, 0.55, 0.34]} r={0.12} h={0.26} seg={16} rot={[Math.PI / 2, 0, 0]} />
          <Nose p={[0, 0.55, 0.47]} s={0.032} />
          <Eye x={-0.1} y={0.66} z={0.27} />
          <Eye x={0.1} y={0.66} z={0.27} />
          <Tail c={pal.body} p={[0, 0.45, -0.4]} len={0.4} r={0.06} rot={[0.7, 0, 0]} />
        </group>
      );
    case "leopard":
      return (
        <group>
          <Legs c={pal.body} spread={0.19} front={0.2} h={0.24} r={0.062} />
          <Body c={pal.body} s={[0.31, 0.3, 0.48]} y={0.37} />
          <Ball c={pal.belly} p={[0, 0.24, 0.18]} s={[0.22, 0.15, 0.3]} />
          <Ball c={pal.body} p={[0, 0.6, 0.16]} s={[0.2, 0.2, 0.2]} />
          <Ear c={pal.dark} p={[-0.13, 0.76, 0.12]} size={0.09} />
          <Ear c={pal.dark} p={[0.13, 0.76, 0.12]} size={0.09} />
          {/* rosettes */}
          {(
            [
              [-0.16, 0.34, 0.22],
              [0.13, 0.46, 0.24],
              [-0.05, 0.28, 0.3],
              [0.2, 0.3, 0.18],
              [-0.2, 0.5, 0.14]
            ] as Vec3[]
          ).map((pp) => (
            <Ball key={`${pp[0]}-${pp[1]}-${pp[2]}`} c={pal.dark} p={pp} s={[0.04, 0.04, 0.018]} rough={0.7} />
          ))}
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
          <Legs c={pal.dark} spread={0.21} front={0.22} h={0.26} r={0.07} />
          <Body c={pal.body} s={[0.34, 0.32, 0.5]} y={0.38} />
          <Ball c={pal.belly} p={[0, 0.24, 0.2]} s={[0.24, 0.16, 0.32]} />
          <Ball c={pal.body} p={[0, 0.62, 0.16]} s={[0.23, 0.22, 0.21]} />
          <Ear c={pal.dark} p={[-0.16, 0.79, 0.12]} size={0.1} />
          <Ear c={pal.dark} p={[0.16, 0.79, 0.12]} size={0.1} />
          {/* stripes */}
          <Box c={pal.dark} p={[-0.16, 0.42, 0.26]} size={[0.045, 0.3, 0.03]} rot={[0, 0, 0.3]} rough={0.7} />
          <Box c={pal.dark} p={[0.16, 0.42, 0.26]} size={[0.045, 0.3, 0.03]} rot={[0, 0, -0.3]} rough={0.7} />
          <Box c={pal.dark} p={[0, 0.66, 0.27]} size={[0.045, 0.26, 0.03]} rough={0.7} />
          <Box c={pal.dark} p={[-0.28, 0.4, -0.05]} size={[0.04, 0.34, 0.03]} rot={[0, 0, 0.25]} rough={0.7} />
          <Box c={pal.dark} p={[0.28, 0.4, -0.05]} size={[0.04, 0.34, 0.03]} rot={[0, 0, -0.25]} rough={0.7} />
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
          <Legs c={pal.body} spread={0.21} front={0.22} h={0.26} r={0.07} />
          <Body c={pal.body} s={[0.35, 0.33, 0.5]} y={0.39} />
          <Ball c={pal.belly} p={[0, 0.25, 0.2]} s={[0.24, 0.16, 0.32]} />
          {/* shaggy mane ring */}
          <Ball c={pal.dark} p={[0, 0.62, 0.06]} s={0.34} rough={0.85} />
          {Array.from({ length: 11 }, (_, i) => (i / 11) * Math.PI * 2).map((a) => (
            <Ball key={a} c={pal.dark} p={[Math.cos(a) * 0.32, 0.62 + Math.sin(a) * 0.32, 0.04]} s={0.1} rough={0.85} />
          ))}
          <Ball c={pal.body} p={[0, 0.63, 0.2]} s={[0.21, 0.2, 0.2]} />
          <RoundEar c={pal.dark} p={[-0.18, 0.78, 0.08]} s={0.07} />
          <RoundEar c={pal.dark} p={[0.18, 0.78, 0.08]} s={0.07} />
          <Snout c={pal.belly} p={[0, 0.58, 0.34]} s={0.13} />
          <Nose p={[0, 0.6, 0.42]} />
          <Eye x={-0.1} y={0.67} z={0.32} />
          <Eye x={0.1} y={0.67} z={0.32} />
          <Tail c={pal.body} p={[0, 0.42, -0.46]} len={0.46} r={0.045} rot={[0.6, 0, 0]} />
          <Ball c={pal.dark} p={[0, 0.18, -0.66]} s={0.07} rough={0.85} />
        </group>
      );
    case "elephant":
      return (
        <group>
          <Legs c={pal.dark} spread={0.24} front={0.24} h={0.28} r={0.09} />
          <Body c={pal.body} s={[0.4, 0.4, 0.5]} y={0.42} />
          <Ball c={pal.belly} p={[0, 0.28, 0.22]} s={[0.28, 0.2, 0.32]} />
          <Ball c={pal.body} p={[0, 0.66, 0.18]} s={[0.28, 0.26, 0.24]} />
          {/* big ears */}
          <Ball c={pal.dark} p={[-0.34, 0.64, 0.1]} s={[0.18, 0.22, 0.05]} rough={0.65} />
          <Ball c={pal.dark} p={[0.34, 0.64, 0.1]} s={[0.18, 0.22, 0.05]} rough={0.65} />
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
  const ctx = canvas.getContext("2d")!;
  const color = OWNER_COLOR[owner];
  // pill background
  ctx.fillStyle = "rgba(10, 12, 10, 0.82)";
  roundRect(ctx, 6, 6, 244, 84, 26);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.stroke();
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

/** Team-colored neck scarf — worn by every animal so red/blue reads instantly on the board. */
function Collar({ owner }: { owner: Player }) {
  const c = TEAM_SCARF[owner];
  return (
    <group>
      <mesh castShadow position={[0, 0.46, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.21, 0.052, 10, 24]} />
        <meshStandardMaterial color={c} roughness={0.48} metalness={0.05} />
      </mesh>
      {/* knot at the throat */}
      <Ball c={c} p={[0, 0.4, 0.25]} s={0.07} rough={0.45} />
      <Cone c={c} p={[0.04, 0.3, 0.26]} r={0.05} h={0.16} seg={4} rot={[0.4, 0, -0.3]} rough={0.45} />
      <Cone c={c} p={[-0.04, 0.3, 0.26]} r={0.05} h={0.16} seg={4} rot={[0.4, 0, 0.3]} rough={0.45} />
    </group>
  );
}

function RankBadge({ kind, owner, label }: { kind: PieceKind; owner: Player; label: string }) {
  const texture = useMemo(() => makeBadgeTexture(RANK[kind], label, owner), [kind, owner, label]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[0, 1.22, 0]} scale={[0.62, 0.23, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

/** Full piece model: base disc (team-colored), animal body, floating rank/name badge. */
export function AnimalModel({
  kind,
  owner,
  label,
  showBadge = true
}: {
  kind: PieceKind;
  owner: Player;
  /** Localized piece name baked into the badge — passed in (i18n context doesn't cross the Canvas). */
  label: string;
  showBadge?: boolean;
}) {
  return (
    <group>
      {/* team base disc + rim */}
      <Cyl c={TEAM_BASE[owner]} p={[0, -0.06, 0]} r={[0.36, 0.4, 0.12]} rough={0.38} />
      <Cyl c="#1d241b" p={[0, -0.13, 0]} r={[0.4, 0.42, 0.05]} />
      <AnimalGeometry kind={kind} />
      <Collar owner={owner} />
      {showBadge ? <RankBadge kind={kind} owner={owner} label={label} /> : null}
    </group>
  );
}
