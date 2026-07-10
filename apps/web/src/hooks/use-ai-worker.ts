"use client";

import { type AiLevel, chooseAiMove, type GameState, type Move, type Player } from "@animal-chess/game-core";
import { useCallback, useEffect, useRef } from "react";
import type { AiWorkerRequest, AiWorkerResponse } from "@/workers/ai-protocol";

type Pending = { resolve: (move: Move | null) => void; recompute: () => Move | null };

/**
 * Runs the minimax AI off the main thread so the always-on 60fps board render never hitches while
 * the engine searches. The worker is created lazily on first use (never at module/render scope — SSR
 * has no `Worker`) and terminated on unmount. Falls back to a synchronous `chooseAiMove` wherever
 * workers are unavailable or one crashes, so the game stays playable everywhere (incl. static export).
 */
export function useAiWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const nextId = useRef(0);
  const disabled = useRef(false);

  useEffect(() => {
    const requests = pending.current;
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      requests.clear();
    };
  }, []);

  return useCallback((state: GameState, level: AiLevel, player: Player): Promise<Move | null> => {
    const sync = () => chooseAiMove(state, level, player) ?? null;
    if (disabled.current || typeof Worker === "undefined") return Promise.resolve(sync());

    try {
      if (!workerRef.current) {
        const worker = new Worker(new URL("../workers/ai.worker.ts", import.meta.url));
        worker.onmessage = (event: MessageEvent<AiWorkerResponse>) => {
          const entry = pending.current.get(event.data.id);
          if (!entry) return;
          pending.current.delete(event.data.id);
          entry.resolve(event.data.move);
        };
        worker.onerror = () => {
          // A crashed worker must not strand the game: resolve every in-flight request on the main
          // thread and fall back to synchronous search for the rest of the session.
          disabled.current = true;
          for (const [, entry] of pending.current) entry.resolve(entry.recompute());
          pending.current.clear();
          workerRef.current?.terminate();
          workerRef.current = null;
        };
        workerRef.current = worker;
      }
      const id = nextId.current++;
      return new Promise<Move | null>((resolve) => {
        pending.current.set(id, { resolve, recompute: sync });
        workerRef.current?.postMessage({ id, state, level, player } satisfies AiWorkerRequest);
      });
    } catch {
      disabled.current = true;
      return Promise.resolve(sync());
    }
  }, []);
}
