import {
  DEFAULT_MUSIC_VOLUME,
  getNextCarouselIndex,
  getTrackAudioUrl,
  MUSIC_TRACKS,
  wrapTrackIndex,
  type MusicTrackId,
} from './musicCatalog';
import {
  DEFAULT_SFX_SCHEME,
  getSfxSchemeDef,
  isValidSfxSchemeId,
  type SfxSchemeDef,
  type SfxSchemeId,
} from './sfxSchemes';

export type MusicTrack = 'title' | 'calm' | 'overload' | 'boss';
export type MusicMode = 'carousel' | 'dynamic';

export interface MusicPlaybackState {
  trackIndex: number;
  trackId: MusicTrackId;
  playing: boolean;
  muted: boolean;
  volume: number;
  awaitingGesture: boolean;
  carousel: true;
  musicMode: MusicMode;
  sfxScheme: SfxSchemeId;
}

const VOLUME_STORAGE_KEY = 'obsidian_arcanum_music_vol_v1';
const MODE_STORAGE_KEY = 'obsidian_arcanum_music_mode_v1';
const SFX_SCHEME_STORAGE_KEY = 'obsidian_arcanum_sfx_scheme_v1';

function loadInitialVolume(): number {
  if (typeof window === 'undefined') return DEFAULT_MUSIC_VOLUME;
  try {
    const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    if (!raw) return DEFAULT_MUSIC_VOLUME;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(1, parsed));
    }
  } catch {
    // ignore storage failures
  }
  return DEFAULT_MUSIC_VOLUME;
}

function loadInitialMusicMode(): MusicMode {
  if (typeof window === 'undefined') return 'carousel';
  try {
    const raw = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (raw === 'dynamic' || raw === 'carousel') return raw;
  } catch {
    // ignore storage failures
  }
  return 'carousel';
}

function loadInitialSfxScheme(): SfxSchemeId {
  if (typeof window === 'undefined') return DEFAULT_SFX_SCHEME;
  try {
    const raw = window.localStorage.getItem(SFX_SCHEME_STORAGE_KEY);
    if (isValidSfxSchemeId(raw)) return raw;
  } catch {
    // ignore storage failures
  }
  return DEFAULT_SFX_SCHEME;
}

class EtherAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicEnabled = true;
  private musicVolume = loadInitialVolume();
  private musicMode: MusicMode = loadInitialMusicMode();
  private sfxScheme: SfxSchemeId = loadInitialSfxScheme();
  private lastDynamicContextKey = '';
  private trackIndex = 0;
  private audioEl: HTMLAudioElement | null = null;
  private awaitingGesture = false;
  private unlockBound = false;
  private listeners = new Set<(state: MusicPlaybackState) => void>();

  constructor() {
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      this.initMusicPlayer();
    }
  }

  private initMusicPlayer(): void {
    if (this.audioEl) return;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = false;
    audio.volume = this.musicVolume;
    audio.src = getTrackAudioUrl(MUSIC_TRACKS[this.trackIndex].file);

    audio.addEventListener('ended', () => {
      if (!this.musicEnabled || this.muted) return;
      this.selectTrack(getNextCarouselIndex(this.trackIndex, 1), true);
    });

    audio.addEventListener('play', () => {
      this.awaitingGesture = false;
      this.emitState();
    });

    audio.addEventListener('pause', () => {
      this.emitState();
    });

    audio.addEventListener('error', () => {
      this.awaitingGesture = false;
      this.emitState();
    });

    this.audioEl = audio;
    this.bindAutoplayUnlock();
    void this.tryStartAudio();
  }

  private bindAutoplayUnlock(): void {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const unlock = () => {
      if (!this.musicEnabled || this.muted) return;
      if (this.audioEl && this.audioEl.paused) {
        void this.tryStartAudio();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
    };
    window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
    window.addEventListener('keydown', unlock, { capture: true, passive: true });
  }

  private async tryStartAudio(): Promise<void> {
    if (!this.audioEl || !this.musicEnabled || this.muted) return;
    this.audioEl.volume = this.musicVolume;
    this.audioEl.muted = false;
    try {
      await this.audioEl.play();
      this.awaitingGesture = false;
    } catch {
      this.awaitingGesture = true;
    }
    this.emitState();
  }

  private emitState(): void {
    const snap = this.getMusicState();
    this.listeners.forEach((cb) => cb(snap));
  }

  public getMusicState(): MusicPlaybackState {
    const track = MUSIC_TRACKS[this.trackIndex] ?? MUSIC_TRACKS[0];
    const actuallyPlaying =
      this.musicEnabled && !this.muted && Boolean(this.audioEl ? !this.audioEl.paused : false);
    return {
      trackIndex: this.trackIndex,
      trackId: track.id,
      playing: actuallyPlaying || (this.musicEnabled && !this.muted && this.awaitingGesture),
      muted: this.muted,
      volume: this.musicVolume,
      awaitingGesture: this.awaitingGesture,
      carousel: true,
      musicMode: this.musicMode,
      sfxScheme: this.sfxScheme,
    };
  }

  public getSfxScheme(): SfxSchemeId {
    return this.sfxScheme;
  }

  public setSfxScheme(schemeId: SfxSchemeId, playPreview = true): void {
    const next = isValidSfxSchemeId(schemeId) ? schemeId : DEFAULT_SFX_SCHEME;
    const changed = this.sfxScheme !== next;
    this.sfxScheme = next;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SFX_SCHEME_STORAGE_KEY, next);
      } catch {
        // ignore storage failures
      }
    }
    if (changed) {
      this.emitState();
    }
    if (playPreview && !this.muted) {
      this.previewSfxScheme();
    }
  }

  public previewSfxScheme(): void {
    this.playSummon('kinet');
    this.playSlash();
  }

  public subscribeMusicState(cb: (state: MusicPlaybackState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getMusicState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private selectTrack(nextIndex: number, autoPlay: boolean): void {
    const wrapped = wrapTrackIndex(nextIndex);
    const track = MUSIC_TRACKS[wrapped] ?? MUSIC_TRACKS[0];
    this.trackIndex = wrapped;

    if (!this.audioEl && typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      this.initMusicPlayer();
    }

    if (this.audioEl) {
      const nextUrl = getTrackAudioUrl(track.file);
      if (this.audioEl.getAttribute('data-track-id') !== track.id) {
        this.audioEl.setAttribute('data-track-id', track.id);
        this.audioEl.src = nextUrl;
        this.audioEl.currentTime = 0;
      } else if (autoPlay) {
        this.audioEl.currentTime = 0;
      }
      if (autoPlay && this.musicEnabled && !this.muted) {
        void this.tryStartAudio();
      }
    }
    this.emitState();
  }

  public playTrack(index: number): void {
    this.musicEnabled = true;
    if (this.muted) {
      this.muted = false;
    }
    this.selectTrack(index, true);
  }

  public nextTrack(): void {
    this.playTrack(getNextCarouselIndex(this.trackIndex, 1));
  }

  public prevTrack(): void {
    this.playTrack(getNextCarouselIndex(this.trackIndex, -1));
  }

  public toggleMusicPlay(): boolean {
    if (this.muted) {
      this.muted = false;
      this.musicEnabled = true;
      void this.tryStartAudio();
      this.emitState();
      return true;
    }
    if (this.musicEnabled) {
      this.musicEnabled = false;
      this.awaitingGesture = false;
      this.audioEl?.pause();
      this.emitState();
      return false;
    }
    this.musicEnabled = true;
    void this.tryStartAudio();
    this.emitState();
    return true;
  }

  public setMusicVolume(nextVolume: number): void {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(nextVolume) ? nextVolume : DEFAULT_MUSIC_VOLUME));
    this.musicVolume = clamped;
    if (this.audioEl) {
      this.audioEl.volume = clamped;
    }
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(VOLUME_STORAGE_KEY, clamped.toFixed(2));
      } catch {
        // ignore storage failures
      }
    }
    this.emitState();
  }

  public setMusicMode(mode: MusicMode): void {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    this.lastDynamicContextKey = '';
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(MODE_STORAGE_KEY, mode);
      } catch {
        // ignore storage failures
      }
    }
    this.emitState();
  }

  public syncDynamicContext(stageIndex: number, isBoss: boolean, shellMode: string): void {
    if (this.musicMode !== 'dynamic') return;
    const contextKey =
      shellMode === 'title'
        ? 'title'
        : shellMode === 'crossroads' || shellMode === 'draft' || shellMode === 'relic'
          ? 'sanctuary'
          : isBoss
            ? `boss_${stageIndex}`
            : `stage_${stageIndex}`;
    if (contextKey === this.lastDynamicContextKey) return;
    this.lastDynamicContextKey = contextKey;

    let desiredId: MusicTrackId = 'demiurge';
    if (shellMode === 'title') {
      desiredId = 'demiurge';
    } else if (shellMode === 'crossroads' || shellMode === 'draft' || shellMode === 'relic') {
      desiredId = 'demiurge2';
    } else if (stageIndex === 6) {
      desiredId = 'divine_conflict';
    } else if (stageIndex === 3 || isBoss) {
      desiredId = 'demiurges';
    } else if (stageIndex >= 4) {
      desiredId = 'demiurge4';
    } else if (stageIndex >= 1) {
      desiredId = 'demiurge2';
    }
    const desiredIdx = MUSIC_TRACKS.findIndex((t) => t.id === desiredId);
    if (desiredIdx >= 0 && desiredIdx !== this.trackIndex) {
      this.selectTrack(desiredIdx, this.musicEnabled && !this.muted);
    }
  }

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
    return !this.muted && this.musicEnabled;
  }

  public setMuted(next: boolean): void {
    this.muted = next;
    if (next) {
      this.audioEl?.pause();
    } else if (this.musicEnabled) {
      void this.tryStartAudio();
    }
    this.emitState();
  }

  // Preserved as non-interruptive carousel hooks so screen/duel transitions never break the music carousel
  public setTrack(_nextTrack: MusicTrack): void {
    if (!this.muted && this.musicEnabled && this.audioEl && this.audioEl.paused) {
      void this.tryStartAudio();
    }
  }

  public toggleAmbient(_overload: boolean): boolean {
    return this.toggleMusicPlay();
  }

  public startMusic(_track: MusicTrack): void {
    if (!this.muted && this.musicEnabled && this.audioEl && this.audioEl.paused) {
      void this.tryStartAudio();
    }
  }

  public stopAmbient(): void {
    this.stopMusic();
  }

  public stopMusic(): void {
    this.musicEnabled = false;
    this.awaitingGesture = false;
    this.audioEl?.pause();
    this.emitState();
  }

  public updateAmbientMood(_overload: boolean): void {
    // Carousel playback continues uninterrupted across combat states
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

  private scheme(): SfxSchemeDef {
    return getSfxSchemeDef(this.sfxScheme);
  }

  public playCardHover(): void {
    const sc = this.scheme();
    const jitter = 0.96 + Math.random() * 0.08;
    // Soft parchment & harmonic string brush rather than sharp UI beep
    this.playNoiseBurst(1600 * sc.filterShift, 3400 * sc.filterShift, 2.4 * sc.noiseQScale, 0.045, 0.014);
    this.playTone(480 * jitter * sc.pitchScale, 690 * jitter * sc.pitchScale, 0.065 * sc.decayScale, 'sine', 0.018);
  }

  public playUiSelect(): void {
    const sc = this.scheme();
    this.playNoiseBurst(950 * sc.filterShift, 2100 * sc.filterShift, 2.0 * sc.noiseQScale, 0.055, 0.02);
    this.playTone(392 * sc.pitchScale, 588 * sc.pitchScale, 0.095 * sc.decayScale, sc.wavePrimary, 0.036);
    this.playTone(392 * sc.pitchScale * sc.harmonicInterval, 588 * sc.pitchScale * sc.harmonicInterval, 0.085 * sc.decayScale, sc.waveAccent, 0.02, 0.022);
  }

  public playUiDrawer(open = true): void {
    const sc = this.scheme();
    const f0 = open ? 293.66 : 440;
    const f1 = open ? 440 : 293.66;
    this.playNoiseBurst(700 * sc.filterShift, 1800 * sc.filterShift, 1.9 * sc.noiseQScale, 0.075, 0.022);
    this.playTone(f0 * sc.pitchScale, f1 * sc.pitchScale, 0.09 * sc.decayScale, 'triangle', 0.03);
  }

  public playBattleStart(school?: string): void {
    const sc = this.scheme();
    const root =
      (school === 'kinet' ? 293.66 : school === 'chaos' ? 220 : school === 'vital' ? 261.63 : 246.94) *
      sc.pitchScale;
    this.playTone(root * 0.45, root * 0.25, 0.56 * sc.decayScale, 'sine', 0.11 * sc.subImpactBoost);
    this.playNoiseBurst(380 * sc.filterShift, 2800 * sc.filterShift, 1.3 * sc.noiseQScale, 0.48 * sc.decayScale, 0.065);
    [root, root * sc.harmonicInterval, root * 2, root * sc.harmonicInterval * 2].forEach((f, idx) => {
      this.playTone(
        f,
        f * 1.015,
        0.52 * sc.decayScale,
        idx % 2 === 0 ? sc.wavePrimary : sc.waveAccent,
        0.055,
        idx * 0.065
      );
    });
    if (sc.id === 'forge') {
      this.playTone(1380, 920, 0.22, 'square', 0.032, 0.14);
    } else if (sc.id === 'astral') {
      this.playTone(root * 4, root * 4.08, 0.45, 'sine', 0.028, 0.16);
    }
  }

  public playSummon(school?: string): void {
    const sc = this.scheme();
    const base =
      (school === 'kinet' ? 329.63 : school === 'chaos' ? 220 : school === 'vital' ? 261.63 : 293.66) *
      sc.pitchScale;
    this.playTone(130 * sc.pitchScale, 52 * sc.pitchScale, 0.28 * sc.decayScale, sc.wavePrimary, 0.09 * sc.subImpactBoost);
    this.playNoiseBurst(520 * sc.filterShift, 1480 * sc.filterShift, 1.4 * sc.noiseQScale, 0.24 * sc.decayScale, 0.042);
    this.playTone(base, base * sc.harmonicInterval, 0.26 * sc.decayScale, sc.wavePrimary, 0.062, 0.02);
    this.playTone(base * sc.harmonicInterval, base * 2, 0.28 * sc.decayScale, sc.waveAccent, 0.046, 0.07);
    this.playTone(base * 2, base * 2.5, 0.3 * sc.decayScale, sc.waveAccent, 0.034, 0.12);
    if (sc.id === 'forge') {
      this.playTone(base * 3.2, base * 1.6, 0.14, 'square', 0.028, 0.05);
    } else if (sc.id === 'astral') {
      this.playTone(base * 3, base * 4, 0.36, 'sine', 0.03, 0.1);
    } else if (sc.id === 'cataclysm') {
      this.playTone(84, 38, 0.34, 'sawtooth', 0.075, 0.01);
    }
  }

  public playAscend(): void {
    const sc = this.scheme();
    this.playTone(146.83 * sc.pitchScale, 73.42 * sc.pitchScale, 0.34 * sc.decayScale, sc.wavePrimary, 0.088);
    this.playNoiseBurst(900 * sc.filterShift, 3200 * sc.filterShift, 1.8 * sc.noiseQScale, 0.26 * sc.decayScale, 0.045);
    [440, 554.37, 659.25, 880].forEach((f, idx) => {
      const freq = f * sc.pitchScale;
      this.playTone(freq, freq * 1.03, 0.34 * sc.decayScale, idx === 3 ? sc.waveAccent : sc.wavePrimary, 0.052, idx * 0.065);
    });
  }

  public playAttackLunge(): void {
    const sc = this.scheme();
    this.playNoiseBurst(700 * sc.filterShift, 2100 * sc.filterShift, 1.6 * sc.noiseQScale, 0.16 * sc.decayScale, 0.055);
    this.playTone(210 * sc.pitchScale, 130 * sc.pitchScale, 0.15 * sc.decayScale, sc.wavePrimary, 0.052);
  }

  public playSlash(): void {
    const sc = this.scheme();
    this.playNoiseBurst(3400 * sc.filterShift, 720 * sc.filterShift, 1.9 * sc.noiseQScale, 0.19 * sc.decayScale, 0.09);
    this.playTone(1180 * sc.pitchScale, 410 * sc.pitchScale, 0.17 * sc.decayScale, sc.wavePrimary, 0.062);
    this.playTone(1760 * sc.pitchScale, 880 * sc.pitchScale, 0.12 * sc.decayScale, sc.waveAccent, 0.032);
    if (sc.id === 'forge') {
      this.playTone(2420, 1280, 0.11, 'square', 0.024, 0.015);
    }
  }

  public playSpell(school?: string): void {
    const sc = this.scheme();
    const startF = (school === 'chaos' ? 540 : school === 'vital' ? 620 : 840) * sc.pitchScale;
    this.playNoiseBurst(1200 * sc.filterShift, 2900 * sc.filterShift, 2.2 * sc.noiseQScale, 0.28 * sc.decayScale, 0.055);
    this.playTone(startF, startF * 0.38, 0.32 * sc.decayScale, sc.wavePrimary, 0.065);
    this.playTone(startF * sc.harmonicInterval, startF * 0.72, 0.28 * sc.decayScale, sc.waveAccent, 0.05, 0.03);
    this.playTone(startF * 2, startF * 1.25, 0.24 * sc.decayScale, sc.wavePrimary, 0.034, 0.07);
  }

  public playHit(heavy = false): void {
    const sc = this.scheme();
    if (heavy) {
      this.playTone(96 * sc.pitchScale, 32 * sc.pitchScale, 0.36 * sc.decayScale, sc.wavePrimary, 0.12 * sc.subImpactBoost);
      this.playTone(68 * sc.pitchScale, 28 * sc.pitchScale, 0.42 * sc.decayScale, 'sine', 0.14 * sc.subImpactBoost);
      this.playNoiseBurst(1600 * sc.filterShift, 240 * sc.filterShift, 0.9 * sc.noiseQScale, 0.26 * sc.decayScale, 0.11);
      this.playTone(196 * sc.pitchScale, 98 * sc.pitchScale, 0.28 * sc.decayScale, sc.waveAccent, 0.065, 0.02);
    } else {
      this.playTone(175 * sc.pitchScale, 58 * sc.pitchScale, 0.2 * sc.decayScale, sc.wavePrimary, 0.08 * sc.subImpactBoost);
      this.playNoiseBurst(2200 * sc.filterShift, 480 * sc.filterShift, 1.2 * sc.noiseQScale, 0.14 * sc.decayScale, 0.072);
    }
    if (sc.id === 'forge') {
      this.playTone(heavy ? 760 : 1040, heavy ? 320 : 480, 0.14, 'square', 0.028, 0.01);
    }
  }

  public playDeathShatter(): void {
    const sc = this.scheme();
    this.playNoiseBurst(3800 * sc.filterShift, 780 * sc.filterShift, 1.5 * sc.noiseQScale, 0.28 * sc.decayScale, 0.078);
    this.playTone(740 * sc.pitchScale, 190 * sc.pitchScale, 0.28 * sc.decayScale, sc.wavePrimary, 0.055);
    this.playTone(520 * sc.pitchScale * sc.harmonicInterval * 0.68, 140 * sc.pitchScale, 0.3 * sc.decayScale, sc.waveAccent, 0.045, 0.04);
    if (sc.id === 'astral') {
      this.playTone(1480, 620, 0.34, 'sine', 0.028, 0.05);
    } else if (sc.id === 'cataclysm') {
      this.playTone(110, 36, 0.32, 'sawtooth', 0.07, 0.02);
    }
  }

  public playLeapPulse(): void {
    const sc = this.scheme();
    this.playNoiseBurst(600 * sc.filterShift, 2600 * sc.filterShift, 2.0 * sc.noiseQScale, 0.2 * sc.decayScale, 0.045);
    this.playTone(260 * sc.pitchScale, 720 * sc.pitchScale, 0.22 * sc.decayScale, sc.wavePrimary, 0.07);
    this.playTone(260 * sc.pitchScale * sc.harmonicInterval, 720 * sc.pitchScale * sc.harmonicInterval, 0.2 * sc.decayScale, sc.waveAccent, 0.042, 0.04);
  }

  public playVeteran(): void {
    const sc = this.scheme();
    this.playTone(440 * sc.pitchScale, 880 * sc.pitchScale, 0.24 * sc.decayScale, sc.waveAccent, 0.055);
    this.playTone(440 * sc.pitchScale * sc.harmonicInterval, 880 * sc.pitchScale * sc.harmonicInterval, 0.22 * sc.decayScale, sc.wavePrimary, 0.04, 0.05);
  }

  public playOverloadToggle(active: boolean): void {
    const sc = this.scheme();
    this.playNoiseBurst((active ? 320 : 1200) * sc.filterShift, (active ? 1800 : 420) * sc.filterShift, 1.3 * sc.noiseQScale, 0.28 * sc.decayScale, 0.065);
    this.playTone((active ? 110 : 330) * sc.pitchScale, (active ? 320 : 165) * sc.pitchScale, 0.3 * sc.decayScale, active ? 'sawtooth' : sc.wavePrimary, 0.1 * sc.subImpactBoost);
    if (active) this.playTone(165 * sc.pitchScale, 440 * sc.pitchScale, 0.26 * sc.decayScale, sc.waveAccent, 0.055, 0.05);
  }

  public playEnchant(): void {
    const sc = this.scheme();
    this.playTone(330 * sc.pitchScale, 660 * sc.pitchScale, 0.32 * sc.decayScale, sc.waveAccent, 0.062);
    this.playTone(330 * sc.pitchScale * sc.harmonicInterval, 740 * sc.pitchScale, 0.28 * sc.decayScale, sc.wavePrimary, 0.046, 0.065);
    this.playTone(660 * sc.pitchScale, 990 * sc.pitchScale, 0.26 * sc.decayScale, sc.waveAccent, 0.036, 0.12);
  }

  public playTrap(): void {
    const sc = this.scheme();
    this.playNoiseBurst(1800 * sc.filterShift, 520 * sc.filterShift, 1.8 * sc.noiseQScale, 0.22 * sc.decayScale, 0.06);
    this.playTone(240 * sc.pitchScale, 540 * sc.pitchScale, 0.18 * sc.decayScale, sc.wavePrimary, 0.07);
    this.playTone(760 * sc.pitchScale, 380 * sc.pitchScale, 0.24 * sc.decayScale, sc.waveAccent, 0.052, 0.03);
  }

  public playStance(guard: boolean): void {
    const sc = this.scheme();
    if (guard) {
      this.playTone(240 * sc.pitchScale, 155 * sc.pitchScale, 0.16 * sc.decayScale, sc.wavePrimary, 0.06);
      this.playTone(480 * sc.pitchScale, 360 * sc.pitchScale, 0.18 * sc.decayScale, sc.waveAccent, 0.045, 0.02);
      this.playNoiseBurst(900 * sc.filterShift, 1600 * sc.filterShift, 2.2 * sc.noiseQScale, 0.14 * sc.decayScale, 0.035);
    } else {
      this.playTone(320 * sc.pitchScale, 520 * sc.pitchScale, 0.14 * sc.decayScale, sc.wavePrimary, 0.055);
      this.playNoiseBurst(1400 * sc.filterShift, 2600 * sc.filterShift, 1.8 * sc.noiseQScale, 0.12 * sc.decayScale, 0.035);
    }
  }

  public playIntercept(): void {
    const sc = this.scheme();
    this.playNoiseBurst(2600 * sc.filterShift, 1100 * sc.filterShift, 2.5 * sc.noiseQScale, 0.18 * sc.decayScale, 0.07);
    this.playTone(1240 * sc.pitchScale, 920 * sc.pitchScale, 0.18 * sc.decayScale, sc.wavePrimary, 0.06);
    this.playTone(1860 * sc.pitchScale, 1380 * sc.pitchScale, 0.2 * sc.decayScale, sc.waveAccent, 0.045, 0.02);
  }

  public playAbility(): void {
    const sc = this.scheme();
    this.playNoiseBurst(1000 * sc.filterShift, 2800 * sc.filterShift, 2.0 * sc.noiseQScale, 0.18 * sc.decayScale, 0.045);
    this.playTone(460 * sc.pitchScale, 920 * sc.pitchScale, 0.2 * sc.decayScale, sc.waveAccent, 0.062);
    this.playTone(460 * sc.pitchScale * sc.harmonicInterval, 1180 * sc.pitchScale, 0.18 * sc.decayScale, sc.wavePrimary, 0.04, 0.04);
  }

  public playChronoRewind(): void {
    const sc = this.scheme();
    this.playNoiseBurst(2800 * sc.filterShift, 720 * sc.filterShift, 2.4 * sc.noiseQScale, 0.36 * sc.decayScale, 0.05);
    [880, 659.25, 587.33, 783.99, 1046.5].forEach((f, idx) => {
      const freq = f * sc.pitchScale;
      this.playTone(freq, freq * 1.04, 0.24 * sc.decayScale, idx % 2 === 0 ? sc.waveAccent : sc.wavePrimary, 0.052, idx * 0.055);
    });
  }

  public playSoulTether(): void {
    const sc = this.scheme();
    this.playNoiseBurst(1600 * sc.filterShift, 3200 * sc.filterShift, 2.8 * sc.noiseQScale, 0.22 * sc.decayScale, 0.045);
    this.playTone(392 * sc.pitchScale, 587.33 * sc.pitchScale, 0.22 * sc.decayScale, sc.wavePrimary, 0.064);
    this.playTone(587.33 * sc.pitchScale, 880 * sc.pitchScale, 0.24 * sc.decayScale, sc.waveAccent, 0.048, 0.035);
    this.playTone(196 * sc.pitchScale, 146.83 * sc.pitchScale, 0.26 * sc.decayScale, 'sawtooth', 0.038, 0.02);
  }

  public playResonanceApotheosis(school?: string): void {
    const sc = this.scheme();
    const root =
      (school === 'kinet' ? 329.63 : school === 'chaos' ? 246.94 : school === 'vital' ? 293.66 : 349.23) *
      sc.pitchScale;
    this.playTone(98 * sc.pitchScale, 46 * sc.pitchScale, 0.44 * sc.decayScale, 'sine', 0.12 * sc.subImpactBoost);
    this.playNoiseBurst(600 * sc.filterShift, 3400 * sc.filterShift, 1.6 * sc.noiseQScale, 0.36 * sc.decayScale, 0.065);
    [root, root * 1.25, root * sc.harmonicInterval, root * 2, root * 2.5].forEach((f, idx) => {
      this.playTone(f, f * 1.02, 0.42 * sc.decayScale, idx % 2 === 0 ? sc.wavePrimary : sc.waveAccent, 0.058, idx * 0.05);
    });
  }

  public playCardDraw(): void {
    const sc = this.scheme();
    this.playNoiseBurst(1600 * sc.filterShift, 3200 * sc.filterShift, 1.8 * sc.noiseQScale, 0.11 * sc.decayScale, 0.04);
    this.playTone(587.33 * sc.pitchScale, 880 * sc.pitchScale, 0.12 * sc.decayScale, sc.waveAccent, 0.032, 0.02);
  }

  public playForge(): void {
    const sc = this.scheme();
    this.playNoiseBurst(2600 * sc.filterShift, 900 * sc.filterShift, 2.2 * sc.noiseQScale, 0.22 * sc.decayScale, 0.075);
    this.playTone(1320 * sc.pitchScale, 1760 * sc.pitchScale, 0.18 * sc.decayScale, sc.wavePrimary, 0.065);
    this.playTone(440 * sc.pitchScale, 659.25 * sc.pitchScale, 0.28 * sc.decayScale, sc.waveAccent, 0.055, 0.05);
    this.playTone(880 * sc.pitchScale, 1318.5 * sc.pitchScale, 0.26 * sc.decayScale, sc.waveAccent, 0.04, 0.1);
  }

  public playTurnBell(): void {
    const sc = this.scheme();
    this.playTone(392 * sc.pitchScale, 392 * sc.pitchScale, 0.34 * sc.decayScale, sc.waveAccent, 0.045);
    this.playTone(392 * sc.pitchScale * sc.harmonicInterval, 392 * sc.pitchScale * sc.harmonicInterval, 0.3 * sc.decayScale, sc.wavePrimary, 0.032, 0.05);
  }

  public playHeartbeat(): void {
    this.playTone(62, 36, 0.14, 'sine', 0.095);
    this.playTone(54, 32, 0.16, 'sine', 0.075, 0.2);
  }

  public playVictory(): void {
    const sc = this.scheme();
    [293.66, 369.99, 440, 587.33, 739.99].forEach((f, idx) => {
      const freq = f * sc.pitchScale;
      this.playTone(freq, freq * 1.02, 0.45 * sc.decayScale, idx % 2 === 0 ? sc.wavePrimary : sc.waveAccent, 0.062, idx * 0.11);
    });
  }

  public playDefeat(): void {
    const sc = this.scheme();
    [220, 196, 155.56, 110].forEach((f, idx) => {
      const freq = f * sc.pitchScale;
      this.playTone(freq, freq * 0.93, 0.48 * sc.decayScale, 'sawtooth', 0.065, idx * 0.14);
      this.playTone(freq * 0.5, freq * 0.48, 0.52 * sc.decayScale, 'sine', 0.06, idx * 0.14);
    });
  }
}

export const etherAudio = new EtherAudioEngine();
