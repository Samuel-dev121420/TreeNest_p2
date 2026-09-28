// Web Audio API Sound FX Synthesizer for TreeNest
// Zero external assets, ultra-responsive, zero latency, customizable tones

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

const SFX_STORAGE_KEY = "treenest_sfx_enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(SFX_STORAGE_KEY);
  return val === null ? true : val === "true";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SFX_STORAGE_KEY, String(enabled));
  window.dispatchEvent(new CustomEvent("treenest_sfx_toggle", { detail: { enabled } }));
}

/**
 * Play a cute organic pop / leaf rustle sound when tapping the tree
 */
export function playTapPop(pitchOffset = 0) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // Subtle sine frequency sweep with pitch variations
  const baseFreq = 360 + pitchOffset * 25 + Math.random() * 40;
  osc.type = "sine";
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.04);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.12);

  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.13);
}

/**
 * Play a sparkling water droplet sound when watering the tree
 */
export function playWaterDrop() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Dual tone for authentic water drop chirp
  [0, 0.05, 0.1].forEach((delay, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = 900 + i * 260 + Math.random() * 60;
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + delay);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.7, now + delay + 0.06);

    gain.gain.setValueAtTime(0.18 / (i + 1), now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.1);
  });
}

/**
 * Play a satisfying crystal double-chime when completing tasks / checklist
 */
export function playSuccessChime() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [587.33, 880, 1174.66]; // D5, A5, D6 arpeggio

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    const startTime = now + idx * 0.08;
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.36);
  });
}

/**
 * Play card flip whoosh sound
 */
export function playCardFlip() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);
  osc.frequency.exponentialRampToValueAtTime(160, now + 0.14);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Play ascending combo streak chime that scales pitch with combo count
 */
export function playStreakChime(comboCount: number) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const baseScale = [440, 493.88, 554.37, 659.25, 739.99, 880, 987.77, 1108.73, 1318.51];
  const noteIdx = Math.min(baseScale.length - 1, Math.max(0, comboCount - 1));
  const mainFreq = baseScale[noteIdx]!;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(mainFreq, now);
  osc.frequency.exponentialRampToValueAtTime(mainFreq * 1.25, now + 0.06);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.29);
}

/**
 * Play triumphant Level Up fanfare
 */
export function playLevelUpFanfare() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, delay: 0 },    // C5
    { freq: 659.25, delay: 0.1 },  // E5
    { freq: 783.99, delay: 0.2 },  // G5
    { freq: 1046.50, delay: 0.32 }, // C6
  ];

  notes.forEach(({ freq, delay }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + delay);

    gain.gain.setValueAtTime(0.24, now + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + delay);
    osc.stop(now + delay + 0.46);
  });
}

/**
 * Play focus bell sound when timer finishes
 */
export function playFocusBell() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const harmonics = [528, 1056, 1584, 2112]; // Solfeggio 528Hz peaceful resonance

  harmonics.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    const amp = 0.28 / (idx + 1);
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4 - idx * 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 2.5);
  });
}

/* ─────────────────────────────────────────────────────────
   Ambient Procedural Audio Generator (Rain, Forest, Fire)
───────────────────────────────────────────────────────── */
export type AmbientSoundType = "rain" | "forest" | "fire" | "none";

class AmbientAudioEngine {
  private currentType: AmbientSoundType = "none";
  private nodes: Array<AudioNode | { stop?: () => void }> = [];
  private isRunning = false;

  public play(type: AmbientSoundType) {
    this.stop();
    if (type === "none" || !isSoundEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    this.currentType = type;
    this.isRunning = true;

    try {
      if (type === "rain") {
        this.createRainSound(ctx);
      } else if (type === "forest") {
        this.createForestSound(ctx);
      } else if (type === "fire") {
        this.createFireSound(ctx);
      }
    } catch (e) {
      console.warn("Could not start ambient sound generator:", e);
    }
  }

  public stop() {
    this.nodes.forEach((node) => {
      try {
        if ("stop" in node && typeof node.stop === "function") {
          node.stop();
        }
        if ("disconnect" in node && typeof (node as AudioNode).disconnect === "function") {
          (node as AudioNode).disconnect();
        }
      } catch {
        // ignore
      }
    });
    this.nodes = [];
    this.currentType = "none";
    this.isRunning = false;
  }

  public getType(): AmbientSoundType {
    return this.currentType;
  }

  private createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createRainSound(ctx: AudioContext) {
    const noiseBuffer = this.createNoiseBuffer(ctx, 4);
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start();
    this.nodes.push(whiteNoise, filter, gain);
  }

  private createForestSound(ctx: AudioContext) {
    // Gentle pink-filtered breeze
    const noiseBuffer = this.createNoiseBuffer(ctx, 4);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(320, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    this.nodes.push(noise, filter, gain);
  }

  private createFireSound(ctx: AudioContext) {
    const noiseBuffer = this.createNoiseBuffer(ctx, 4);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, ctx.currentTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    this.nodes.push(noise, filter, gain);
  }
}

export const ambientSound = new AmbientAudioEngine();
