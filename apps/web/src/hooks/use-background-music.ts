"use client";

import { useEffect, useRef } from "react";

/**
 * Procedural ambient background score — no audio asset needed, so it ships with the static
 * export and matches the Web Audio approach already used for SFX in `use-game-audio`.
 *
 * A slow Am–F–C–G pad bed under a soft marimba-like melody that walks an A-minor pentatonic
 * scale, fed through a feedback delay for a jungle-at-dusk shimmer. Starts/stops with `active`
 * (game screen + sound on) and fades in/out so toggling never clicks.
 */

const TEMPO = 70; // bpm — unhurried
// A-minor pentatonic, low → high. Melody walks stepwise across these.
const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];
// Pad chords (low triads): Am – F – C – G, one bar each.
const CHORDS = [
  [110, 130.81, 164.81],
  [87.31, 130.81, 174.61],
  [130.81, 164.81, 196],
  [98, 146.83, 196]
];

export function useBackgroundMusic(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active) return;

    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    void ctx.resume();

    // master chain: voices → master gain → lowpass → out, with a parallel feedback delay (wet).
    const master = ctx.createGain();
    master.gain.value = 0;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 2400;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = (60 / TEMPO) * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.34;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;

    master.connect(lowpass);
    lowpass.connect(ctx.destination);
    lowpass.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(ctx.destination);

    const fadeStart = ctx.currentTime;
    master.gain.setValueAtTime(0, fadeStart);
    master.gain.linearRampToValueAtTime(0.16, fadeStart + 2.2);

    const secondsPerBeat = 60 / TEMPO;

    function pad(chordIndex: number, time: number) {
      const dur = secondsPerBeat * 4;
      for (const freq of CHORDS[chordIndex]) {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.05, time + 0.9);
        gain.gain.linearRampToValueAtTime(0.0001, time + dur + 0.7);
        osc.connect(gain);
        gain.connect(master);
        osc.start(time);
        osc.stop(time + dur + 0.8);
      }
    }

    function pluck(freq: number, time: number, velocity: number) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const peak = 0.07 * velocity;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(peak, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.65);
      osc.connect(gain);
      gain.connect(master);
      osc.start(time);
      osc.stop(time + 0.7);
    }

    // Smooth melodic contour: walk a few scale steps each note rather than jumping randomly.
    let melodyIndex = 4;
    function nextNote() {
      const steps = [-2, -1, -1, 0, 1, 1, 2];
      const step = steps[Math.floor(Math.random() * steps.length)];
      melodyIndex = Math.min(SCALE.length - 1, Math.max(0, melodyIndex + step));
      return SCALE[melodyIndex];
    }

    let beat = 0;
    let nextTime = ctx.currentTime + 0.2;
    function scheduler() {
      while (nextTime < ctx.currentTime + 0.25) {
        const chordIndex = Math.floor(beat / 4) % CHORDS.length;
        if (beat % 4 === 0) pad(chordIndex, nextTime);
        const strong = beat % 2 === 0;
        if (Math.random() < (strong ? 0.85 : 0.5)) pluck(nextNote(), nextTime, strong ? 1 : 0.7);
        // occasional offbeat eighth for movement
        if (!strong && Math.random() < 0.3) pluck(nextNote(), nextTime + secondsPerBeat / 2, 0.5);
        beat += 1;
        nextTime += secondsPerBeat;
      }
    }
    scheduler();
    const intervalId = window.setInterval(scheduler, 40);

    return () => {
      window.clearInterval(intervalId);
      const t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0.0001, t + 1.2);
      window.setTimeout(() => {
        try {
          for (const node of [master, lowpass, delay, feedback, wet]) node.disconnect();
        } catch {
          // context may already be closed on unmount — nothing left to release
        }
      }, 1400);
    };
  }, [active]);

  // Release the shared context when the component using this hook unmounts for good.
  useEffect(() => {
    return () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);
}
