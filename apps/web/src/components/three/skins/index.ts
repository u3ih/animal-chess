import type { PieceKind } from "@animal-chess/game-core";
import type { CostumeId } from "./costumes";

export type { CostumeDef, CostumeId, CostumeSlot } from "./costumes";
export { COSTUME_IDS, COSTUMES, DEFAULT_COSTUME, getCostume } from "./costumes";

/** equipped[kind] = costume that piece-kind wears for this player; missing = default. */
export type EquippedCostumes = Partial<Record<PieceKind, CostumeId>>;
