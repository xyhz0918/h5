import { assets } from "./assets";
import type { AudioCueName, AudioLoopName, AudioSceneId } from "../types";

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type AmbienceKey = "workOrder" | "ingredientScan" | "softRepair" | "proof" | "bake" | "scan" | "report";

type SceneConfig = {
  bgmVolume: number;
  lowpass: number;
  bed?: AmbienceKey;
  ambienceVolume?: number;
};

type CueProfile = {
  notes: number[];
  gain: number;
  duration: number;
  type?: OscillatorType;
  duckMs?: number;
};

type LoopHandle = {
  gain: GainNode;
  nodes: AudioNode[];
  sources: OscillatorNode[];
};

type AmbienceProfile = {
  baseFrequency: number;
  overtoneFrequency: number;
  lfoFrequency: number;
  filterFrequency: number;
  filterType: BiquadFilterType;
  filterQ: number;
  baseType: OscillatorType;
  overtoneType: OscillatorType;
  baseGainRatio: number;
  overtoneGainRatio: number;
  lfoDepthRatio: number;
};

const bgmMasterVolume = 0.4;
const sfxMasterVolume = 0.88;
const sfxToneGainScale = 0.075;
const duckAttackMs = 80;
const duckReleaseMs = 250;
const duckDepth = 0.55;
const defaultDuckHoldMs = 450;
const noDuckCues = new Set<AudioCueName>([
  "soft_power_on",
  "digital_wake",
  "soft_ui_tap",
  "soft_pick",
  "soft_slider_tick",
  "package_rotate_tick",
  "scan_sweep"
]);

const sceneConfig: Record<AudioSceneId, SceneConfig> = {
  entry: { bgmVolume: 0.16, lowpass: 900 },
  home: { bgmVolume: 0.26, lowpass: 18000 },
  select: { bgmVolume: 0.23, lowpass: 18000 },
  workOrder: { bgmVolume: 0.19, lowpass: 15000, bed: "workOrder", ambienceVolume: 0.12 },
  ingredientScan: { bgmVolume: 0.19, lowpass: 16000, bed: "ingredientScan", ambienceVolume: 0.115 },
  softRepair: { bgmVolume: 0.16, lowpass: 12000, bed: "softRepair", ambienceVolume: 0.1 },
  proofingLive: { bgmVolume: 0.16, lowpass: 7000, bed: "proof", ambienceVolume: 0.105 },
  bakingLive: { bgmVolume: 0.23, lowpass: 11000, bed: "bake", ambienceVolume: 0.12 },
  packingLive: { bgmVolume: 0.16, lowpass: 8000, bed: "scan", ambienceVolume: 0.105 },
  report: { bgmVolume: 0.19, lowpass: 18000, bed: "report", ambienceVolume: 0.11 }
};

const ambienceProfiles: Record<AmbienceKey, AmbienceProfile> = {
  workOrder: {
    baseFrequency: 82.41,
    overtoneFrequency: 740,
    lfoFrequency: 2.1,
    filterFrequency: 920,
    filterType: "lowpass",
    filterQ: 0.45,
    baseType: "sine",
    overtoneType: "triangle",
    baseGainRatio: 0.48,
    overtoneGainRatio: 0.08,
    lfoDepthRatio: 0.025
  },
  ingredientScan: {
    baseFrequency: 110,
    overtoneFrequency: 1046.5,
    lfoFrequency: 1.35,
    filterFrequency: 1280,
    filterType: "bandpass",
    filterQ: 0.5,
    baseType: "sine",
    overtoneType: "sine",
    baseGainRatio: 0.42,
    overtoneGainRatio: 0.075,
    lfoDepthRatio: 0.02
  },
  softRepair: {
    baseFrequency: 58,
    overtoneFrequency: 130.81,
    lfoFrequency: 0.72,
    filterFrequency: 340,
    filterType: "lowpass",
    filterQ: 0.35,
    baseType: "triangle",
    overtoneType: "sine",
    baseGainRatio: 0.52,
    overtoneGainRatio: 0.1,
    lfoDepthRatio: 0.015
  },
  proof: {
    baseFrequency: 196,
    overtoneFrequency: 392,
    lfoFrequency: 0.45,
    filterFrequency: 620,
    filterType: "lowpass",
    filterQ: 0.35,
    baseType: "sine",
    overtoneType: "sine",
    baseGainRatio: 0.42,
    overtoneGainRatio: 0.055,
    lfoDepthRatio: 0.012
  },
  bake: {
    baseFrequency: 130.81,
    overtoneFrequency: 261.63,
    lfoFrequency: 1.1,
    filterFrequency: 420,
    filterType: "lowpass",
    filterQ: 0.35,
    baseType: "triangle",
    overtoneType: "sine",
    baseGainRatio: 0.48,
    overtoneGainRatio: 0.075,
    lfoDepthRatio: 0.02
  },
  scan: {
    baseFrequency: 246.94,
    overtoneFrequency: 760,
    lfoFrequency: 0.9,
    filterFrequency: 760,
    filterType: "bandpass",
    filterQ: 0.55,
    baseType: "sine",
    overtoneType: "sine",
    baseGainRatio: 0.38,
    overtoneGainRatio: 0.07,
    lfoDepthRatio: 0.018
  },
  report: {
    baseFrequency: 329.63,
    overtoneFrequency: 659.25,
    lfoFrequency: 0.38,
    filterFrequency: 880,
    filterType: "lowpass",
    filterQ: 0.32,
    baseType: "sine",
    overtoneType: "triangle",
    baseGainRatio: 0.36,
    overtoneGainRatio: 0.06,
    lfoDepthRatio: 0.012
  }
};

const cueProfiles: Record<AudioCueName, CueProfile> = {
  soft_power_on: { notes: [196, 261.63, 329.63], gain: 0.85, duration: 0.34, type: "sine" },
  digital_wake: { notes: [523.25, 659.25], gain: 0.75, duration: 0.2, type: "triangle" },
  system_ready_beep: { notes: [659.25, 783.99], gain: 0.85, duration: 0.22, type: "sine" },
  enter_confirm: { notes: [523.25, 659.25, 783.99], gain: 0.85, duration: 0.26, type: "triangle" },
  short_whoosh: { notes: [220, 440], gain: 0.75, duration: 0.38, type: "sine" },
  soft_ui_tap: { notes: [587.33], gain: 0.75, duration: 0.12, type: "triangle" },
  bug_select: { notes: [659.25, 783.99], gain: 0.85, duration: 0.18, type: "triangle" },
  system_upload: { notes: [392, 523.25, 659.25], gain: 0.85, duration: 0.2, type: "sine" },
  data_confirm: { notes: [523.25, 659.25], gain: 0.85, duration: 0.2, type: "triangle" },
  soft_pick: { notes: [440], gain: 0.72, duration: 0.12, type: "sine" },
  data_blip: { notes: [587.33, 739.99], gain: 0.75, duration: 0.16, type: "triangle" },
  confirm_tick: { notes: [659.25], gain: 0.85, duration: 0.12, type: "sine" },
  success_rise: { notes: [523.25, 659.25, 880], gain: 0.9, duration: 0.24, type: "triangle", duckMs: 700 },
  machine_start: { notes: [130.81, 196], gain: 0.75, duration: 0.28, type: "triangle" },
  machine_stop: { notes: [196, 130.81], gain: 0.72, duration: 0.22, type: "sine" },
  machine_complete: { notes: [220, 329.63, 440], gain: 0.9, duration: 0.3, type: "triangle", duckMs: 700 },
  soft_slider_tick: { notes: [493.88], gain: 0.7, duration: 0.08, type: "sine" },
  stable_confirm: { notes: [587.33, 739.99], gain: 0.85, duration: 0.2, type: "sine" },
  soft_warning: { notes: [392, 349.23], gain: 0.8, duration: 0.18, type: "triangle" },
  target_near_beep: { notes: [659.25, 783.99], gain: 0.85, duration: 0.14, type: "sine" },
  short_warning_glitch: { notes: [440, 415.3], gain: 0.8, duration: 0.11, type: "triangle" },
  bake_success: { notes: [523.25, 659.25, 880], gain: 0.9, duration: 0.24, type: "triangle", duckMs: 700 },
  package_rotate_tick: { notes: [392], gain: 0.7, duration: 0.08, type: "triangle" },
  package_rotate_ready: { notes: [493.88, 659.25], gain: 0.85, duration: 0.18, type: "sine" },
  scan_sweep: { notes: [587.33, 659.25], gain: 0.72, duration: 0.18, type: "sine" },
  code_confirm_beep: { notes: [659.25, 880], gain: 0.85, duration: 0.18, type: "sine" },
  transparent_success: { notes: [493.88, 659.25, 987.77], gain: 0.9, duration: 0.28, type: "triangle", duckMs: 700 },
  report_generate: { notes: [523.25, 659.25, 783.99], gain: 0.85, duration: 0.24, type: "sine" },
  save_confirm: { notes: [659.25, 783.99], gain: 0.85, duration: 0.18, type: "triangle" },
  share_confirm: { notes: [587.33, 739.99], gain: 0.85, duration: 0.18, type: "triangle" },
  copy_success: { notes: [523.25, 659.25], gain: 0.85, duration: 0.16, type: "sine" }
};

export class AudioDirector {
  private context: AudioContext | null = null;
  private bgmElement: HTMLAudioElement | null = null;
  private bgmSource: MediaElementAudioSourceNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmFilter: BiquadFilterNode | null = null;
  private sfxGain: GainNode | null = null;
  private sceneGain: GainNode | null = null;
  private enabled = false;
  private unlocked = false;
  private scene: AudioSceneId = "entry";
  private pauseTimer: number | null = null;
  private duckTimer: number | null = null;
  private targetBgmGain = 0.0001;
  private sceneSources: OscillatorNode[] = [];
  private sceneNodes: AudioNode[] = [];
  private sceneBedGain: GainNode | null = null;
  private loops = new Map<AudioLoopName, LoopHandle>();

  async unlock() {
    if (typeof window === "undefined") return;
    const context = this.ensureContext();
    this.ensureBgmElement(context);
    if (context.state !== "running") {
      await context.resume();
    }
    this.unlocked = true;
  }

  setEnabled(nextEnabled: boolean) {
    this.enabled = nextEnabled;
    if (!nextEnabled) {
      this.fadeBgmTo(0, 220);
      this.stopAllLoops();
      this.stopSceneBed();
      return;
    }

    if (this.unlocked) {
      this.applyScene(500);
    }
  }

  setScene(scene: AudioSceneId) {
    if (this.scene === scene) return;
    this.scene = scene;
    if (this.enabled && this.unlocked) {
      this.applyScene(500);
    }
  }

  playSfx(name: AudioCueName) {
    if (!this.enabled || !this.unlocked) return;
    const profile = cueProfiles[name];
    if (!profile) return;
    const context = this.context;
    if (!context || !this.sfxGain) return;

    const duckMs = profile.duckMs ?? (noDuckCues.has(name) ? 0 : defaultDuckHoldMs);
    if (duckMs > 0) {
      this.duckBgm(duckMs);
    }

    const now = context.currentTime + 0.01;
    profile.notes.forEach((frequency, index) => {
      this.playTone({
        frequency,
        startTime: now + index * profile.duration * 0.55,
        duration: profile.duration,
        gain: profile.gain * sfxToneGainScale,
        type: profile.type ?? "sine"
      });
    });
  }

  startLoop(name: AudioLoopName) {
    if (!this.enabled || !this.unlocked || this.loops.has(name)) return;
    const context = this.context;
    if (!context || !this.sfxGain) return;

    const gain = context.createGain();
    gain.gain.value = name === "machine_loop_low" ? 0.022 : 0.016;
    gain.connect(this.sfxGain);

    const filter = context.createBiquadFilter();
    filter.type = name === "machine_loop_low" ? "lowpass" : "bandpass";
    filter.frequency.value = name === "machine_loop_low" ? 180 : 760;
    filter.Q.value = name === "machine_loop_low" ? 0.35 : 0.55;
    filter.connect(gain);

    const osc = context.createOscillator();
    osc.type = name === "machine_loop_low" ? "triangle" : "sine";
    osc.frequency.value = name === "machine_loop_low" ? 74 : 520;
    osc.connect(filter);
    osc.start();

    const lfoGain = context.createGain();
    lfoGain.gain.value = name === "machine_loop_low" ? 3 : 22;
    const lfo = context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = name === "machine_loop_low" ? 5.5 : 0.9;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start();

    this.loops.set(name, { gain, nodes: [filter, lfoGain], sources: [osc, lfo] });
  }

  stopLoop(name: AudioLoopName) {
    const loop = this.loops.get(name);
    if (!loop) return;
    const context = this.context;
    if (context) {
      loop.gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.05);
    }
    window.setTimeout(() => {
      loop.sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
        source.disconnect();
      });
      loop.nodes.forEach((node) => node.disconnect());
      loop.gain.disconnect();
    }, 180);
    this.loops.delete(name);
  }

  suspend() {
    this.bgmElement?.pause();
    if (this.context?.state === "running") {
      void this.context.suspend();
    }
  }

  async resume() {
    if (!this.enabled || !this.unlocked) return;
    if (this.context?.state === "suspended") {
      await this.context.resume();
    }
    if ((sceneConfig[this.scene]?.bgmVolume ?? 0) > 0) {
      await this.playBgm();
    }
  }

  destroy() {
    this.stopAllLoops();
    this.stopSceneBed(0);
    this.clearPauseTimer();
    this.clearDuckTimer();
    this.bgmElement?.pause();
    this.bgmElement?.removeAttribute("src");
    this.bgmElement?.load();
    this.bgmSource?.disconnect();
    this.bgmGain?.disconnect();
    this.bgmFilter?.disconnect();
    this.sfxGain?.disconnect();
    this.sceneGain?.disconnect();
    this.context?.close().catch(() => undefined);
    this.context = null;
    this.bgmElement = null;
    this.bgmSource = null;
    this.bgmGain = null;
    this.bgmFilter = null;
    this.sfxGain = null;
    this.sceneGain = null;
    this.sceneBedGain = null;
    this.unlocked = false;
  }

  private ensureContext() {
    if (this.context && this.context.state !== "closed") return this.context;
    const AudioContextCtor = window.AudioContext ?? (window as WebAudioWindow).webkitAudioContext;
    this.context = new AudioContextCtor({ latencyHint: "playback" });
    this.bgmGain = this.context.createGain();
    this.bgmGain.gain.value = 0.0001;
    this.bgmFilter = this.context.createBiquadFilter();
    this.bgmFilter.type = "lowpass";
    this.bgmFilter.frequency.value = 900;
    this.bgmGain.connect(this.bgmFilter).connect(this.context.destination);

    this.sfxGain = this.context.createGain();
    this.sfxGain.gain.value = sfxMasterVolume;
    this.sfxGain.connect(this.context.destination);

    this.sceneGain = this.context.createGain();
    this.sceneGain.gain.value = 0.14;
    this.sceneGain.connect(this.context.destination);

    return this.context;
  }

  private ensureBgmElement(context: AudioContext) {
    if (this.bgmElement) return this.bgmElement;
    const audio = new Audio();
    audio.preload = "none";
    audio.loop = true;
    audio.src = assets.entryThemeBgm;
    audio.crossOrigin = "anonymous";
    audio.volume = 1;
    this.bgmElement = audio;
    this.bgmSource = context.createMediaElementSource(audio);
    this.bgmSource.connect(this.bgmGain!);
    return audio;
  }

  private applyScene(fadeMs: number) {
    const context = this.context;
    if (!context || !this.bgmFilter) return;
    const config = sceneConfig[this.scene];
    const sceneFadeMs = this.scene === "entry" ? Math.max(fadeMs, 1800) : fadeMs;
    this.clearPauseTimer();
    this.bgmFilter.frequency.setTargetAtTime(config.lowpass, context.currentTime, 0.12);
    void this.playBgm();
    this.fadeBgmTo(config.bgmVolume * bgmMasterVolume, sceneFadeMs);
    this.startSceneBed(config.bed, config.ambienceVolume ?? 0.1, 600);
  }

  private async playBgm() {
    if (!this.bgmElement) return;
    try {
      await this.bgmElement.play();
    } catch {
      // Some WebViews still require another user gesture.
    }
  }

  private fadeBgmTo(target: number, durationMs: number, rememberTarget = true) {
    const context = this.context;
    if (rememberTarget) {
      this.targetBgmGain = Math.max(target, 0.0001);
      this.clearDuckTimer();
    }
    if (context && this.bgmGain) {
      const now = context.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setValueAtTime(Math.max(this.bgmGain.gain.value, 0.0001), now);
      this.bgmGain.gain.linearRampToValueAtTime(Math.max(target, 0.0001), now + durationMs / 1000);
    } else if (this.bgmElement) {
      this.bgmElement.volume = target;
    }

    if (target <= 0.0001) {
      this.clearPauseTimer();
      this.pauseTimer = window.setTimeout(() => {
        this.bgmElement?.pause();
      }, durationMs + 80);
    }
  }

  private playTone({
    frequency,
    startTime,
    duration,
    gain,
    type
  }: {
    frequency: number;
    startTime: number;
    duration: number;
    gain: number;
    type: OscillatorType;
  }) {
    const context = this.context;
    if (!context || !this.sfxGain) return;
    const osc = context.createOscillator();
    const toneGain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.35;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    toneGain.gain.setValueAtTime(0.0001, startTime);
    toneGain.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), startTime + 0.018);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(filter).connect(toneGain).connect(this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.04);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      toneGain.disconnect();
    };
  }

  private duckBgm(holdMs: number) {
    const context = this.context;
    if (!context || !this.bgmGain || this.targetBgmGain <= 0.0001) return;

    this.clearDuckTimer();
    const now = context.currentTime;
    const duckTarget = Math.max(this.targetBgmGain * duckDepth, 0.0001);
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(Math.max(this.bgmGain.gain.value, 0.0001), now);
    this.bgmGain.gain.linearRampToValueAtTime(duckTarget, now + duckAttackMs / 1000);
    this.duckTimer = window.setTimeout(() => {
      this.fadeBgmTo(this.targetBgmGain, duckReleaseMs, false);
      this.duckTimer = null;
    }, holdMs);
  }

  private startSceneBed(bed?: SceneConfig["bed"], volume = 0.1, fadeMs = 600) {
    this.stopSceneBed(400);
    if (!bed || !this.enabled || !this.unlocked) return;
    const context = this.context;
    if (!context || !this.sceneGain) return;
    const profile = ambienceProfiles[bed];

    const bedGain = context.createGain();
    bedGain.gain.setValueAtTime(0.0001, context.currentTime);
    bedGain.gain.linearRampToValueAtTime(volume, context.currentTime + fadeMs / 1000);
    bedGain.connect(this.sceneGain);

    const filter = context.createBiquadFilter();
    filter.type = profile.filterType;
    filter.frequency.value = profile.filterFrequency;
    filter.Q.value = profile.filterQ;
    filter.connect(bedGain);

    const baseGain = context.createGain();
    baseGain.gain.value = profile.baseGainRatio;
    const baseOsc = context.createOscillator();
    baseOsc.type = profile.baseType;
    baseOsc.frequency.value = profile.baseFrequency;
    baseOsc.connect(baseGain).connect(filter);

    const overtoneGain = context.createGain();
    overtoneGain.gain.value = profile.overtoneGainRatio;
    const overtoneOsc = context.createOscillator();
    overtoneOsc.type = profile.overtoneType;
    overtoneOsc.frequency.value = profile.overtoneFrequency;
    overtoneOsc.connect(overtoneGain).connect(filter);

    const lfoGain = context.createGain();
    lfoGain.gain.value = profile.lfoDepthRatio;
    const lfo = context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = profile.lfoFrequency;
    lfo.connect(lfoGain).connect(overtoneGain.gain);

    baseOsc.start();
    overtoneOsc.start();
    lfo.start();
    this.sceneBedGain = bedGain;
    this.sceneSources = [baseOsc, overtoneOsc, lfo];
    this.sceneNodes = [filter, bedGain, baseGain, overtoneGain, lfoGain];
  }

  private stopSceneBed(fadeMs = 300) {
    const context = this.context;
    const bedGain = this.sceneBedGain;
    const sources = this.sceneSources;
    const nodes = this.sceneNodes;
    if (context && bedGain) {
      bedGain.gain.cancelScheduledValues(context.currentTime);
      bedGain.gain.setValueAtTime(Math.max(bedGain.gain.value, 0.0001), context.currentTime);
      bedGain.gain.linearRampToValueAtTime(0.0001, context.currentTime + fadeMs / 1000);
    }

    this.sceneSources = [];
    this.sceneNodes = [];
    this.sceneBedGain = null;

    const disconnect = () => {
      sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
        source.disconnect();
      });
      nodes.forEach((node) => node.disconnect());
    };

    if (!fadeMs) {
      disconnect();
      return;
    }

    window.setTimeout(disconnect, fadeMs + 80);
  }

  private stopAllLoops() {
    Array.from(this.loops.keys()).forEach((name) => this.stopLoop(name));
  }

  private clearPauseTimer() {
    if (this.pauseTimer === null) return;
    window.clearTimeout(this.pauseTimer);
    this.pauseTimer = null;
  }

  private clearDuckTimer() {
    if (this.duckTimer === null) return;
    window.clearTimeout(this.duckTimer);
    this.duckTimer = null;
  }
}
