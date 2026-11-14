/**
 * PARALLAX X sound layer — every sound is synthesized in the browser with the Web Audio API
 * (original, no recordings, no third-party assets). Silent until the user explicitly enables it;
 * the preference is remembered locally. Nothing here claims to be a recording from Mars.
 */

export type Sfx = "click" | "select" | "startup" | "whoosh" | "scan" | "chime" | "reveal" | "neutral" | "tick";

export interface AudioState {
  enabled: boolean;
  volume: number; // 0..1
  ambient: boolean;
  supported: boolean;
  error: string | null;
}

const KEY = "parallax-x-audio";

type Listener = () => void;

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private motorBus: GainNode | null = null;
  private ambBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;
  private motorNodes: AudioNode[] = [];
  private ambNodes: AudioNode[] = [];
  private motorOn = false;
  private listeners = new Set<Listener>();
  private state: AudioState = { enabled: false, volume: 0.6, ambient: false, supported: true, error: null };
  private loaded = false;

  private load() {
    if (this.loaded || typeof window === "undefined") return;
    this.loaded = true;
    this.state.supported = typeof window.AudioContext !== "undefined" || "webkitAudioContext" in window;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const v = JSON.parse(raw) as Partial<AudioState>;
        // a stored "enabled" is honoured only after the next user gesture (autoplay rules): see resumeIfWanted
        this.state = { ...this.state, volume: typeof v.volume === "number" ? v.volume : this.state.volume, ambient: !!v.ambient };
        this.wanted = !!v.enabled;
      }
    } catch {}
  }

  /** remembered "on" preference; applied on the first user gesture, never automatically */
  private wanted = false;

  get snapshot(): AudioState {
    this.load();
    return this.state;
  }

  /** true when the user previously chose sound on (UI can offer a one-click "resume sound") */
  get remembered(): boolean {
    this.load();
    return this.wanted && !this.state.enabled;
  }

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = () => this.snapshot;
  private static readonly SERVER: AudioState = { enabled: false, volume: 0.6, ambient: false, supported: true, error: null };
  getServerSnapshot = (): AudioState => AudioEngine.SERVER;

  private set(p: Partial<AudioState>) {
    this.state = { ...this.state, ...p };
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ enabled: this.state.enabled, volume: this.state.volume, ambient: this.state.ambient }));
    } catch {}
    this.listeners.forEach((l) => l());
  }

  /** Must be called from a user gesture (click / key). */
  enable() {
    this.load();
    if (!this.state.supported) return;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = this.state.volume;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 3;
        this.master.connect(comp).connect(ctx.destination);
        this.sfxBus = ctx.createGain();
        this.sfxBus.gain.value = 0.9;
        this.sfxBus.connect(this.master);
        this.motorBus = ctx.createGain();
        this.motorBus.gain.value = 0;
        this.motorBus.connect(this.master);
        this.ambBus = ctx.createGain();
        this.ambBus.gain.value = 0;
        this.ambBus.connect(this.master);
        this.noise = this.makeNoise(false);
        this.brown = this.makeNoise(true);
      }
      void this.ctx.resume();
      this.set({ enabled: true, error: null });
      this.wanted = true;
      if (this.state.ambient) this.startAmbient();
      if (this.motorOn) this.startMotor();
    } catch (e) {
      this.set({ enabled: false, error: e instanceof Error ? e.message : "audio unavailable" });
    }
  }

  disable() {
    this.stopMotor(true);
    this.stopAmbient(true);
    if (this.ctx) void this.ctx.suspend();
    this.wanted = false;
    this.set({ enabled: false });
  }

  toggle() {
    if (this.state.enabled) this.disable();
    else this.enable();
  }

  setVolume(v: number) {
    const vol = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.05);
    this.set({ volume: vol });
  }

  setAmbient(on: boolean) {
    this.set({ ambient: on });
    if (!this.state.enabled) return;
    if (on) this.startAmbient();
    else this.stopAmbient();
  }

  private makeNoise(brown: boolean): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    return buf;
  }

  private env(g: GainNode, t: number, a: number, peak: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  private tone(freq: number, t: number, a: number, peak: number, dec: number, type: OscillatorType = "sine", pan = 0, glideTo?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + a + dec);
    const g = ctx.createGain();
    this.env(g, t, a, peak, dec);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    o.connect(g).connect(p).connect(this.sfxBus!);
    o.start(t);
    o.stop(t + a + dec + 0.05);
  }

  private noiseBurst(t: number, dur: number, f0: number, f1: number, peak: number, q = 1.2, pan0 = 0, pan1 = 0) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.55);
    bp.frequency.exponentialRampToValueAtTime(Math.max(120, f0 * 0.8), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(pan0, t);
    p.pan.linearRampToValueAtTime(pan1, t + dur);
    src.connect(bp).connect(g).connect(p).connect(this.sfxBus!);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  play(name: Sfx) {
    if (!this.state.enabled || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + 0.01;
    try {
      switch (name) {
        case "click":
          this.tone(2100, t, 0.003, 0.08, 0.05, "sine");
          this.tone(1050, t, 0.003, 0.05, 0.04, "triangle");
          break;
        case "tick":
          this.tone(3800, t, 0.002, 0.03, 0.02, "sine");
          break;
        case "select":
          this.tone(660, t, 0.006, 0.07, 0.09, "sine");
          this.tone(990, t + 0.07, 0.006, 0.07, 0.14, "sine");
          break;
        case "startup":
          // mission activation: low swell + soft fifth shimmer + a filtered breath of air
          this.tone(55, t, 0.5, 0.22, 1.4, "sine", 0, 110);
          this.tone(110, t + 0.1, 0.6, 0.06, 1.3, "triangle");
          this.tone(330, t + 0.45, 0.4, 0.035, 1.3, "sine", -0.3);
          this.tone(495, t + 0.6, 0.4, 0.03, 1.2, "sine", 0.3);
          this.tone(660, t + 0.75, 0.3, 0.02, 1.1, "sine");
          this.noiseBurst(t, 1.6, 200, 1400, 0.05, 0.8);
          break;
        case "whoosh":
          this.noiseBurst(t, 1.5, 260, 2600, 0.16, 0.9, -0.7, 0.7);
          this.tone(70, t, 0.4, 0.08, 1.0, "sine", 0, 45);
          break;
        case "scan":
          this.noiseBurst(t, 0.9, 400, 3200, 0.05, 6);
          for (let i = 0; i < 3; i++) this.tone(1400, t + 0.18 + i * 0.16, 0.002, 0.04, 0.05, "square");
          break;
        case "chime":
          this.tone(880, t, 0.01, 0.06, 1.4, "sine", -0.2);
          this.tone(1320, t + 0.02, 0.01, 0.04, 1.6, "sine", 0.2);
          this.tone(1762, t + 0.04, 0.01, 0.015, 1.2, "sine");
          break;
        case "reveal":
          this.tone(523, t, 0.01, 0.06, 0.25, "triangle");
          this.tone(784, t + 0.09, 0.01, 0.06, 0.4, "triangle");
          break;
        case "neutral":
          // subdued acknowledgement for a failed validation: no rising interval, no fanfare
          this.tone(196, t, 0.02, 0.07, 0.7, "triangle");
          this.tone(147, t + 0.05, 0.02, 0.05, 0.8, "sine");
          break;
      }
    } catch {
      /* never let audio break the app */
    }
  }

  /** Rover motor / wheel loop tied to the PAX drive animation (synthesized, not a recording). */
  setMotor(on: boolean) {
    if (on === this.motorOn) return;
    this.motorOn = on;
    if (!this.state.enabled) return;
    if (on) this.startMotor();
    else this.stopMotor();
  }

  private startMotor() {
    const ctx = this.ctx;
    if (!ctx || !this.motorBus || this.motorNodes.length) {
      if (ctx && this.motorBus) this.motorBus.gain.setTargetAtTime(0.5, ctx.currentTime, 0.25);
      return;
    }
    const saw = ctx.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.value = 46;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    const whine = ctx.createOscillator();
    whine.type = "sine";
    whine.frequency.value = 182;
    const wg = ctx.createGain();
    wg.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 7.5;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.08;
    const amp = ctx.createGain();
    amp.gain.value = 0.16;
    lfo.connect(lfoG).connect(amp.gain);
    const grit = ctx.createBufferSource();
    grit.buffer = this.noise;
    grit.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 900;
    bp.Q.value = 1.5;
    const gg = ctx.createGain();
    gg.gain.value = 0.025;
    saw.connect(lp).connect(amp).connect(this.motorBus);
    whine.connect(wg).connect(this.motorBus);
    grit.connect(bp).connect(gg).connect(this.motorBus);
    saw.start();
    whine.start();
    lfo.start();
    grit.start();
    this.motorNodes = [saw, whine, lfo, grit];
    this.motorBus.gain.setTargetAtTime(0.5, ctx.currentTime, 0.25);
  }

  private stopMotor(now = false) {
    const ctx = this.ctx;
    if (!ctx || !this.motorBus) return;
    this.motorBus.gain.setTargetAtTime(0, ctx.currentTime, now ? 0.01 : 0.2);
    const nodes = this.motorNodes;
    this.motorNodes = [];
    window.setTimeout(() => nodes.forEach((n) => { try { (n as OscillatorNode).stop(); } catch {} }), now ? 50 : 900);
  }

  /** Very low synthesized wind bed (illustrative; NOT a Mars recording). */
  private startAmbient() {
    const ctx = this.ctx;
    if (!ctx || !this.ambBus || this.ambNodes.length) return;
    const src = ctx.createBufferSource();
    src.buffer = this.brown;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    lp.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 220;
    lfo.connect(lfoG).connect(lp.frequency);
    const lfo2 = ctx.createOscillator();
    lfo2.frequency.value = 0.11;
    const lfo2G = ctx.createGain();
    lfo2G.gain.value = 0.06;
    const amp = ctx.createGain();
    amp.gain.value = 0.16;
    lfo2.connect(lfo2G).connect(amp.gain);
    src.connect(lp).connect(amp).connect(this.ambBus);
    src.start();
    lfo.start();
    lfo2.start();
    this.ambNodes = [src, lfo, lfo2];
    this.ambBus.gain.setTargetAtTime(0.55, ctx.currentTime, 1.2);
  }

  private stopAmbient(now = false) {
    const ctx = this.ctx;
    if (!ctx || !this.ambBus) return;
    this.ambBus.gain.setTargetAtTime(0, ctx.currentTime, now ? 0.01 : 0.6);
    const nodes = this.ambNodes;
    this.ambNodes = [];
    window.setTimeout(() => nodes.forEach((n) => { try { (n as OscillatorNode).stop(); } catch {} }), now ? 50 : 2500);
  }
}

export const audio = new AudioEngine();

/** Convenience: play a UI sound (no-op while sound is off). */
export const sfx = (name: Sfx) => audio.play(name);
