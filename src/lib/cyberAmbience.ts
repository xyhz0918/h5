type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type AmbientSource = OscillatorNode | AudioBufferSourceNode;

const bpm = 58;
const stepDuration = 60 / bpm / 4;
const stepIntervalMs = stepDuration * 1000;
const masterVolume = 0.145;

const chordProgression = [
  [130.81, 196, 261.63, 293.66, 329.63],
  [110, 164.81, 220, 246.94, 261.63],
  [174.61, 261.63, 349.23, 392, 440],
  [98, 146.83, 196, 220, 246.94]
] as const;

const bassRoots = [130.81, 110, 174.61, 98] as const;
const glintPattern = [659.25, 739.99, 783.99, 987.77, 880, 783.99, 739.99, 659.25] as const;
const liftPattern = [659.25, 739.99, 783.99, 880, 783.99, 739.99] as const;
const leadPattern = [739.99, 659.25, 587.33, 659.25, 783.99, 659.25] as const;
const breakfastMotif = [
  [659.25, 739.99, 783.99],
  [587.33, 659.25, 739.99],
  [659.25, 880, 783.99],
  [587.33, 739.99, 659.25]
] as const;
const pulsePattern = [220, 246.94, 293.66, 329.63] as const;
const scanPattern = [659.25, 783.99, 880, 987.77] as const;
const bugPattern = [493.88, 554.37, 587.33, 659.25] as const;
const sectionEnergy = [0.5, 0.56, 0.6, 0.52] as const;

function connectEnvelope(gain: GainNode, now: number, peak: number, attack: number, hold: number, release: number) {
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), now + attack);
  gain.gain.setValueAtTime(Math.max(peak, 0.0002), now + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + hold + release);
}

function disconnectOnEnd(source: AmbientSource, nodes: AudioNode[]) {
  source.onended = () => {
    nodes.forEach((node) => node.disconnect());
  };
}

export class CyberAmbienceEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private delay: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbReturn: GainNode | null = null;
  private steadySources: AmbientSource[] = [];
  private timers: number[] = [];
  private stopTimer: number | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private step = 0;
  private isStarted = false;

  async start() {
    if (typeof window === "undefined") return;

    this.clearStopTimer();
    const context = this.ensureContext();
    if (!this.isStarted) {
      this.setupMixBus(context);
      this.setupSteadyLayer(context);
      this.startSequencer();
      this.isStarted = true;
    }

    if (context.state !== "running") {
      await context.resume();
    }

    this.master?.gain.cancelScheduledValues(context.currentTime);
    this.master?.gain.setTargetAtTime(masterVolume, context.currentTime, 0.12);
  }

  stop() {
    if (!this.context) return;

    const context = this.context;
    this.master?.gain.cancelScheduledValues(context.currentTime);
    this.master?.gain.setTargetAtTime(0.0001, context.currentTime, 0.08);
    this.clearStopTimer();
    this.stopTimer = window.setTimeout(() => this.destroy(), 220);
  }

  suspend() {
    if (this.context?.state === "running") {
      void this.context.suspend();
    }
  }

  async resume() {
    if (this.context?.state === "suspended") {
      await this.context.resume();
    }
  }

  destroy() {
    this.clearStopTimer();
    this.timers.forEach((timer) => window.clearInterval(timer));
    this.timers = [];

    this.steadySources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Source may have already stopped.
      }
      source.disconnect();
    });

    this.steadySources = [];
    this.delay?.disconnect();
    this.delayFeedback?.disconnect();
    this.reverb?.disconnect();
    this.reverbReturn?.disconnect();
    this.compressor?.disconnect();
    this.master?.disconnect();
    this.delay = null;
    this.delayFeedback = null;
    this.reverb = null;
    this.reverbReturn = null;
    this.compressor = null;
    this.master = null;
    this.isStarted = false;
  }

  private clearStopTimer() {
    if (this.stopTimer === null) return;

    window.clearTimeout(this.stopTimer);
    this.stopTimer = null;
  }

  private ensureContext() {
    if (this.context && this.context.state !== "closed") return this.context;

    const AudioContextCtor = window.AudioContext ?? (window as WebAudioWindow).webkitAudioContext;
    this.context = new AudioContextCtor({ latencyHint: "playback" });

    return this.context;
  }

  private setupMixBus(context: AudioContext) {
    if (this.master) return;

    this.master = context.createGain();
    this.master.gain.value = 0.0001;

    this.compressor = context.createDynamicsCompressor();
    this.compressor.threshold.value = -19;
    this.compressor.knee.value = 24;
    this.compressor.ratio.value = 2.4;
    this.compressor.attack.value = 0.012;
    this.compressor.release.value = 0.24;

    this.master.connect(this.compressor).connect(context.destination);

    this.delay = context.createDelay(1.8);
    this.delay.delayTime.value = stepDuration * 4.5;
    this.delayFeedback = context.createGain();
    this.delayFeedback.gain.value = 0.16;
    this.delay.connect(this.delayFeedback).connect(this.delay);
    this.delay.connect(this.master);

    this.reverb = context.createConvolver();
    this.reverb.buffer = this.createImpulseResponse(context, 1.85, 3.15);
    this.reverbReturn = context.createGain();
    this.reverbReturn.gain.value = 0.14;
    this.reverb.connect(this.reverbReturn).connect(this.master);
  }

  private setupSteadyLayer(context: AudioContext) {
    if (!this.master) return;

    const padFilter = context.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 430;
    padFilter.Q.value = 0.45;

    const padGain = context.createGain();
    padGain.gain.value = 0.0042;

    const pad = context.createOscillator();
    pad.type = "triangle";
    pad.frequency.value = 110;
    pad.detune.value = -7;
    pad.connect(padFilter).connect(padGain).connect(this.master);
    padGain.connect(this.reverb!);

    const airFilter = context.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 1240;
    airFilter.Q.value = 0.52;

    const airGain = context.createGain();
    airGain.gain.value = 0.002;

    const air = context.createBufferSource();
    air.buffer = this.getNoiseBuffer(context);
    air.loop = true;
    air.connect(airFilter).connect(airGain).connect(this.master);
    airGain.connect(this.reverb!);

    const lfoGain = context.createGain();
    lfoGain.gain.value = 42;
    const lfo = context.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.026;
    lfo.connect(lfoGain).connect(airFilter.frequency);

    const horizonFilter = context.createBiquadFilter();
    horizonFilter.type = "bandpass";
    horizonFilter.frequency.value = 620;
    horizonFilter.Q.value = 0.32;

    const horizonGain = context.createGain();
    horizonGain.gain.value = 0.0018;

    const horizon = context.createOscillator();
    horizon.type = "sine";
    horizon.frequency.value = 329.63;
    horizon.detune.value = 4;
    horizon.connect(horizonFilter).connect(horizonGain).connect(this.master);
    horizonGain.connect(this.delay!);
    horizonGain.connect(this.reverb!);

    const now = context.currentTime;
    pad.start(now);
    air.start(now);
    lfo.start(now);
    horizon.start(now);
    this.steadySources.push(pad, air, lfo, horizon);
  }

  private startSequencer() {
    this.scheduleStep();
    this.timers.push(window.setInterval(() => this.scheduleStep(), stepIntervalMs));
  }

  private scheduleStep() {
    const context = this.context;
    if (!context || !this.master || context.state === "closed") return;

    const now = context.currentTime + 0.025;
    const stepInCycle = this.step % 64;
    const stepInBar = this.step % 16;
    const chordIndex = Math.floor(this.step / 16) % chordProgression.length;
    const energy = sectionEnergy[Math.floor(stepInCycle / 16)] ?? 0.86;
    const chord = chordProgression[chordIndex];

    if (stepInBar === 0) {
      this.scheduleCinematicSwell(context, now, chord, energy);
      this.scheduleChordBed(context, now + 0.08, chord, energy);
    }

    if (stepInCycle === 0 || stepInCycle === 32) {
      this.scheduleBassBloom(context, now + 0.28, bassRoots[chordIndex], energy);
    }

    if ([10, 26, 42, 58].includes(stepInCycle)) {
      this.scheduleLiftTick(context, now + 0.02, liftPattern[(this.step + chordIndex) % liftPattern.length], energy);
    }

    if ([14, 46].includes(stepInCycle)) {
      this.scheduleBreakfastMotif(context, now + 0.06, breakfastMotif[chordIndex], energy);
    }

    if ([18, 50].includes(stepInCycle)) {
      this.scheduleGlint(context, now + 0.06, glintPattern[(this.step + chordIndex) % glintPattern.length], energy);
    }

    if ([31, 63].includes(stepInCycle)) {
      this.scheduleLeadTrace(context, now + 0.04, leadPattern[(this.step + chordIndex) % leadPattern.length], energy);
    }

    if (stepInCycle === 47) {
      this.scheduleScanGlow(context, now + 0.08, scanPattern[chordIndex], energy);
    }

    this.step = (this.step + 1) % 64;
  }

  private scheduleCinematicSwell(context: AudioContext, startTime: number, chord: readonly number[], energy: number) {
    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0046 * energy, 1.15, 1.9, 1.45);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(220, startTime);
    filter.frequency.exponentialRampToValueAtTime(620, startTime + 2.35);
    filter.Q.value = 0.28;

    chord.forEach((frequency, index) => {
      const voice = context.createOscillator();
      voice.type = index % 2 === 0 ? "triangle" : "sine";
      voice.frequency.value = frequency * (index > 1 ? 1 : 0.75);
      voice.detune.value = index * 3 - 5;
      voice.connect(filter);
      voice.start(startTime);
      voice.stop(startTime + 4.65);
      disconnectOnEnd(voice, [voice]);
    });

    this.route(filter, gain, { reverb: 0.44 });
    window.setTimeout(() => {
      filter.disconnect();
      gain.disconnect();
    }, 5100);
  }

  private scheduleSoftImpact(context: AudioContext, startTime: number, energy: number) {
    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.009 * energy, 0.018, 0.03, 0.32);

    const impact = context.createOscillator();
    impact.type = "sine";
    impact.frequency.setValueAtTime(88, startTime);
    impact.frequency.exponentialRampToValueAtTime(72, startTime + 0.22);
    impact.connect(gain).connect(this.master!);
    impact.start(startTime);
    impact.stop(startTime + 0.42);
    disconnectOnEnd(impact, [impact, gain]);
  }

  private scheduleChordBed(context: AudioContext, startTime: number, chord: readonly number[], energy: number) {
    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0048 * energy, 0.8, 2.4, 1.35);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(520, startTime);
    filter.frequency.exponentialRampToValueAtTime(390, startTime + 2.55);
    filter.Q.value = 0.24;

    chord.forEach((frequency, index) => {
      const voice = context.createOscillator();
      voice.type = index % 2 === 0 ? "triangle" : "sine";
      voice.frequency.value = frequency;
      voice.detune.value = index * 2 - 3;
      voice.connect(filter);
      voice.start(startTime);
      voice.stop(startTime + 4.5);
      disconnectOnEnd(voice, [voice]);
    });

    this.route(filter, gain, { delay: 0.12, reverb: 0.36 });
    window.setTimeout(() => {
      filter.disconnect();
      gain.disconnect();
    }, 5000);
  }

  private scheduleBassBloom(context: AudioContext, startTime: number, frequency: number, energy: number) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(210, startTime);
    filter.frequency.exponentialRampToValueAtTime(145, startTime + 1.1);
    filter.Q.value = 0.2;

    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0048 * energy, 0.45, 0.55, 1.05);

    const bass = context.createOscillator();
    bass.type = "triangle";
    bass.frequency.setValueAtTime(frequency, startTime);
    bass.frequency.exponentialRampToValueAtTime(frequency * 0.992, startTime + 0.32);
    bass.connect(filter).connect(gain).connect(this.master!);
    bass.start(startTime);
    bass.stop(startTime + 2.1);
    disconnectOnEnd(bass, [bass, filter, gain]);
  }

  private scheduleSoftGate(context: AudioContext, startTime: number, chord: readonly number[], energy: number) {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1180, startTime);
    filter.Q.value = 0.48;

    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0022 * energy, 0.016, 0.05, 0.16);

    chord.forEach((frequency, index) => {
      const voice = context.createOscillator();
      voice.type = index % 2 === 0 ? "triangle" : "sine";
      voice.frequency.value = frequency * 2;
      voice.detune.value = index * 3 - 5;
      voice.connect(filter);
      voice.start(startTime);
      voice.stop(startTime + 0.18);
      disconnectOnEnd(voice, [voice]);
    });

    this.route(filter, gain, { delay: 0.28, reverb: 0.22 });
    window.setTimeout(() => {
      filter.disconnect();
      gain.disconnect();
    }, 380);
  }

  private scheduleGlint(context: AudioContext, startTime: number, frequency: number, energy: number) {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency * 1.04, startTime);
    filter.Q.value = 0.38;

    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0028 * energy, 0.08, 0.1, 0.72);

    const glint = context.createOscillator();
    glint.type = "triangle";
    glint.frequency.setValueAtTime(frequency, startTime);
    glint.frequency.exponentialRampToValueAtTime(frequency * 1.003, startTime + 0.2);
    glint.connect(filter);
    glint.start(startTime);
    glint.stop(startTime + 0.9);
    this.route(filter, gain, { delay: 0.5, reverb: 0.3 });
    disconnectOnEnd(glint, [glint, filter, gain]);
  }

  private scheduleLiftTick(context: AudioContext, startTime: number, frequency: number, energy: number) {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency * 0.98, startTime);
    filter.Q.value = 0.34;

    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0024 * energy, 0.06, 0.12, 0.62);

    const tick = context.createOscillator();
    tick.type = "sine";
    tick.frequency.setValueAtTime(frequency, startTime);
    tick.frequency.exponentialRampToValueAtTime(frequency * 1.006, startTime + 0.12);
    tick.connect(filter);
    tick.start(startTime);
    tick.stop(startTime + 0.8);

    this.route(filter, gain, { delay: 0.54, reverb: 0.28 });
    disconnectOnEnd(tick, [tick, filter, gain]);
  }

  private scheduleBreakfastMotif(context: AudioContext, startTime: number, motif: readonly number[], energy: number) {
    motif.forEach((frequency, index) => {
      const noteStart = startTime + index * stepDuration * 2.7;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1120, noteStart);
      filter.frequency.exponentialRampToValueAtTime(760, noteStart + 1.1);
      filter.Q.value = 0.18;

      const gain = context.createGain();
      connectEnvelope(gain, noteStart, 0.0035 * energy, 0.1, 0.34, 1.1);

      const note = context.createOscillator();
      note.type = "sine";
      note.frequency.setValueAtTime(frequency, noteStart);
      note.detune.value = index === 1 ? 2 : -1;
      note.connect(filter);

      const warmth = context.createOscillator();
      warmth.type = "triangle";
      warmth.frequency.setValueAtTime(frequency * 0.5, noteStart);
      warmth.detune.value = 4;
      warmth.connect(filter);

      note.start(noteStart);
      warmth.start(noteStart);
      note.stop(noteStart + 1.62);
      warmth.stop(noteStart + 1.62);

      this.route(filter, gain, { delay: 0.56, reverb: 0.34 });
      disconnectOnEnd(note, [note, warmth, filter, gain]);
    });
  }

  private schedulePunkPulse(context: AudioContext, startTime: number, frequency: number, energy: number) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(720, startTime);
    filter.frequency.exponentialRampToValueAtTime(420, startTime + 0.2);
    filter.Q.value = 0.68;

    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0028 * energy, 0.018, 0.055, 0.22);

    const pulse = context.createOscillator();
    pulse.type = "sawtooth";
    pulse.frequency.setValueAtTime(frequency, startTime);
    pulse.frequency.exponentialRampToValueAtTime(frequency * 0.997, startTime + 0.18);
    pulse.connect(filter);
    pulse.start(startTime);
    pulse.stop(startTime + 0.36);
    this.route(filter, gain, { delay: 0.18, reverb: 0.08 });
    disconnectOnEnd(pulse, [pulse, filter, gain]);
  }

  private scheduleBugFlicker(context: AudioContext, startTime: number, frequency: number, energy: number) {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency * 1.34, startTime);
    filter.frequency.exponentialRampToValueAtTime(frequency * 1.12, startTime + 0.1);
    filter.Q.value = 0.42;

    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0017 * energy, 0.006, 0.018, 0.12);

    const flicker = context.createOscillator();
    flicker.type = "triangle";
    flicker.frequency.setValueAtTime(frequency, startTime);
    flicker.frequency.setValueAtTime(frequency * 1.5, startTime + 0.055);
    flicker.frequency.setValueAtTime(frequency * 0.75, startTime + 0.105);
    flicker.connect(filter);
    flicker.start(startTime);
    flicker.stop(startTime + 0.17);

    const noiseGain = context.createGain();
    connectEnvelope(noiseGain, startTime + 0.025, 0.0009 * energy, 0.004, 0.014, 0.07);
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 620;
    noiseFilter.Q.value = 0.55;
    const noise = context.createBufferSource();
    noise.buffer = this.getNoiseBuffer(context);
    noise.connect(noiseFilter).connect(noiseGain).connect(this.master!);
    noise.start(startTime + 0.025);
    noise.stop(startTime + 0.12);

    this.route(filter, gain, { delay: 0.24, reverb: 0.1 });
    disconnectOnEnd(flicker, [flicker, filter, gain]);
    disconnectOnEnd(noise, [noise, noiseFilter, noiseGain]);
  }

  private scheduleLeadTrace(context: AudioContext, startTime: number, frequency: number, energy: number) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 980;
    filter.Q.value = 0.24;

    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0034 * energy, 0.12, 0.24, 1.05);

    const trace = context.createOscillator();
    trace.type = "sine";
    trace.frequency.setValueAtTime(frequency, startTime);
    trace.connect(filter);
    trace.start(startTime);
    trace.stop(startTime + 1.45);
    this.route(filter, gain, { delay: 0.55, reverb: 0.34 });
    disconnectOnEnd(trace, [trace, filter, gain]);
  }

  private scheduleScanGlow(context: AudioContext, startTime: number, frequency: number, energy: number) {
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(frequency * 0.92, startTime);
    filter.frequency.exponentialRampToValueAtTime(frequency * 1.04, startTime + 0.55);
    filter.Q.value = 0.28;

    const gain = context.createGain();
    connectEnvelope(gain, startTime, 0.0018 * energy, 0.1, 0.12, 0.75);

    const scan = context.createOscillator();
    scan.type = "triangle";
    scan.frequency.setValueAtTime(frequency, startTime);
    scan.frequency.exponentialRampToValueAtTime(frequency * 1.025, startTime + 0.48);
    scan.connect(filter);
    scan.start(startTime);
    scan.stop(startTime + 1.05);
    this.route(filter, gain, { delay: 0.46, reverb: 0.28 });
    disconnectOnEnd(scan, [scan, filter, gain]);
  }

  private route(source: AudioNode, gain: GainNode, sends: { delay?: number; reverb?: number } = {}) {
    source.connect(gain).connect(this.master!);

    if (sends.delay && this.delay) {
      const delaySend = this.context!.createGain();
      delaySend.gain.value = sends.delay;
      gain.connect(delaySend).connect(this.delay);
    }

    if (sends.reverb && this.reverb) {
      const reverbSend = this.context!.createGain();
      reverbSend.gain.value = sends.reverb;
      gain.connect(reverbSend).connect(this.reverb);
    }
  }

  private createImpulseResponse(context: AudioContext, duration: number, decay: number) {
    const length = Math.floor(context.sampleRate * duration);
    const impulse = context.createBuffer(2, length, context.sampleRate);

    for (let channelIndex = 0; channelIndex < impulse.numberOfChannels; channelIndex += 1) {
      const channel = impulse.getChannelData(channelIndex);
      for (let index = 0; index < length; index += 1) {
        const time = index / length;
        const noise = Math.random() * 2 - 1;
        channel[index] = noise * (1 - time) ** decay * 0.42;
      }
    }

    return impulse;
  }

  private getNoiseBuffer(context: AudioContext) {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === context.sampleRate) return this.noiseBuffer;

    const length = Math.floor(context.sampleRate * 0.5);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
      const fade = 1 - index / length;
      channel[index] = (Math.random() * 2 - 1) * fade * 0.65;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }
}
