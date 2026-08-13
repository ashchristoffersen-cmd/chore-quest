let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, duration: number, gainValue: number, type: OscillatorType) {
  const audio = context();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime + start);
  gain.gain.setValueAtTime(0, audio.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainValue, audio.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(audio.currentTime + start);
  osc.stop(audio.currentTime + start + duration + 0.05);
}

/** Short synthesised effects — no audio files, so nothing to download or host. */
export const sounds = {
  tick() {
    tone(880, 0, 0.12, 0.18, 'triangle');
    tone(1320, 0.08, 0.16, 0.14, 'triangle');
  },
  bonus() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 0.16, 'triangle'));
  },
  trophy() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.1, 0.35, 0.18, 'square'));
  },
  undo() {
    tone(440, 0, 0.12, 0.1, 'sine');
    tone(330, 0.08, 0.14, 0.1, 'sine');
  },
};

export type SoundName = keyof typeof sounds;

export function play(name: SoundName, enabled: boolean) {
  if (!enabled) return;
  try {
    sounds[name]();
  } catch {
    /* audio is a nice-to-have */
  }
}
