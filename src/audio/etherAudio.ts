export type MusicTrack = 'title' | 'calm' | 'overload' | 'boss';

class EtherAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicOn = true;
  private track: MusicTrack = 'title';
  private stepTimer: number | null = null;
  private stepIdx = 0;

  private droneOscA: OscillatorNode | null = null;
  private droneOscB: OscillatorNode | null = null;
  private droneOscC: OscillatorNode | null = null;
  private droneLfo: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public isMusicActive(): boolean {
    return !this.muted && this.musicOn && this.stepTimer !== null;
  }

  public setMuted(next: boolean): void {
    this.muted = next;
    if (next) {
      this.stopMusic();
    } else if (this.musicOn) {
      this.startMusic(this.track);
    }
  }

  public setTrack(nextTrack: MusicTrack): void {
    if (this.track === nextTrack && this.stepTimer !== null) return;
    this.track = nextTrack;
    if (!this.muted && this.musicOn && this.ctx) {
      this.startMusic(nextTrack);
    }
  }

  public toggleAmbient(overload: boolean): boolean {
    if (this.stepTimer !== null) {
      this.musicOn = false;
      this.stopMusic();
      return false;
    }
    this.musicOn = true;
    this.startMusic(overload ? 'overload' : this.track);
    return true;
  }

  public startMusic(track: MusicTrack): void {
    this.track = track;
    if (this.muted || !this.musicOn) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.droneOscA) {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.038, ctx.currentTime + 0.9);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 1.6;
      filter.frequency.value = track === 'boss' || track === 'overload' ? 460 : 280;

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.14;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 85;
      lfo.connect(lfoGain).connect(filter.frequency);
      lfo.start();

      const oscA = ctx.createOscillator();
      oscA.type = 'sawtooth';
      oscA.frequency.value = track === 'boss' ? 48.99 : 55; // G1 or A1

      const oscB = ctx.createOscillator();
      oscB.type = 'triangle';
      oscB.frequency.value = track === 'overload' ? 77.78 : 82.41;

      const oscC = ctx.createOscillator();
      oscC.type = 'sine';
      oscC.frequency.value = track === 'boss' ? 146.83 : 164.81;
      const fifthGain = ctx.createGain();
      fifthGain.gain.value = 0.35;

      oscA.connect(filter);
      oscB.connect(filter);
      oscC.connect(fifthGain).connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      oscA.start();
      oscB.start();
      oscC.start();

      this.droneOscA = oscA;
      this.droneOscB = oscB;
      this.droneOscC = oscC;
      this.droneLfo = lfo;
      this.droneFilter = filter;
      this.droneGain = gain;
    } else if (this.droneOscA && this.droneOscB && this.droneFilter) {
      const now = ctx.currentTime;
      this.droneOscA.frequency.setTargetAtTime(track === 'boss' ? 48.99 : 55, now, 0.35);
      this.droneOscB.frequency.setTargetAtTime(
        track === 'overload' ? 77.78 : track === 'boss' ? 73.42 : 82.41,
        now,
        0.35
      );
      this.droneOscC?.frequency.setTargetAtTime(
        track === 'boss' ? 146.83 : track === 'overload' ? 155.56 : 164.81,
        now,
        0.35
      );
      this.droneFilter.frequency.setTargetAtTime(
        track === 'overload' ? 480 : track === 'boss' ? 390 : 260,
        now,
        0.35
      );
    }

    if (this.stepTimer !== null) return;

    const SCALES: Record<MusicTrack, number[]> = {
      title: [220, 261.63, 329.63, 392, 440, 392, 329.63, 293.66],
      calm: [220, 246.94, 293.66, 329.63, 440, 329.63, 293.66, 261.63],
      overload: [220, 233.08, 311.13, 349.23, 440, 311.13, 277.18, 233.08],
      boss: [196, 233.08, 293.66, 392, 466.16, 392, 349.23, 293.66],
    };

    const tempoMs = track === 'overload' || track === 'boss' ? 360 : 520;
    this.stepTimer = window.setInterval(() => {
      if (this.muted || !this.musicOn) return;
      const audioCtx = this.ensureContext();
      if (!audioCtx || audioCtx.state !== 'running') return;
      const notes = SCALES[this.track];
      const freq = notes[this.stepIdx % notes.length];
      this.stepIdx += 1;

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = this.track === 'overload' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(this.track === 'title' ? 900 : 1400, now);

      const peak = this.track === 'boss' ? 0.032 : 0.022;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (tempoMs / 1000) * 0.9);

      osc.connect(lp).connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + tempoMs / 1000);

      // Soft cathedral echo tail (+170ms)
      const echoStart = now + 0.17;
      const echoOsc = audioCtx.createOscillator();
      const echoGain = audioCtx.createGain();
      echoOsc.type = 'sine';
      echoOsc.frequency.setValueAtTime(freq, echoStart);
      echoGain.gain.setValueAtTime(0.0001, echoStart);
      echoGain.gain.exponentialRampToValueAtTime(peak * 0.34, echoStart + 0.03);
      echoGain.gain.exponentialRampToValueAtTime(0.0001, echoStart + (tempoMs / 1000) * 0.85);
      echoOsc.connect(lp).connect(echoGain).connect(audioCtx.destination);
      echoOsc.start(echoStart);
      echoOsc.stop(echoStart + tempoMs / 1000);
    }, tempoMs);
  }

  public stopAmbient(): void {
    this.stopMusic();
  }

  public stopMusic(): void {
    if (this.stepTimer !== null) {
      window.clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    if (this.droneGain && this.ctx) {
      try {
        this.droneGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      } catch {
        // ignore teardown errors
      }
    }
    const stopNode = (n: OscillatorNode | null) => {
      if (!n) return;
      try {
        n.stop(this.ctx ? this.ctx.currentTime + 0.14 : 0);
      } catch {
        // already stopped
      }
    };
    stopNode(this.droneOscA);
    stopNode(this.droneOscB);
    stopNode(this.droneOscC);
    stopNode(this.droneLfo);
    this.droneOscA = null;
    this.droneOscB = null;
    this.droneOscC = null;
    this.droneLfo = null;
    this.droneFilter = null;
    this.droneGain = null;
  }

  public updateAmbientMood(overload: boolean): void {
    if (overload) this.setTrack('overload');
    else if (this.track === 'overload') this.setTrack('calm');
  }

  private noiseBuffer: AudioBuffer | null = null;

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delaySec = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freqStart), now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.018, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  private playNoiseBurst(
    freqStart: number,
    freqEnd: number,
    q: number,
    duration: number,
    volume: number,
    delaySec = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(60, freqStart), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, freqEnd), now + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + Math.min(0.015, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.03);
  }

  public playCardHover(): void {
    const jitter = 0.96 + Math.random() * 0.08;
    this.playTone(540 * jitter, 840 * jitter, 0.075, 'sine', 0.028);
  }

  public playUiSelect(): void {
    this.playTone(392, 620, 0.1, 'triangle', 0.05);
    this.playTone(784, 987, 0.09, 'sine', 0.025, 0.025);
  }

  public playSummon(school?: string): void {
    const base =
      school === 'kinet' ? 329.63 : school === 'chaos' ? 220 : school === 'vital' ? 261.63 : 293.66;
    // Grounding sub impact + rising crystalline triad
    this.playTone(130, 52, 0.28, 'triangle', 0.095);
    this.playNoiseBurst(520, 1400, 1.4, 0.22, 0.04);
    this.playTone(base, base * 1.5, 0.26, 'triangle', 0.065, 0.02);
    this.playTone(base * 1.5, base * 2, 0.28, 'sine', 0.048, 0.07);
    this.playTone(base * 2, base * 2.5, 0.3, 'sine', 0.035, 0.12);
  }

  public playAscend(): void {
    this.playTone(146.83, 73.42, 0.34, 'triangle', 0.09);
    this.playNoiseBurst(900, 3200, 1.8, 0.26, 0.045);
    [440, 554.37, 659.25, 880].forEach((f, idx) => {
      this.playTone(f, f * 1.03, 0.34, idx === 3 ? 'sine' : 'triangle', 0.055, idx * 0.065);
    });
  }

  public playAttackLunge(): void {
    this.playNoiseBurst(700, 2100, 1.6, 0.16, 0.055);
    this.playTone(210, 130, 0.15, 'triangle', 0.055);
  }

  public playSlash(): void {
    this.playNoiseBurst(3400, 720, 1.9, 0.19, 0.095);
    this.playTone(1180, 410, 0.17, 'triangle', 0.065);
    this.playTone(1760, 880, 0.12, 'sine', 0.032);
  }

  public playSpell(school?: string): void {
    const startF = school === 'chaos' ? 540 : school === 'vital' ? 620 : 840;
    this.playNoiseBurst(1200, 2900, 2.2, 0.28, 0.055);
    this.playTone(startF, startF * 0.38, 0.32, 'sawtooth', 0.068);
    this.playTone(startF * 1.5, startF * 0.72, 0.28, 'sine', 0.052, 0.03);
    this.playTone(startF * 2, startF * 1.25, 0.24, 'triangle', 0.035, 0.07);
  }

  public playHit(heavy = false): void {
    if (heavy) {
      this.playTone(96, 32, 0.36, 'sawtooth', 0.13);
      this.playTone(68, 28, 0.42, 'sine', 0.15);
      this.playNoiseBurst(1600, 240, 0.9, 0.26, 0.11);
      this.playTone(196, 98, 0.28, 'triangle', 0.07, 0.02);
    } else {
      this.playTone(175, 58, 0.2, 'sawtooth', 0.085);
      this.playNoiseBurst(2200, 480, 1.2, 0.14, 0.075);
    }
  }

  public playDeathShatter(): void {
    this.playNoiseBurst(3800, 950, 1.5, 0.24, 0.075);
    this.playTone(740, 190, 0.26, 'triangle', 0.055);
    this.playTone(520, 140, 0.28, 'sine', 0.045, 0.04);
  }

  public playLeapPulse(): void {
    this.playNoiseBurst(600, 2600, 2.0, 0.2, 0.045);
    this.playTone(260, 720, 0.22, 'triangle', 0.075);
    this.playTone(520, 1040, 0.2, 'sine', 0.045, 0.04);
  }

  public playVeteran(): void {
    this.playTone(440, 880, 0.24, 'sine', 0.055);
    this.playTone(659.25, 1318.5, 0.22, 'triangle', 0.04, 0.05);
  }

  public playOverloadToggle(active: boolean): void {
    this.updateAmbientMood(active);
    this.playNoiseBurst(active ? 320 : 1200, active ? 1800 : 420, 1.3, 0.28, 0.065);
    this.playTone(active ? 110 : 330, active ? 320 : 165, 0.3, active ? 'sawtooth' : 'triangle', 0.105);
    if (active) this.playTone(165, 440, 0.26, 'triangle', 0.055, 0.05);
  }

  public playEnchant(): void {
    this.playTone(330, 660, 0.32, 'sine', 0.065);
    this.playTone(495, 740, 0.28, 'triangle', 0.048, 0.065);
    this.playTone(660, 990, 0.26, 'sine', 0.036, 0.12);
  }

  public playTrap(): void {
    this.playNoiseBurst(1800, 520, 1.8, 0.22, 0.06);
    this.playTone(240, 540, 0.18, 'triangle', 0.075);
    this.playTone(760, 380, 0.24, 'sawtooth', 0.055, 0.03);
  }

  public playStance(guard: boolean): void {
    if (guard) {
      this.playTone(240, 155, 0.16, 'triangle', 0.06);
      this.playTone(480, 360, 0.18, 'sine', 0.045, 0.02);
      this.playNoiseBurst(900, 1600, 2.2, 0.14, 0.035);
    } else {
      this.playTone(320, 520, 0.14, 'triangle', 0.055);
      this.playNoiseBurst(1400, 2600, 1.8, 0.12, 0.035);
    }
  }

  public playIntercept(): void {
    this.playNoiseBurst(2600, 1100, 2.5, 0.18, 0.07);
    this.playTone(1240, 920, 0.18, 'triangle', 0.06);
    this.playTone(1860, 1380, 0.2, 'sine', 0.045, 0.02);
  }

  public playAbility(): void {
    this.playNoiseBurst(1000, 2800, 2.0, 0.18, 0.045);
    this.playTone(460, 920, 0.2, 'sine', 0.065);
    this.playTone(690, 1180, 0.18, 'triangle', 0.04, 0.04);
  }

  public playChronoRewind(): void {
    this.playNoiseBurst(2800, 720, 2.4, 0.36, 0.05);
    [880, 659.25, 587.33, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone(f, f * 1.04, 0.24, idx % 2 === 0 ? 'sine' : 'triangle', 0.055, idx * 0.055);
    });
  }

  public playSoulTether(): void {
    this.playNoiseBurst(1600, 3200, 2.8, 0.22, 0.045);
    this.playTone(392, 587.33, 0.22, 'triangle', 0.068);
    this.playTone(587.33, 880, 0.24, 'sine', 0.05, 0.035);
    this.playTone(196, 146.83, 0.26, 'sawtooth', 0.04, 0.02);
  }

  public playResonanceApotheosis(school?: string): void {
    const root =
      school === 'kinet' ? 329.63 : school === 'chaos' ? 246.94 : school === 'vital' ? 293.66 : 349.23;
    this.playTone(98, 46, 0.44, 'sine', 0.12);
    this.playNoiseBurst(600, 3400, 1.6, 0.36, 0.065);
    [root, root * 1.25, root * 1.5, root * 2, root * 2.5].forEach((f, idx) => {
      this.playTone(f, f * 1.02, 0.42, idx % 2 === 0 ? 'triangle' : 'sine', 0.06, idx * 0.05);
    });
  }

  public playCardDraw(): void {
    this.playNoiseBurst(1600, 3200, 1.8, 0.11, 0.04);
    this.playTone(587.33, 880, 0.12, 'sine', 0.032, 0.02);
  }

  public playForge(): void {
    this.playNoiseBurst(2600, 900, 2.2, 0.22, 0.075);
    this.playTone(1320, 1760, 0.18, 'triangle', 0.065);
    this.playTone(440, 659.25, 0.28, 'sine', 0.055, 0.05);
    this.playTone(880, 1318.5, 0.26, 'sine', 0.04, 0.1);
  }

  public playTurnBell(): void {
    this.playTone(392, 392, 0.34, 'sine', 0.045);
    this.playTone(587.33, 587.33, 0.3, 'triangle', 0.032, 0.05);
  }

  public playHeartbeat(): void {
    this.playTone(62, 36, 0.14, 'sine', 0.095);
    this.playTone(54, 32, 0.16, 'sine', 0.075, 0.2);
  }

  public playVictory(): void {
    [293.66, 369.99, 440, 587.33, 739.99].forEach((f, idx) => {
      this.playTone(f, f * 1.02, 0.45, idx % 2 === 0 ? 'triangle' : 'sine', 0.065, idx * 0.11);
    });
  }

  public playDefeat(): void {
    [220, 196, 155.56, 110].forEach((f, idx) => {
      this.playTone(f, f * 0.93, 0.48, 'sawtooth', 0.065, idx * 0.14);
      this.playTone(f * 0.5, f * 0.48, 0.52, 'sine', 0.06, idx * 0.14);
    });
  }
}

export const etherAudio = new EtherAudioEngine();
