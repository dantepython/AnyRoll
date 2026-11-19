// Core roulette engine - handles random selection and spin logic

import type { Roulette, RouletteEntry, SpinResult, RouletteSettings, ControlledModeConfig } from '../types';
import { generateId, shuffleArray, clamp, easeOutMechanical } from './utils';

export interface SpinConfig {
  duration: number;
  cyclesBeforeStop: number;
  spinSpeed: number;
  decelerationIntensity: number;
  animationIntensity: number;
}

export interface SpinAnimationData {
  targetIndex: number;
  targetEntry: RouletteEntry;
  wasControlled: boolean;
  totalDistance: number; // In pixels
  duration: number;
  startTime: number;
  config: SpinConfig;
}

export interface SpinState {
  isSpinning: boolean;
  currentOffset: number; // Current scroll offset in pixels
  velocity: number; // Pixels per millisecond
  animationData: SpinAnimationData | null;
  lastResult: SpinResult | null;
}

// Calculate the spin configuration from settings
export function calculateSpinConfig(settings: RouletteSettings, entryCount: number): SpinConfig {
  const presetDurations = {
    quick: 2000,
    normal: 4000,
    long: 7000,
    custom: settings.customDuration,
  };

  const baseDuration = presetDurations[settings.animationDuration];
  const duration = settings.animationDuration === 'custom' ? settings.customDuration : baseDuration;

  // Adjust cycles based on entry count - more entries need fewer visual cycles
  const adjustedCycles = Math.max(1, Math.min(settings.cyclesBeforeStop, Math.max(2, Math.floor(15 / entryCount))));

  return {
    duration,
    cyclesBeforeStop: adjustedCycles,
    spinSpeed: clamp(settings.spinSpeed, 0.1, 1),
    decelerationIntensity: clamp(settings.decelerationIntensity, 0.1, 1),
    animationIntensity: clamp(settings.animationIntensity, 0.1, 1),
  };
}

// Select a random entry index (fair, independent of animation)
export function selectRandomEntry(
  entries: RouletteEntry[],
  controlledMode: ControlledModeConfig | undefined,
  lastSelectedIndex: number | null,
  settings: RouletteSettings
): { index: number; wasControlled: boolean } {
  // Handle controlled mode
  if (controlledMode?.enabled && controlledMode.targetEntryId) {
    const targetIndex = entries.findIndex(e => e.id === controlledMode.targetEntryId);
    if (targetIndex !== -1) {
      return { index: targetIndex, wasControlled: true };
    }
  }

  // Normal random selection
  const validIndices = entries.map((_, i) => i);

  // Prevent consecutive duplicates if enabled
  if (settings.preventConsecutiveDuplicates && lastSelectedIndex !== null && entries.length > 1) {
    const filtered = validIndices.filter(i => i !== lastSelectedIndex);
    if (filtered.length > 0) {
      const randomIndex = Math.floor(Math.random() * filtered.length);
      return { index: filtered[randomIndex], wasControlled: false };
    }
  }

  // Standard random selection
  const randomIndex = Math.floor(Math.random() * validIndices.length);
  return { index: validIndices[randomIndex], wasControlled: false };
}

// Generate the animation keyframes for a spin
export function generateSpinAnimation(
  entries: RouletteEntry[],
  targetIndex: number,
  config: SpinConfig,
  itemHeight: number,
  visibleItems: number,
  wasControlled = false
): SpinAnimationData {
  const entryCount = entries.length;
  const targetEntry = entries[targetIndex];

  // Calculate how far we need to scroll
  // We want the target to end up in the center of the visible area
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;

  // Calculate base position of target
  const targetBasePosition = targetIndex * itemHeight;

  // Add full cycles
  const cycleDistance = entryCount * itemHeight;
  const totalCyclesDistance = config.cyclesBeforeStop * cycleDistance;

  // Calculate the final offset to land target in center
  // We scroll UP (negative), so we need to go past the target and come back
  const finalOffset = -(targetBasePosition - centerOffset + totalCyclesDistance);

  // Add some randomization to the final position for more natural feel
  const microAdjustment = (Math.random() - 0.5) * itemHeight * 0.1;

  return {
    targetIndex,
    targetEntry,
    wasControlled,
    totalDistance: Math.abs(finalOffset) + Math.abs(microAdjustment),
    duration: config.duration,
    startTime: performance.now(),
    config,
  };
}

// Calculate current offset based on elapsed time and easing
export function calculateSpinOffset(animationData: SpinAnimationData, currentTime: number): number {
  const elapsed = currentTime - animationData.startTime;
  const progress = Math.min(elapsed / animationData.duration, 1);

  // Custom easing: fast start, sustained speed, then mechanical deceleration
  let easedProgress: number;

  if (progress < 0.15) {
    // Acceleration phase (15% of duration)
    const t = progress / 0.15;
    easedProgress = t * t * t * 0.3; // Cubic acceleration, only 30% of distance
  } else if (progress < 0.75) {
    // High speed phase (60% of duration)
    const t = (progress - 0.15) / 0.6;
    const accelDistance = 0.3;
    const constantDistance = 0.55;
    easedProgress = accelDistance + t * constantDistance;
  } else {
    // Deceleration phase (25% of duration)
    const t = (progress - 0.75) / 0.25;
    const baseProgress = 0.85;
    const decelProgress = easeOutMechanical(t) * 0.15;
    easedProgress = baseProgress + decelProgress;
  }

  // Apply animation intensity
  const intensity = animationData.config.animationIntensity;
  const adjustedProgress = Math.pow(easedProgress, 2 - intensity);

  // Calculate offset (negative because we scroll up)
  return -animationData.totalDistance * adjustedProgress;
}

// Check if spin is complete
export function isSpinComplete(animationData: SpinAnimationData, currentTime: number): boolean {
  return currentTime - animationData.startTime >= animationData.duration;
}

// Create a spin result object
export function createSpinResult(
  entries: RouletteEntry[],
  targetIndex: number,
  wasControlled: boolean
): SpinResult {
  return {
    entry: entries[targetIndex],
    index: targetIndex,
    timestamp: Date.now(),
    wasControlled,
  };
}

// Validate roulette data
export function validateRoulette(roulette: Partial<Roulette>): roulette is Roulette {
  return (
    !!roulette.id &&
    typeof roulette.title === 'string' &&
    roulette.title.length > 0 &&
    Array.isArray(roulette.entries) &&
    roulette.entries.length > 0 &&
    roulette.entries.every(e => e.id && typeof e.label === 'string' && e.label.length > 0)
  );
}

// Create a new roulette with defaults
export function createRoulette(
  title: string,
  entries: Pick<RouletteEntry, 'label'>[],
  settings?: Partial<RouletteSettings>
): Roulette {
  const now = Date.now();
  return {
    id: `roulette-${generateId()}`,
    title: title.trim(),
    entries: entries.map((e, i) => ({
      id: `entry-${generateId()}-${i}`,
      label: e.label.trim(),
    })),
    createdAt: now,
    updatedAt: now,
    settings: settings ? { ...DEFAULT_ROULETTE_SETTINGS, ...settings } : DEFAULT_ROULETTE_SETTINGS,
    controlledMode: { enabled: false, targetEntryId: null, lastUsed: null },
  };
}

// Update roulette entries
export function updateRouletteEntries(
  roulette: Roulette,
  entries: Pick<RouletteEntry, 'label'>[]
): Roulette {
  return {
    ...roulette,
    entries: entries.map((e, i) => ({
      id: `entry-${generateId()}-${i}`,
      label: e.label.trim(),
    })),
    updatedAt: Date.now(),
  };
}

// Reorder entries
export function reorderEntries(entries: RouletteEntry[], fromIndex: number, toIndex: number): RouletteEntry[] {
  const result = [...entries];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

// Remove entry
export function removeEntry(entries: RouletteEntry[], entryId: string): RouletteEntry[] {
  return entries.filter(e => e.id !== entryId);
}

// Update entry label
export function updateEntryLabel(entries: RouletteEntry[], entryId: string, newLabel: string): RouletteEntry[] {
  return entries.map(e => (e.id === entryId ? { ...e, label: newLabel.trim() } : e));
}

// Shuffle entries
export function shuffleEntries(entries: RouletteEntry[]): RouletteEntry[] {
  return shuffleArray(entries);
}

// Get next entry index (for auto-restart with remove after select)
export function getNextEntryIndex(
  entries: RouletteEntry[],
  currentIndex: number,
  removeAfterSelect: boolean
): number | null {
  if (entries.length === 0) return null;
  if (entries.length === 1) return 0;

  if (removeAfterSelect) {
    // Entry will be removed, so next index is the same position
    // (since array shifts down)
    return Math.min(currentIndex, entries.length - 2);
  }

  return (currentIndex + 1) % entries.length;
}

// Default settings import
import { DEFAULT_ROULETTE_SETTINGS } from '../types';