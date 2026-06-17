"use client";

import type { PieceKind, Player } from "@animal-chess/game-core";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const PALETTE: Record<PieceKind, { body: string; accent: string }> = {
  rat: { body: "#8d857c", accent: "#d6b2a5" },
  cat: { body: "#d7a15b", accent: "#f5d2a2" },
  dog: { body: "#9a6a42", accent: "#d2a176" },
  wolf: { body: "#6e7682", accent: "#b8c2cf" },
  leopard: { body: "#c79a48", accent: "#efd27d" },
  tiger: { body: "#d87935", accent: "#f3bf72" },
  lion: { body: "#c58b35", accent: "#7d5324" },
  elephant: { body: "#8d9397", accent: "#c1c7cb" }
};

const OWNER_COLOR: Record<Player, string> = { red: "#c95c44", blue: "#5f8cc8" };

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

const LABEL: Record<PieceKind, string> = {
  rat: "Chuột",
  cat: "Mèo",
  dog: "Chó",
  wolf: "Sói",
  leopard: "Báo",
  tiger: "Hổ",
  lion: "Sư tử",
  elephant: "Voi"
};

type Vec3 = [number, number, number];

function Ball({ c, p, s = 1, rough = 0.5 }: { c: string; p: Vec3; s?: number | Vec3; rough?: number }) {
  return (
    <mesh castShadow position={p} scale={s}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial color={c} roughness={rough} metalness={0.02} />
    </mesh>
  );
}

function Cyl({ c, p, r, rot = [0, 0, 0] }: { c: string; p: Vec3; r: Vec3; rot?: Vec3 }) {
  return (
    <mesh castShadow position={p} rotation={rot}>
      <cylinderGeometry args={[r[0], r[1], r[2], 16]} />
      <meshStandardMaterial color={c} roughness={0.5} metalness={0.02} />
    </mesh>
  );
}

function Box({ c, p, size, rot = [0, 0, 0] }: { c: string; p: Vec3; size: Vec3; rot?: Vec3 }) {
  return (
    <mesh castShadow position={p} rotation={rot}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={c} roughness={0.5} metalness={0.02} />
    </mesh>
  );
}

function Cone({
  c,
  p,
  r = 0.12,
  h = 0.2,
  seg = 12,
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

function Body({ c, s = [0.62, 0.42, 0.42] }: { c: string; s?: Vec3 }) {
  return <Ball c={c} p={[0, 0.26, 0]} s={s} />;
}

function Head({ c, p = [0, 0.57, 0.08], s = [0.22, 0.21, 0.19] }: { c: string; p?: Vec3; s?: Vec3 }) {
  return <Ball c={c} p={p} s={s} />;
}

function Ear({ c, p, size = 0.12, tiltZ = Math.PI / 4 }: { c: string; p: Vec3; size?: number; tiltZ?: number }) {
  return <Cone c={c} p={p} r={size} h={0.2} seg={3} rot={[-0.15, 0, tiltZ]} />;
}

function Snout({ c, s }: { c: string; s: number }) {
  return <Ball c={c} p={[0, 0.53, 0.25]} s={[s, s * 0.72, 0.07]} />;
}

function Tail({ c, p, len }: { c: string; p: Vec3; len: number }) {
  return <Cyl c={c} p={p} r={[0.03, 0.04, len]} rot={[Math.PI / 2, 0, Math.PI / 2]} />;
}

function Face() {
  return (
    <group>
      <Ball c="#10110f" p={[-0.075, 0.61, 0.26]} s={0.025} />
      <Ball c="#10110f" p={[0.075, 0.61, 0.26]} s={0.025} />
      <Ball c="#1a130f" p={[0, 0.535, 0.31]} s={0.022} />
    </group>
  );
}

function Whiskers() {
  const make = (side: -1 | 1) => (
    <group key={side}>
      <Box c="#fff0cf" p={[side * 0.14, 0.53, 0.31]} size={[0.16, 0.012, 0.012]} rot={[0, 0, side * -0.18]} />
      <Box c="#fff0cf" p={[side * 0.14, 0.49, 0.3]} size={[0.14, 0.012, 0.012]} rot={[0, 0, side * 0.16]} />
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
          <Body c={pal.body} s={[0.26, 0.3, 0.2]} />
          <Head c={pal.body} p={[0, 0.52, 0.08]} s={[0.2, 0.18, 0.18]} />
          <Ball c={pal.accent} p={[-0.13, 0.66, 0.08]} s={0.07} />
          <Ball c={pal.accent} p={[0.13, 0.66, 0.08]} s={0.07} />
          <Snout c={pal.accent} s={0.07} />
          <Tail c={pal.accent} p={[-0.24, 0.18, -0.07]} len={0.34} />
          <Face />
        </group>
      );
    case "cat":
      return (
        <group>
          <Body c={pal.body} />
          <Head c={pal.body} />
          <Ear c={pal.accent} p={[-0.13, 0.72, 0.07]} />
          <Ear c={pal.accent} p={[0.13, 0.72, 0.07]} />
          <Snout c="#ffe0b6" s={0.1} />
          <Whiskers />
          <Tail c={pal.accent} p={[-0.25, 0.23, -0.1]} len={0.3} />
          <Face />
        </group>
      );
    case "dog":
      return (
        <group>
          <Body c={pal.body} s={[0.31, 0.34, 0.23]} />
          <Head c={pal.body} p={[0, 0.56, 0.08]} s={[0.23, 0.22, 0.2]} />
          <Box c={pal.accent} p={[-0.18, 0.58, 0.08]} size={[0.12, 0.26, 0.07]} rot={[0, 0, -0.45]} />
          <Box c={pal.accent} p={[0.18, 0.58, 0.08]} size={[0.12, 0.26, 0.07]} rot={[0, 0, 0.45]} />
          <Snout c="#d8b08a" s={0.13} />
          <Tail c={pal.accent} p={[-0.28, 0.28, -0.11]} len={0.32} />
          <Face />
        </group>
      );
    case "wolf":
      return (
        <group>
          <Body c={pal.body} s={[0.32, 0.36, 0.22]} />
          <Head c={pal.body} p={[0, 0.59, 0.08]} s={[0.22, 0.25, 0.19]} />
          <Ear c={pal.accent} p={[-0.15, 0.77, 0.06]} tiltZ={0.14} />
          <Ear c={pal.accent} p={[0.15, 0.77, 0.06]} tiltZ={0.14} />
          <Snout c="#c8d0d8" s={0.12} />
          <Ball c="#d9e0e6" p={[0, 0.33, 0.22]} s={[0.12, 0.16, 0.035]} />
          <Tail c={pal.accent} p={[-0.3, 0.26, -0.12]} len={0.36} />
          <Face />
        </group>
      );
    case "leopard":
      return (
        <group>
          <Body c={pal.body} s={[0.32, 0.34, 0.22]} />
          <Head c={pal.body} />
          <Ear c={pal.accent} p={[-0.14, 0.72, 0.07]} />
          <Ear c={pal.accent} p={[0.14, 0.72, 0.07]} />
          <Ball c="#3e2c18" p={[-0.1, 0.32, 0.2]} s={[0.045, 0.045, 0.02]} />
          <Ball c="#3e2c18" p={[0.11, 0.46, 0.19]} s={[0.045, 0.045, 0.02]} />
          <Ball c="#3e2c18" p={[-0.08, 0.6, 0.22]} s={[0.045, 0.045, 0.02]} />
          <Snout c="#f1d289" s={0.11} />
          <Tail c={pal.accent} p={[-0.29, 0.24, -0.1]} len={0.36} />
          <Face />
        </group>
      );
    case "tiger":
      return (
        <group>
          <Body c={pal.body} s={[0.34, 0.37, 0.23]} />
          <Head c={pal.body} p={[0, 0.59, 0.08]} s={[0.24, 0.24, 0.2]} />
          <Ear c={pal.accent} p={[-0.16, 0.75, 0.07]} />
          <Ear c={pal.accent} p={[0.16, 0.75, 0.07]} />
          <Box c="#392317" p={[-0.13, 0.38, 0.21]} size={[0.05, 0.28, 0.035]} rot={[0, 0, 0.28]} />
          <Box c="#392317" p={[0.13, 0.38, 0.21]} size={[0.05, 0.28, 0.035]} rot={[0, 0, -0.28]} />
          <Box c="#392317" p={[0, 0.59, 0.25]} size={[0.05, 0.28, 0.035]} />
          <Snout c="#ffd090" s={0.12} />
          <Tail c="#2d2117" p={[-0.31, 0.24, -0.11]} len={0.37} />
          <Face />
        </group>
      );
    case "lion":
      return (
        <group>
          <Body c={pal.body} s={[0.35, 0.38, 0.24]} />
          <Ball c={pal.accent} p={[0, 0.58, 0.07]} s={0.32} rough={0.7} />
          <Head c={pal.body} p={[0, 0.6, 0.1]} s={[0.23, 0.22, 0.19]} />
          <Ear c={pal.accent} p={[-0.19, 0.74, 0.04]} tiltZ={0.11} />
          <Ear c={pal.accent} p={[0.19, 0.74, 0.04]} tiltZ={0.11} />
          <Snout c="#f4cf8a" s={0.13} />
          <Tail c={pal.accent} p={[-0.32, 0.25, -0.12]} len={0.36} />
          <Face />
        </group>
      );
    case "elephant":
      return (
        <group>
          <Body c={pal.body} s={[0.36, 0.38, 0.25]} />
          <Head c={pal.body} p={[0, 0.57, 0.08]} s={[0.27, 0.25, 0.22]} />
          <Ball c={pal.accent} p={[-0.27, 0.58, 0.08]} s={0.17} />
          <Ball c={pal.accent} p={[0.27, 0.58, 0.08]} s={0.17} />
          <Cyl c={pal.accent} p={[0, 0.46, 0.3]} r={[0.055, 0.075, 0.24]} rot={[Math.PI / 2, 0, 0]} />
          <Cyl c={pal.accent} p={[0, 0.32, 0.34]} r={[0.045, 0.055, 0.24]} rot={[0, 0, 0.18]} />
          <Cone c="#fff3d7" p={[-0.095, 0.42, 0.32]} r={0.035} h={0.22} rot={[Math.PI / 2, 0, 0.35]} rough={0.35} />
          <Cone c="#fff3d7" p={[0.095, 0.42, 0.32]} r={0.035} h={0.22} rot={[Math.PI / 2, 0, -0.35]} rough={0.35} />
          <Face />
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

function RankBadge({ kind, owner }: { kind: PieceKind; owner: Player }) {
  const texture = useMemo(() => makeBadgeTexture(RANK[kind], LABEL[kind], owner), [kind, owner]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[0, 1.16, 0]} scale={[0.62, 0.23, 1]} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
}

/** Full piece model: base disc (team-colored), animal body, floating rank/name badge. */
export function AnimalModel({
  kind,
  owner,
  showBadge = true
}: {
  kind: PieceKind;
  owner: Player;
  showBadge?: boolean;
}) {
  return (
    <group>
      {/* team base disc + rim */}
      <Cyl c={OWNER_COLOR[owner]} p={[0, -0.06, 0]} r={[0.34, 0.38, 0.12]} />
      <Cyl c="#1d241b" p={[0, -0.13, 0]} r={[0.38, 0.4, 0.05]} />
      <AnimalGeometry kind={kind} />
      {showBadge ? <RankBadge kind={kind} owner={owner} /> : null}
    </group>
  );
}
