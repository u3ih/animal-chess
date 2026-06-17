export type Player = "red" | "blue";
export type PieceKind = "rat" | "cat" | "dog" | "wolf" | "leopard" | "tiger" | "lion" | "elephant";

export type Position = {
  row: number;
  col: number;
};

export type Piece = {
  id: string;
  owner: Player;
  kind: PieceKind;
  position: Position;
};

export type Move = {
  pieceId: string;
  from: Position;
  to: Position;
  capturedPieceId?: string;
};

export type GameStatus = { state: "playing" } | { state: "won"; winner: Player; reason: "den" | "elimination" };

export type GameState = {
  turn: Player;
  pieces: Piece[];
  history: Move[];
  lastMove?: Move;
  status: GameStatus;
};
