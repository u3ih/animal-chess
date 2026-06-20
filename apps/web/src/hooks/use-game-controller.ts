"use client";

import {
  type AiLevel,
  applyMove,
  chooseAiMove,
  createInitialState,
  type GameState,
  legalMovesForPiece,
  type Move,
  PIECE_RANK,
  type Piece,
  type PieceKind,
  type Position,
  pieceAt
} from "@animal-chess/game-core";
import { useEffect, useMemo, useRef, useState } from "react";
import { getTerrain } from "@/components/three/coords";
import { useBackgroundMusic } from "@/hooks/use-background-music";
import { useGameAudio } from "@/hooks/use-game-audio";
import { useOnlineGame } from "@/hooks/use-online-game";
import { usePlayerIdentity } from "@/hooks/use-player-identity";

export type Mode = "ai" | "online";

export const PIECE_ORDER = Object.keys(PIECE_RANK) as PieceKind[];

/** Seconds allowed per move (mirrors the server's MOVE_SECONDS). */
export const MOVE_SECONDS = 90;

export type Dir = "up" | "down" | "left" | "right";

/** Screen arrow direction -> board delta, accounting for the flipped camera on the blue side. */
const DIR_DELTA: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 }
};

const ARROW_KEY: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right"
};

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * All non-presentational game logic for the Home screen: local/online state, the AI loop, move
 * handling, and derived board data. Keeps `page.tsx` focused on rendering + i18n.
 */
export function useGameController() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [showRules, setShowRules] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");
  const [aiLevel, setAiLevel] = useState<AiLevel>("medium");
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [past, setPast] = useState<GameState[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string>();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [username, setUsername] = useState<string>();
  const [aiClock, setAiClock] = useState(MOVE_SECONDS);
  const audio = useGameAudio(audioEnabled);
  useBackgroundMusic(screen === "game" && audioEnabled);
  const { identity, signInGuest, signOutGuest } = usePlayerIdentity(username);
  const online = useOnlineGame(identity);

  const liveState = mode === "online" && online.snapshot ? online.snapshot.state : state;
  const legalMoves = useMemo(
    () => (selectedPieceId ? legalMovesForPiece(liveState, selectedPieceId) : []),
    [selectedPieceId, liveState]
  );
  const selectedPiece = selectedPieceId ? liveState.pieces.find((piece) => piece.id === selectedPieceId) : undefined;
  const localColor = mode === "ai" ? "red" : online.localPlayer?.color;
  const canAct = liveState.status.state === "playing" && localColor === liveState.turn;
  const captureTargets = legalMoves.filter((move) => move.capturedPieceId).length;
  const recentMoves = liveState.history.slice(-5).reverse();
  const inspectedPosition = selectedPiece?.position ?? liveState.lastMove?.to ?? { row: 4, col: 3 };
  const inspectedTerrain = getTerrain(inspectedPosition);
  const inspectedPiece = pieceAt(liveState, inspectedPosition);
  const inspectedMove = legalMoves.find((move) => samePosition(move.to, inspectedPosition));
  const captured = {
    red: PIECE_ORDER.filter((kind) => !liveState.pieces.some((piece) => piece.owner === "blue" && piece.kind === kind)),
    blue: PIECE_ORDER.filter((kind) => !liveState.pieces.some((piece) => piece.owner === "red" && piece.kind === kind))
  };

  // The board camera is flipped for the blue player, so flip the arrow mapping to match the screen.
  const flipDirs = localColor === "blue";
  // For the selected piece, the legal move (if any) reachable by each on-screen arrow.
  const dpadMoves = useMemo(() => {
    const out: Record<Dir, Move | undefined> = { up: undefined, down: undefined, left: undefined, right: undefined };
    if (!selectedPiece) return out;
    const from = selectedPiece.position;
    for (const dir of ["up", "down", "left", "right"] as Dir[]) {
      const base = DIR_DELTA[dir];
      const want = flipDirs ? { dr: -base.dr, dc: -base.dc } : base;
      out[dir] = legalMoves.find((move) => {
        const dr = move.to.row - from.row;
        const dc = move.to.col - from.col;
        return want.dr !== 0 ? dc === 0 && Math.sign(dr) === want.dr : dr === 0 && Math.sign(dc) === want.dc;
      });
    }
    return out;
  }, [selectedPiece, legalMoves, flipDirs]);

  // Per-move countdown: online reads the server clock, AI mode runs a local one for the human (red).
  const moveSecondsLeft =
    mode === "ai"
      ? liveState.status.state === "playing" && liveState.turn === "red"
        ? aiClock
        : MOVE_SECONDS
      : online.snapshot
        ? online.timer[liveState.turn]
        : MOVE_SECONDS;

  // AI mode: count down the human's 90s per move and forfeit to blue on timeout.
  // biome-ignore lint/correctness/useExhaustiveDependencies: history length drives a fresh countdown each move.
  useEffect(() => {
    if (mode !== "ai" || state.status.state !== "playing" || state.turn !== "red") {
      setAiClock(MOVE_SECONDS);
      return;
    }
    setAiClock(MOVE_SECONDS);
    const id = window.setInterval(() => {
      setAiClock((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(id);
          setState((current) =>
            current.status.state === "playing" && current.turn === "red"
              ? { ...current, status: { state: "won", winner: "blue", reason: "elimination" } }
              : current
          );
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode, state.turn, state.status.state, state.history.length]);

  // Latest-ref so the keyboard listener binds once but always calls the current handler.
  const moveDirRef = useRef<(dir: Dir) => void>(() => {});
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const dir = ARROW_KEY[event.key];
      if (!dir) return;
      event.preventDefault();
      moveDirRef.current(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function resetGame() {
    setState(createInitialState());
    setSelectedPieceId(undefined);
    setPast([]);
  }

  function startGame() {
    if (mode === "ai") resetGame();
    setScreen("game");
  }

  function goMenu() {
    setScreen("menu");
    setSelectedPieceId(undefined);
  }

  function undoMove() {
    if (mode !== "ai" || past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((stack) => stack.slice(0, -1));
    setState(previous);
    setSelectedPieceId(undefined);
  }

  function commitMove(move: Pick<Move, "pieceId" | "to">) {
    setPast((stack) => [...stack, state]);
    const next = applyMove(state, move);
    audio.move(next.lastMove?.capturedPieceId ? "capture" : "move");
    setState(next);
    setSelectedPieceId(undefined);
    if (next.status.state === "won") {
      audio.win();
      return;
    }

    if (mode === "ai" && next.turn === "blue") {
      window.setTimeout(() => {
        const reply = chooseAiMove(next, aiLevel, "blue");
        if (!reply) return;
        const aiState = applyMove(next, reply);
        audio.move(aiState.lastMove?.capturedPieceId ? "capture" : "move");
        setState(aiState);
        if (aiState.status.state === "won") audio.win();
      }, 380);
    }
  }

  function handleCellClick(position: Position) {
    if (liveState.status.state !== "playing") return;
    const occupant = pieceAt(liveState, position);
    if (!localColor || liveState.turn !== localColor) return;
    if (occupant?.owner === localColor) {
      selectPiece(occupant);
      return;
    }
    const move = legalMoves.find((candidate) => candidate.to.row === position.row && candidate.to.col === position.col);
    if (!move) return;
    if (mode === "online") {
      online.submitMove(move);
      return;
    }
    commitMove(move);
  }

  function selectPiece(piece: Piece) {
    if (liveState.status.state !== "playing") return;
    if (!localColor || liveState.turn !== localColor || piece.owner !== localColor) return;
    setSelectedPieceId(piece.id);
    audio.select();
  }

  // Stable identity for the board's click handler so the 3D Canvas can be memoized and won't
  // re-render on every clock tick (which only updates `online.timer`, not the game state).
  const cellClickRef = useRef(handleCellClick);
  cellClickRef.current = handleCellClick;
  const stableCellClick = useRef((position: Position) => cellClickRef.current(position)).current;

  /** Nudge the selected piece one legal step/leap in the given on-screen direction. */
  function moveSelectedDir(dir: Dir) {
    if (!canAct || !selectedPiece) return;
    const move = dpadMoves[dir];
    if (!move) return;
    if (mode === "online") {
      online.submitMove(move);
      setSelectedPieceId(undefined);
      return;
    }
    commitMove(move);
  }
  moveDirRef.current = moveSelectedDir;

  return {
    // screen / mode
    screen,
    showRules,
    setShowRules,
    mode,
    setMode,
    aiLevel,
    setAiLevel,
    audioEnabled,
    setAudioEnabled,
    past,
    selectedPieceId,
    // identity / online
    identity,
    signInGuest,
    signOutGuest,
    online,
    setUsername,
    // derived board data
    liveState,
    legalMoves,
    selectedPiece,
    localColor,
    canAct,
    captureTargets,
    recentMoves,
    inspectedPosition,
    inspectedTerrain,
    inspectedPiece,
    inspectedMove,
    captured,
    dpadMoves,
    moveSecondsLeft,
    moveSecondsTotal: MOVE_SECONDS,
    // actions
    resetGame,
    startGame,
    goMenu,
    undoMove,
    handleCellClick: stableCellClick,
    selectPiece,
    moveSelectedDir
  };
}
