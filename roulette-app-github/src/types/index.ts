// Core type definitions for the Roulette application

export interface RouletteEntry {
  id: string;
  label: string;
  weight?: number; // For future weighted probability support
  metadata?: Record<string, unknown>;
}

export interface Roulette {
  id: string;
  title: string;
  entries: RouletteEntry[];
  createdAt: number;
  updatedAt: number;
  settings?: Partial<RouletteSettings>;
  controlledMode: ControlledModeConfig;
}

export interface RouletteSettings {
  // Animation settings
  animationDuration: AnimationDuration;
  customDuration: number; // in milliseconds
  animationIntensity: number; // 0-1
  cyclesBeforeStop: number; // Number of visual cycles
  spinSpeed: number; // 0-1
  decelerationIntensity: number; // 0-1
  resultHighlightDuration: number; // in milliseconds
  autoRestart: boolean;
  removeAfterSelect: boolean;
  preventConsecutiveDuplicates: boolean;
  allowRepeatedResults: boolean;

  // Visual settings
  displaySize: DisplaySize;
  reelDimensions: ReelDimensions;
  entryTypography: TypographySettings;
  entrySpacing: number;
  borderIntensity: number; // 0-1
  glowIntensity: number; // 0-1
  animationEffects: boolean;
  backgroundIntensity: number; // 0-1

  // Sound settings
  masterVolume: number; // 0-1
  spinVolume: number; // 0-1
  resultVolume: number; // 0-1
  soundProfile: SoundProfile;
  mute: boolean;
}

export type AnimationDuration = 'quick' | 'normal' | 'long' | 'custom';

export const ANIMATION_DURATION_PRESETS: Record<AnimationDuration, number> = {
  quick: 2000,
  normal: 4000,
  long: 7000,
  custom: 4000,
};

export type DisplaySize = 'compact' | 'standard' | 'large' | 'fullscreen';

export interface ReelDimensions {
  width: number;
  height: number;
  visibleItems: number;
}

export interface TypographySettings {
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}

export type SoundProfile = 'mechanical' | 'digital' | 'minimal' | 'ambient';

export interface ControlledModeConfig {
  enabled: boolean;
  targetEntryId: string | null;
  lastUsed: number | null;
}

export interface SpinResult {
  entry: RouletteEntry;
  index: number;
  timestamp: number;
  wasControlled: boolean;
}

export interface HistoryEntry extends SpinResult {
  id: string;
  rouletteId: string;
  rouletteTitle: string;
}

export interface AudioSettings {
  masterVolume: number;
  spinVolume: number;
  resultVolume: number;
  soundProfile: SoundProfile;
  mute: boolean;
}

export interface AppSettings {
  // Global settings that apply to all roulettes unless overridden
  defaultRouletteSettings: RouletteSettings;
  keyboardShortcuts: boolean;
  reducedMotion: boolean;
  theme: 'dark' | 'system';
  language: string;
}

export interface ExportData {
  version: number;
  roulettes: Roulette[];
  history: HistoryEntry[];
  settings: AppSettings;
  exportedAt: number;
}

// Default configurations
export const DEFAULT_REEL_DIMENSIONS: ReelDimensions = {
  width: 400,
  height: 300,
  visibleItems: 5,
};

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontSize: 18,
  fontWeight: 500,
  lineHeight: 1.4,
  letterSpacing: 0,
};

export const DEFAULT_ROULETTE_SETTINGS: RouletteSettings = {
  animationDuration: 'normal',
  customDuration: 4000,
  animationIntensity: 0.8,
  cyclesBeforeStop: 3,
  spinSpeed: 0.7,
  decelerationIntensity: 0.6,
  resultHighlightDuration: 3000,
  autoRestart: false,
  removeAfterSelect: false,
  preventConsecutiveDuplicates: false,
  allowRepeatedResults: true,
  displaySize: 'standard',
  reelDimensions: DEFAULT_REEL_DIMENSIONS,
  entryTypography: DEFAULT_TYPOGRAPHY,
  entrySpacing: 8,
  borderIntensity: 0.3,
  glowIntensity: 0.5,
  animationEffects: true,
  backgroundIntensity: 0.4,
  masterVolume: 0.7,
  spinVolume: 0.6,
  resultVolume: 0.8,
  soundProfile: 'mechanical',
  mute: false,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultRouletteSettings: DEFAULT_ROULETTE_SETTINGS,
  keyboardShortcuts: true,
  reducedMotion: false,
  theme: 'dark',
  language: 'en',
};

export const SOUND_PROFILES: Record<SoundProfile, { name: string; description: string }> = {
  mechanical: { name: 'Mechanical', description: 'Subtle clicks and gear sounds' },
  digital: { name: 'Digital', description: 'Clean electronic tones' },
  minimal: { name: 'Minimal', description: 'Barely perceptible feedback' },
  ambient: { name: 'Ambient', description: 'Atmospheric with subtle texture' },
};

export const DISPLAY_SIZES: Record<DisplaySize, { name: string; scale: number }> = {
  compact: { name: 'Compact', scale: 0.75 },
  standard: { name: 'Standard', scale: 1 },
  large: { name: 'Large', scale: 1.3 },
  fullscreen: { name: 'Fullscreen', scale: 1.6 },
};

// Utility type for creating new roulettes
export type CreateRouletteInput = Pick<Roulette, 'title' | 'entries'> & {
  settings?: Partial<RouletteSettings>;
};

// Utility type for updating roulettes
export type UpdateRouletteInput = Partial<Pick<Roulette, 'title' | 'entries' | 'settings' | 'controlledMode'>> & {
  id: string;
};