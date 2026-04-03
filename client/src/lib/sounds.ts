/**
 * sounds.ts — Pleasant notification sounds using Web Audio API.
 * No audio files needed — generates tones programmatically.
 */

/** Pleasant three-note ascending chime — signals process completion */
export function playCompletionSound() {
  try {
    const ctx = new AudioContext();
    const playNote = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.start(start);
      osc.stop(start + duration);
    };
    const now = ctx.currentTime;
    playNote(523, now, 0.15);        // C5
    playNote(659, now + 0.15, 0.15); // E5
    playNote(784, now + 0.3, 0.3);   // G5 (longer, resolves)
  } catch { /* AudioContext not available */ }
}

/** Low single tone — signals an error */
export function playErrorSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 220; // A3
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch { /* AudioContext not available */ }
}
