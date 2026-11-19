// Web Audio API based sound engine for the Roulette application

import type { SoundProfile, AudioSettings } from '../types';

type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface AudioContextState {
  context: AudioContext | null;
  masterGain: GainNode | null;
  spinGain: GainNode | null;
  resultGain: GainNode | null;
  ambientGain: GainNode | null;
  isInitialized: boolean;
}

const audioState: AudioContextState = {
  context: null,
  masterGain: null,
  spinGain: null,
  resultGain: null,
  ambientGain: null,
  isInitialized: false,
};

const AUDIO_SETTINGS_KEY = 'audio-settings';

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  spinVolume: 0.6,
  resultVolume: 0.8,
  soundProfile: 'mechanical',
  mute: false,
};

// Sound profile configurations
const SOUND_PROFILES: Record<SoundProfile, {
  startup: { type: OscillatorType; frequency: number; duration: number; gain: number };
  spin: { type: OscillatorType; baseFrequency: number; frequencyRange: number; interval: number; gain: number };
  tick: { type: OscillatorType; frequency: number; duration: number; gain: number };
  deceleration: { type: OscillatorType; frequencyStart: number; frequencyEnd: number; duration: number; gain: number };
  result: { type: OscillatorType; frequencies: number[]; durations: number[]; gains: number[] };
  ambient: { type: OscillatorType; frequency: number; gain: number };
}> = {
  mechanical: {
    startup: { type: 'triangle', frequency: 120, duration: 0.3, gain: 0.15 },
    spin: { type: 'sawtooth', baseFrequency: 80, frequencyRange: 40, interval: 0.08, gain: 0.08 },
    tick: { type: 'square', frequency: 200, duration: 0.02, gain: 0.12 },
    deceleration: { type: 'triangle', frequencyStart: 120, frequencyEnd: 40, duration: 1.5, gain: 0.1 },
    result: {
      type: 'sine',
      frequencies: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6
      durations: [0.15, 0.15, 0.15, 0.4],
      gains: [0.2, 0.18, 0.16, 0.25],
    },
    ambient: { type: 'sine', frequency: 60, gain: 0.02 },
  },
  digital: {
    startup: { type: 'sine', frequency: 880, duration: 0.2, gain: 0.12 },
    spin: { type: 'square', baseFrequency: 440, frequencyRange: 200, interval: 0.05, gain: 0.06 },
    tick: { type: 'sine', frequency: 1200, duration: 0.01, gain: 0.1 },
    deceleration: { type: 'sine', frequencyStart: 800, frequencyEnd: 200, duration: 1.2, gain: 0.08 },
    result: {
      type: 'sine',
      frequencies: [880, 1108.73, 1318.51, 1760], // A5, C#6, E6, A6
      durations: [0.1, 0.1, 0.1, 0.3],
      gains: [0.15, 0.13, 0.11, 0.2],
    },
    ambient: { type: 'sine', frequency: 220, gain: 0.015 },
  },
  minimal: {
    startup: { type: 'sine', frequency: 440, duration: 0.15, gain: 0.08 },
    spin: { type: 'triangle', baseFrequency: 200, frequencyRange: 50, interval: 0.15, gain: 0.04 },
    tick: { type: 'sine', frequency: 600, duration: 0.015, gain: 0.06 },
    deceleration: { type: 'sine', frequencyStart: 300, frequencyEnd: 100, duration: 1, gain: 0.05 },
    result: {
      type: 'sine',
      frequencies: [660, 880],
      durations: [0.2, 0.3],
      gains: [0.1, 0.15],
    },
    ambient: { type: 'sine', frequency: 110, gain: 0.008 },
  },
  ambient: {
    startup: { type: 'sine', frequency: 220, duration: 0.5, gain: 0.1 },
    spin: { type: 'sine', baseFrequency: 150, frequencyRange: 30, interval: 0.2, gain: 0.05 },
    tick: { type: 'triangle', frequency: 400, duration: 0.03, gain: 0.08 },
    deceleration: { type: 'sine', frequencyStart: 250, frequencyEnd: 80, duration: 2, gain: 0.06 },
    result: {
      type: 'sine',
      frequencies: [329.63, 440, 523.25, 659.25], // E4, A4, C5, E5
      durations: [0.3, 0.3, 0.3, 0.6],
      gains: [0.12, 0.1, 0.08, 0.15],
    },
    ambient: { type: 'sine', frequency: 55, gain: 0.01 },
  },
};

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioState.context) {
    try {
      audioState.context = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioState.context;
}

function initializeAudioNodes(): void {
  const ctx = getAudioContext();
  if (!ctx || audioState.isInitialized) return;

  audioState.masterGain = ctx.createGain();
  audioState.spinGain = ctx.createGain();
  audioState.resultGain = ctx.createGain();
  audioState.ambientGain = ctx.createGain();

  // Connect gain nodes
  audioState.spinGain.connect(audioState.masterGain);
  audioState.resultGain.connect(audioState.masterGain);
  audioState.ambientGain.connect(audioState.masterGain);
  audioState.masterGain.connect(ctx.destination);

  audioState.isInitialized = true;
}

function loadAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return DEFAULT_AUDIO_SETTINGS;
  try {
    const stored = localStorage.getItem(AUDIO_SETTINGS_KEY);
    return stored ? { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(stored) } : DEFAULT_AUDIO_SETTINGS;
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

function saveAudioSettings(settings: AudioSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save audio settings:', error);
  }
}

function applySettings(settings: AudioSettings): void {
  if (!audioState.masterGain) return;

  const masterVol = settings.mute ? 0 : settings.masterVolume;
  audioState.masterGain.gain.setTargetAtTime(masterVol, getAudioContext()?.currentTime ?? 0, 0.05);
  audioState.spinGain?.gain.setTargetAtTime(settings.spinVolume, getAudioContext()?.currentTime ?? 0, 0.05);
  audioState.resultGain?.gain.setTargetAtTime(settings.resultVolume, getAudioContext()?.currentTime ?? 0, 0.05);
  audioState.ambientGain?.gain.setTargetAtTime(settings.mute ? 0 : 0.3, getAudioContext()?.currentTime ?? 0, 0.1);
}

export const AudioEngine = {
  async initialize(): Promise<boolean> {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    initializeAudioNodes();

    const settings = loadAudioSettings();
    applySettings(settings);

    // Start ambient sound if enabled
    if (!settings.mute) {
      this.startAmbient(settings.soundProfile);
    }

    return true;
  },

  getSettings(): AudioSettings {
    return loadAudioSettings();
  },

  updateSettings(partial: Partial<AudioSettings>): AudioSettings {
    const current = loadAudioSettings();
    const updated = { ...current, ...partial };
    saveAudioSettings(updated);
    applySettings(updated);
    return updated;
  },

  playStartup(profile: SoundProfile = 'mechanical'): void {
    const ctx = getAudioContext();
    const settings = loadAudioSettings();
    if (!ctx || settings.mute || !audioState.resultGain) return;

    const config = SOUND_PROFILES[profile].startup;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = config.type;
    osc.frequency.setValueAtTime(config.frequency, ctx.currentTime);
    osc.connect(gain);
    gain.connect(audioState.resultGain);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(config.gain * settings.resultVolume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + config.duration);
  },

  playSpinTick(profile: SoundProfile = 'mechanical', intensity: number = 1): void {
    const ctx = getAudioContext();
    const settings = loadAudioSettings();
    if (!ctx || settings.mute || !audioState.spinGain) return;

    const config = SOUND_PROFILES[profile].tick;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = config.type;
    osc.frequency.setValueAtTime(config.frequency * (0.8 + intensity * 0.4), ctx.currentTime);
    osc.connect(gain);
    gain.connect(audioState.spinGain);

    const tickGain = config.gain * settings.spinVolume * intensity * 0.5;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(tickGain, ctx.currentTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + config.duration);
  },

  startSpinLoop(profile: SoundProfile = 'mechanical'): () => void {
    const ctx = getAudioContext();
    const settings = loadAudioSettings();
    if (!ctx || settings.mute || !audioState.spinGain) return () => {};

    const config = SOUND_PROFILES[profile].spin;
    let isRunning = true;
    let currentInterval = config.interval;
    let oscillationPhase = 0;

    const playLoop = () => {
      if (!isRunning) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Create subtle frequency modulation for mechanical feel
      const freqMod = Math.sin(oscillationPhase) * config.frequencyRange * 0.3;
      osc.type = config.type;
      osc.frequency.setValueAtTime(config.baseFrequency + freqMod, ctx.currentTime);
      osc.connect(gain);
      gain.connect(audioState.spinGain!);

      const loopGain = config.gain * settings.spinVolume;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(loopGain, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + currentInterval * 0.8);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + currentInterval * 0.8);

      oscillationPhase += 0.3;
      setTimeout(playLoop, currentInterval * 1000);
    };

    playLoop();

    return () => {
      isRunning = false;
    };
  },

  playDeceleration(profile: SoundProfile = 'mechanical', duration: number): void {
    const ctx = getAudioContext();
    const settings = loadAudioSettings();
    if (!ctx || settings.mute || !audioState.spinGain) return;

    const config = SOUND_PROFILES[profile].deceleration;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = config.type;
    osc.frequency.setValueAtTime(config.frequencyStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(config.frequencyEnd, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioState.spinGain);

    gain.gain.setValueAtTime(config.gain * settings.spinVolume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  },

  playResult(profile: SoundProfile = 'mechanical'): void {
    const ctx = getAudioContext();
    const settings = loadAudioSettings();
    if (!ctx || settings.mute || !audioState.resultGain) return;

    const config = SOUND_PROFILES[profile].result;
    config.frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = config.type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.connect(gain);
      gain.connect(audioState.resultGain!);

      const delay = config.durations.slice(0, index).reduce((a, b) => a + b, 0);
      const dur = config.durations[index];
      const gainVal = config.gains[index] * settings.resultVolume;

      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);

      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    });
  },

  startAmbient(profile: SoundProfile = 'mechanical'): void {
    const ctx = getAudioContext();
    const settings = loadAudioSettings();
    if (!ctx || settings.mute || !audioState.ambientGain) return;

    const config = SOUND_PROFILES[profile].ambient;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = config.type;
    osc.frequency.setValueAtTime(config.frequency, ctx.currentTime);
    osc.connect(gain);
    gain.connect(audioState.ambientGain);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(config.gain, ctx.currentTime + 2);

    osc.start(ctx.currentTime);

    // Store reference to stop later if needed
    (audioState.ambientGain as unknown as { _ambientOsc?: OscillatorNode })._ambientOsc = osc;
  },

  stopAmbient(): void {
    const ambientGain = audioState.ambientGain as unknown as { _ambientOsc?: OscillatorNode };
    if (ambientGain._ambientOsc) {
      try {
        ambientGain._ambientOsc.stop();
      } catch {
        // Ignore
      }
      ambientGain._ambientOsc = undefined;
    }
  },

  setMute(muted: boolean): void {
    const settings = loadAudioSettings();
    settings.mute = muted;
    saveAudioSettings(settings);
    applySettings(settings);
    if (!muted) {
      this.startAmbient(settings.soundProfile);
    } else {
      this.stopAmbient();
    }
  },

  setMasterVolume(volume: number): void {
    const settings = loadAudioSettings();
    settings.masterVolume = Math.max(0, Math.min(1, volume));
    saveAudioSettings(settings);
    applySettings(settings);
  },

  setProfile(profile: SoundProfile): void {
    const settings = loadAudioSettings();
    settings.soundProfile = profile;
    saveAudioSettings(settings);
    // Restart ambient with new profile
    this.stopAmbient();
    if (!settings.mute) {
      this.startAmbient(profile);
    }
  },

  // Preview sounds for settings panel
  previewSound(type: 'startup' | 'tick' | 'result' | 'ambient', profile: SoundProfile): void {
    const ctx = getAudioContext();
    const settings = { ...loadAudioSettings(), mute: false };
    if (!ctx) return;

    const config = SOUND_PROFILES[profile];
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.value = settings.masterVolume;

    switch (type) {
      case 'startup': {
        const osc = ctx.createOscillator();
        osc.type = config.startup.type;
        osc.frequency.value = config.startup.frequency;
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(config.startup.gain * settings.resultVolume, ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.startup.duration);
        osc.start();
        osc.stop(ctx.currentTime + config.startup.duration);
        break;
      }
      case 'tick': {
        const osc = ctx.createOscillator();
        osc.type = config.tick.type;
        osc.frequency.value = config.tick.frequency;
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(config.tick.gain * settings.spinVolume, ctx.currentTime + 0.001);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.tick.duration);
        osc.start();
        osc.stop(ctx.currentTime + config.tick.duration);
        break;
      }
      case 'result': {
        config.result.frequencies.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          osc.type = config.result.type;
          osc.frequency.value = freq;
          osc.connect(gainNode);
          const delay = config.result.durations.slice(0, index).reduce((a, b) => a + b, 0);
          const dur = config.result.durations[index];
          const gainVal = config.result.gains[index] * settings.resultVolume;
          gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
          gainNode.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + delay + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + dur);
        });
        break;
      }
      case 'ambient': {
        const osc = ctx.createOscillator();
        osc.type = config.ambient.type;
        osc.frequency.value = config.ambient.frequency;
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(config.ambient.gain, ctx.currentTime + 1);
        osc.start();
        setTimeout(() => {
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          setTimeout(() => osc.stop(), 500);
        }, 2000);
        break;
      }
    }
  },

  cleanup(): void {
    this.stopAmbient();
    if (audioState.context) {
      audioState.context.close().catch(() => {});
      audioState.context = null;
      audioState.masterGain = null;
      audioState.spinGain = null;
      audioState.resultGain = null;
      audioState.ambientGain = null;
      audioState.isInitialized = false;
    }
  },
};

export default AudioEngine;