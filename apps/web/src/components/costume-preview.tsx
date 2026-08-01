"use client";

import type { PieceKind } from "@animal-chess/game-core";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { AnimalModel } from "@/components/three/animal-meshes";
import type { CostumeId } from "@/components/three/skins";

/** Small auto-rotating turntable of one piece + its equipped costume, for the shop. */
export function CostumePreview({ kind, costumeId, label }: { kind: PieceKind; costumeId?: CostumeId; label: string }) {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.3, 2.6], fov: 42 }}>
      <color attach="background" args={["#20301a"]} />
      <hemisphereLight color="#ffe7b0" groundColor="#2f4220" intensity={1} />
      <directionalLight position={[3, 5, 3]} intensity={1.4} color="#fff1cf" />
      <group position={[0, -0.5, 0]}>
        <AnimalModel kind={kind} owner="red" label={label} costumeId={costumeId} showBadge={false} />
      </group>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.6} target={[0, 0.4, 0]} />
    </Canvas>
  );
}
