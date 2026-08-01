import type { PieceKind } from "@animal-chess/game-core";

/**
 * Per-animal coat colors, shared by the 3D meshes and the 2D rail avatars so a piece looks like the
 * same creature in both places. `body` = main coat, `belly` = lighter underside/face, `dark` =
 * markings/limbs.
 */
export const PIECE_PALETTE: Record<PieceKind, { body: string; belly: string; dark: string }> = {
  rat: { body: "#9b9289", belly: "#d8c4b6", dark: "#6f655d" },
  cat: { body: "#e0a85c", belly: "#f7dcab", dark: "#a9762f" },
  dog: { body: "#a87145", belly: "#e0bd92", dark: "#6f4626" },
  wolf: { body: "#737d8a", belly: "#c4ccd6", dark: "#454d58" },
  leopard: { body: "#d2a64c", belly: "#f3dd95", dark: "#3c2a14" },
  tiger: { body: "#e08234", belly: "#ffd79a", dark: "#34200f" },
  lion: { body: "#d4a047", belly: "#f1d28c", dark: "#7d5324" },
  elephant: { body: "#9aa1a6", belly: "#c6ccd0", dark: "#6c7378" }
};
