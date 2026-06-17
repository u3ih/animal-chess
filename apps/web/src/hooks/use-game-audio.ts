"use client";

import { useCallback } from "react";

function tone(frequency: number, duration: number, type: OscillatorType) {
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.035;
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

export function useGameAudio(enabled: boolean) {
  return {
    select: useCallback(() => {
      if (enabled) tone(330, 0.08, "triangle");
    }, [enabled]),
    move: useCallback(
      (kind: "move" | "capture") => {
        if (!enabled) return;
        tone(kind === "capture" ? 180 : 260, kind === "capture" ? 0.18 : 0.1, kind === "capture" ? "sawtooth" : "sine");
      },
      [enabled]
    ),
    win: useCallback(() => {
      if (!enabled) return;
      [523, 659, 784, 1046].forEach((frequency, index) => {
        window.setTimeout(() => tone(frequency, 0.22, "triangle"), index * 120);
      });
    }, [enabled])
  };
}
