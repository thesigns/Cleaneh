// The "task done" fanfare (specification 5, 9.5): a short synthesized jingle
// and a happy vibration, like in Cleanerr. No audio files: a bright arpeggio
// (C6 E6 G6 C7) into a ringing chord with a few sparkles on top, rendered
// once with Web Audio. Both follow the "Sound and vibration" setting.

let context = null;
let jingle = null;

/**
 * Browsers allow sound only after a tap. Call this from the tap's handler (DONE), before any await, so the
 * jingle can play a moment later when the reward shows.
 */
export function unlockSound() {
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextClass) return;
  context ??= new AudioContextClass();
  if (context.state === 'suspended') context.resume().catch(() => {});
}

/** The jingle as samples, -1..1. */
export function synthesize(rate) {
  const seconds = 1.25;
  const out = new Float32Array(Math.floor(rate * seconds));

  /** A soft bell: a few harmonics, quick attack, exponential decay. */
  const bell = (start, freq, amp, decay, length) => {
    const from = Math.floor(start * rate);
    const to = Math.min(out.length, from + Math.floor(length * rate));
    for (let i = from; i < to; i++) {
      const t = (i - from) / rate;
      const env = Math.min(1, t / 0.004) * Math.exp(-decay * t);
      const w = 2 * Math.PI * freq * t;
      out[i] += amp * env * (Math.sin(w) + 0.35 * Math.sin(2 * w) + 0.12 * Math.sin(3 * w) + 0.05 * Math.sin(5 * w));
    }
  };

  const chord = [1046.5, 1318.51, 1567.98, 2093.0];
  // Arpeggio up...
  chord.forEach((f, i) => bell(0.075 * i, f, 0.3, 9, 0.4));
  // ...landing on a ringing chord...
  chord.forEach((f) => bell(0.32, f, 0.11, 3.6, 0.93));
  // ...with a few sparkles.
  for (const [t, f] of [[0.4, 3135.96], [0.47, 3951.07], [0.55, 4186.01], [0.64, 3520.0]]) bell(t, f, 0.06, 14, 0.3);

  // Fade the tail so the sound never ends with a click.
  const fade = Math.floor(rate / 20);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;

  let peak = 1e-6;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < out.length; i++) out[i] = (out[i] / peak) * 0.8;
  return out;
}

/** Plays the jingle and the vibration (ta-da-DAAM: two light taps and a fuller one), if allowed. */
export function celebrate(enabled) {
  if (!enabled) return;
  navigator.vibrate?.([28, 42, 28, 42, 28, 80, 150]);
  if (!context || context.state !== 'running') return;
  if (!jingle) {
    const samples = synthesize(context.sampleRate);
    jingle = context.createBuffer(1, samples.length, context.sampleRate);
    jingle.copyToChannel(samples, 0);
  }
  const source = context.createBufferSource();
  source.buffer = jingle;
  source.connect(context.destination);
  source.start();
}
