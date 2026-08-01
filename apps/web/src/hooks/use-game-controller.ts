"use client";

import {
  type AiLevel,
  applyMove,
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
import { useAiWorker } from "@/hooks/use-ai-worker";
import { useBackgroundMusic } from "@/hooks/use-background-music";
import { useGameAudio } from "@/hooks/use-game-audio";
import { useHaptics } from "@/hooks/use-haptics";
import { useOnlineGame } from "@/hooks/use-online-game";
import { usePlayerIdentity } from "@/hooks/use-player-identity";
import { useSocial } from "@/hooks/use-social";
import { MOVE_SECONDS, setClock } from "@/lib/clock-store";
import { STATIC_EXPORT } from "@/lib/flags";
import { withViewTransition } from "@/lib/view-transition";

export type Mode = "ai" | "online";

export const PIECE_ORDER = Object.keys(PIECE_RANK) as PieceKind[];

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

/**
 * All non-presentational game logic for the Home screen: local/online state, the AI loop, move
 * handling, and derived board data. Keeps `page.tsx` focused on rendering + i18n.
 */
export function useGameController() {
  const [screen, setScreen] = useState<"menu" | "lobby" | "game">("menu");
  const [showRules, setShowRules] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");
  const [aiLevel, setAiLevel] = useState<AiLevel>("medium");
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [past, setPast] = useState<GameState[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string>();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [username, setUsername] = useState<string>();
  const audio = useGameAudio(audioEnabled);
  useBackgroundMusic(screen === "game" && audioEnabled);
  const haptics = useHaptics(hapticsEnabled);
  const hapticsRef = useRef(haptics);
  hapticsRef.current = haptics;
  const requestAiMove = useAiWorker();

  // Hydrate the haptics preference on mount (avoids an SSR/localStorage hydration mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    setHapticsEnabled(window.localStorage.getItem("animal-chess-haptics") !== "off");
  }, []);

  function updateHaptics(next: boolean) {
    setHapticsEnabled(next);
    if (typeof window !== "undefined") window.localStorage.setItem("animal-chess-haptics", next ? "on" : "off");
  }
  const { identity, signInGuest, signOutGuest } = usePlayerIdentity(username);
  const online = useOnlineGame(identity);
  const social = useSocial(identity);
  // Latest state, so an async AI reply can detect whether undo/reset/menu/forfeit replaced it.
  const stateRef = useRef(state);
  stateRef.current = state;

  /** Switch to online mode and join a Node room by code (lobby join / invite accept / deep link). */
  function joinOnlineRoom(roomCode: string) {
    withViewTransition(() => {
      setMode("online");
      setScreen("lobby");
    });
    online.joinRoom(roomCode.toUpperCase());
  }

  // Deep link: `?room=CODE` auto-joins that room once, then strips the param.
  const deepLinkDone = useRef(false);
  const joinOnlineRoomRef = useRef(joinOnlineRoom);
  joinOnlineRoomRef.current = joinOnlineRoom;
  useEffect(() => {
    if (STATIC_EXPORT || deepLinkDone.current || typeof window === "undefined") return;
    const code = new URLSearchParams(window.location.search).get("room");
    if (!code) return;
    deepLinkDone.current = true;
    joinOnlineRoomRef.current(code);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  // Online screen follows the room phase: lobby (browser / ready room) ↔ game (board).
  // A vanished snapshot while on the board (opponent left / room closed) falls back to the lobby.
  const onlinePhase = online.phase;
  useEffect(() => {
    if (mode !== "online") return;
    if (onlinePhase === "playing") withViewTransition(() => setScreen("game"));
    else if (onlinePhase === "lobby") withViewTransition(() => setScreen("lobby"));
    else setScreen((prev) => (prev === "game" ? "lobby" : prev));
  }, [mode, onlinePhase]);

  const liveState = mode === "online" && online.snapshot ? online.snapshot.state : state;
  const legalMoves = useMemo(
    () => (selectedPieceId ? legalMovesForPiece(liveState, selectedPieceId) : []),
    [selectedPieceId, liveState]
  );
  const selectedPiece = selectedPieceId ? liveState.pieces.find((piece) => piece.id === selectedPieceId) : undefined;
  const localColor = mode === "ai" ? "red" : online.localPlayer?.color;
  const canAct = liveState.status.state === "playing" && localColor === liveState.turn;
  // Captured trophies per side: a kind is "captured by red" when no blue piece of that kind remains.
  const captured = useMemo(
    () => ({
      red: PIECE_ORDER.filter(
        (kind) => !liveState.pieces.some((piece) => piece.owner === "blue" && piece.kind === kind)
      ),
      blue: PIECE_ORDER.filter(
        (kind) => !liveState.pieces.some((piece) => piece.owner === "red" && piece.kind === kind)
      )
    }),
    [liveState]
  );

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

  // AI mode: count down the human's 90s per move and forfeit to blue on timeout. The clock lives in
  // the external store (leaf BadgeClock subscribes), so ticking it never re-renders the game tree.
  // Online mode's clock is driven by the server via `setClock` in useOnlineGame.
  // biome-ignore lint/correctness/useExhaustiveDependencies: history length drives a fresh countdown each move.
  useEffect(() => {
    if (mode !== "ai") return;
    if (state.status.state !== "playing" || state.turn !== "red") {
      setClock({ red: MOVE_SECONDS, blue: MOVE_SECONDS });
      return;
    }
    let seconds = MOVE_SECONDS;
    setClock({ red: seconds, blue: MOVE_SECONDS });
    const id = window.setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        window.clearInterval(id);
        setClock({ red: 0, blue: MOVE_SECONDS });
        setState((current) =>
          current.status.state === "playing" && current.turn === "red"
            ? { ...current, status: { state: "won", winner: "blue", reason: "elimination" } }
            : current
        );
        return;
      }
      setClock({ red: seconds, blue: MOVE_SECONDS });
    }, 1000);
    return () => window.clearInterval(id);
  }, [mode, state.turn, state.status.state, state.history.length]);

  // Haptics mirror the sound cues. Watching `liveState` covers AI mode, your own online move, and the
  // opponent's move uniformly. Only buzz when history grows (guards undo/reset, which shrink it).
  const prevHistoryLen = useRef(liveState.history.length);
  useEffect(() => {
    const len = liveState.history.length;
    if (len > prevHistoryLen.current && liveState.lastMove) {
      hapticsRef.current.move(liveState.lastMove.capturedPieceId ? "capture" : "move");
    }
    prevHistoryLen.current = len;
  }, [liveState]);
  useEffect(() => {
    if (liveState.status.state === "won") hapticsRef.current.win();
  }, [liveState.status.state]);

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
    if (mode === "ai") {
      withViewTransition(() => {
        resetGame();
        setScreen("game");
      });
    } else {
      // Online: enter the lobby (room browser); the match board opens once the host starts.
      withViewTransition(() => setScreen("lobby"));
    }
  }

  function goMenu() {
    if (mode === "online" && online.snapshot) online.leaveRoom();
    withViewTransition(() => {
      setScreen("menu");
      setSelectedPieceId(undefined);
    });
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
      // Think off the main thread; keep the 380ms cosmetic beat so the reply doesn't feel instant.
      const think = requestAiMove(next, aiLevel, "blue");
      const delay = new Promise<void>((resolve) => window.setTimeout(resolve, 380));
      void Promise.all([think, delay]).then(([reply]) => {
        if (!reply) return;
        // Discard a stale reply if undo/reset/menu/forfeit replaced the state while the worker thought.
        if (stateRef.current !== next) return;
        const aiState = applyMove(next, reply);
        audio.move(aiState.lastMove?.capturedPieceId ? "capture" : "move");
        setState(aiState);
        if (aiState.status.state === "won") audio.win();
      });
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
    haptics.select();
  }

  // Stable identity for the board's click handler so the memoized 3D Canvas / RankRail won't
  // re-render on every clock tick (the clock lives in an external store, not the game state).
  const cellClickRef = useRef(handleCellClick);
  cellClickRef.current = handleCellClick;
  const stableCellClick = useRef((position: Position) => cellClickRef.current(position)).current;

  // Stable identity so the memoized RankRail keeps its onSelect prop reference across renders.
  const selectPieceRef = useRef(selectPiece);
  selectPieceRef.current = selectPiece;
  const stableSelectPiece = useRef((piece: Piece) => selectPieceRef.current(piece)).current;

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
    hapticsEnabled,
    setHapticsEnabled: updateHaptics,
    hapticsSupported: haptics.supported,
    past,
    selectedPieceId,
    // identity / online
    identity,
    signInGuest,
    signOutGuest,
    online,
    social,
    joinOnlineRoom,
    setUsername,
    // derived board data
    liveState,
    legalMoves,
    selectedPiece,
    localColor,
    canAct,
    captured,
    dpadMoves,
    // actions
    resetGame,
    startGame,
    goMenu,
    undoMove,
    handleCellClick: stableCellClick,
    selectPiece: stableSelectPiece,
    moveSelectedDir
  };
}
