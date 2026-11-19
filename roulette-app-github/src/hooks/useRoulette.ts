// Main roulette state management hook

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { Roulette, RouletteEntry, SpinResult, RouletteSettings, ControlledModeConfig } from '../types';
import {
  calculateSpinConfig,
  selectRandomEntry,
  generateSpinAnimation,
  calculateSpinOffset,
  isSpinComplete,
  createSpinResult,
  validateRoulette,
  reorderEntries,
  removeEntry,
  updateEntryLabel,
  shuffleEntries,
  getNextEntryIndex,
} from '../lib/roulette-engine';
import { loadAllRoulettes, saveRoulette, deleteRoulette, duplicateRoulette, saveHistoryEntry } from '../lib/storage';
import { AudioEngine } from '../lib/audio';
import { generateId } from '../lib/utils';
import { DEFAULT_ROULETTE_SETTINGS, DEFAULT_APP_SETTINGS } from '../types';

interface UseRouletteReturn {
  // Current roulette state
  currentRoulette: Roulette | null;
  roulettes: Roulette[];
  isLoading: boolean;

  // Spin state
  isSpinning: boolean;
  spinOffset: number;
  spinVelocity: number;
  lastResult: SpinResult | null;
  showResult: boolean;

  // Entry management
  entries: RouletteEntry[];
  entryInput: string;
  setEntryInput: (value: string) => void;
  addEntry: () => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, label: string) => void;
  reorderEntry: (fromIndex: number, toIndex: number) => void;
  pasteEntries: (text: string) => void;
  shuffleEntries: () => void;
  clearEntries: () => void;

  // Roulette management
  createRoulette: (title: string, entries?: Pick<RouletteEntry, 'label'>[]) => Roulette;
  loadRoulette: (id: string) => Promise<void>;
  saveCurrentRoulette: () => Promise<void>;
  deleteCurrentRoulette: () => Promise<void>;
  duplicateCurrentRoulette: (newTitle: string) => Promise<void>;
  renameRoulette: (id: string, newTitle: string) => Promise<void>;
  newRoulette: () => void;

  // Spin controls
  spin: () => Promise<void>;
  stopSpin: () => void;

  // Result handling
  dismissResult: () => void;
  copyResult: () => void;
  removeSelectedEntry: () => void;

  // Controlled mode
  controlledMode: ControlledModeConfig;
  setControlledMode: (config: Partial<ControlledModeConfig>) => void;
  toggleControlledMode: () => void;
  setControlledTarget: (entryId: string | null) => void;

  // Settings
  settings: RouletteSettings;
  updateSettings: (settings: Partial<RouletteSettings>) => void;
  setItemHeight: (height: number) => void;
}

const INITIAL_ROULETTE: Roulette = {
  id: 'default',
  title: 'New Roulette',
  entries: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  settings: undefined,
  controlledMode: { enabled: false, targetEntryId: null, lastUsed: null },
};

function mergeSettings(base: Partial<RouletteSettings> | undefined, overrides: Partial<RouletteSettings>): RouletteSettings {
  return { ...DEFAULT_ROULETTE_SETTINGS, ...base, ...overrides };
}

export function useRoulette(): UseRouletteReturn {
  // Roulette data
  const [roulettes, setRoulettes] = useState<Roulette[]>([]);
  const [currentRoulette, setCurrentRoulette] = useState<Roulette | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Spin state
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinOffset, setSpinOffset] = useState(0);
  const [spinVelocity, setSpinVelocity] = useState(0);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Entry management
  const [entryInput, setEntryInput] = useState('');

  // Animation refs
  const animationFrameRef = useRef<number | null>(null);
  const animationDataRef = useRef<ReturnType<typeof generateSpinAnimation> | null>(null);
  const spinStopRef = useRef<(() => void) | null>(null);
  const lastSelectedIndexRef = useRef<number | null>(null);
  const itemHeightRef = useRef(60); // Default, updated by component
  const spinOffsetRef = useRef(0);

  // Controlled mode
  const [controlledMode, setControlledModeState] = useState<ControlledModeConfig>({
    enabled: false,
    targetEntryId: null,
    lastUsed: null,
  });

  // Initialize. Storage and audio are enhancements, so neither is allowed to
  // keep the main roulette UI from appearing if the browser blocks or delays it.
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setIsLoading(true);
      const fallback = () => {
        if (cancelled) return;
        setRoulettes([INITIAL_ROULETTE]);
        setCurrentRoulette(INITIAL_ROULETTE);
      };

      try {
        const storageTimeout = new Promise<Roulette[]>((resolve) => {
          window.setTimeout(() => resolve([]), 1500);
        });
        const saved = await Promise.race([loadAllRoulettes(), storageTimeout]);

        if (cancelled) return;
        if (saved.length > 0) {
          setRoulettes(saved);
          setCurrentRoulette(saved[0]);
        } else {
          fallback();
        }
      } catch (error) {
        console.warn('Storage unavailable; starting with a temporary roulette.', error);
        fallback();
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      // AudioContext must be created from a user gesture in many browsers.
      // Initialize opportunistically without blocking the app startup path.
      void AudioEngine.initialize().catch((error) => {
        console.warn('Audio unavailable until the first interaction.', error);
      });
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist roulettes when they change
  useEffect(() => {
    if (!isLoading && roulettes.length > 0) {
      // Debounced save
      const timeout = setTimeout(() => {
        roulettes.forEach(r => saveRoulette(r));
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [roulettes, isLoading]);

  // Update current roulette when roulettes change
  useEffect(() => {
    if (currentRoulette && roulettes.length > 0) {
      const found = roulettes.find(r => r.id === currentRoulette.id);
      if (found) {
        setCurrentRoulette(found);
      }
    }
  }, [roulettes]);

  // Entries derived from current roulette
  const entries = useMemo(() => currentRoulette?.entries ?? [], [currentRoulette]);

  // Settings with defaults
  const settings = useMemo(() => {
    const base = currentRoulette?.settings;
    return base ? mergeSettings(base, {}) : DEFAULT_ROULETTE_SETTINGS;
  }, [currentRoulette]);

  // Spin animation loop
  const animateSpin = useCallback(() => {
    if (!animationDataRef.current || !isSpinning) return;

    const now = performance.now();
    const offset = calculateSpinOffset(animationDataRef.current, now);
    const prevOffset = spinOffsetRef.current;
    spinOffsetRef.current = offset;
    setSpinOffset(offset);
    setSpinVelocity((offset - prevOffset) / 16.67); // Approximate velocity

    if (isSpinComplete(animationDataRef.current, now)) {
      // Spin complete
      const { targetEntry, targetIndex, wasControlled } = animationDataRef.current;
      const result = createSpinResult(entries, targetIndex, wasControlled);
      setLastResult(result);
      setShowResult(true);
      setIsSpinning(false);
      setSpinVelocity(0);
      lastSelectedIndexRef.current = targetIndex;

      // Play result sound
      AudioEngine.playResult(settings.soundProfile);

      // Save to history
      if (currentRoulette) {
        saveHistoryEntry({
          id: `history-${generateId()}`,
          ...result,
          rouletteId: currentRoulette.id,
          rouletteTitle: currentRoulette.title,
        });
      }

      // Handle auto-restart or remove after select
      if (settings.autoRestart) {
        setTimeout(() => spin(), settings.resultHighlightDuration);
      } else if (settings.removeAfterSelect && entries.length > 1) {
        setTimeout(() => removeSelectedEntry(), settings.resultHighlightDuration);
      }

      animationDataRef.current = null;
      return;
    }

    animationFrameRef.current = requestAnimationFrame(animateSpin);
  }, [isSpinning, entries, settings, currentRoulette]);

  // Start animation loop when spinning
  useEffect(() => {
    if (isSpinning) {
      animationFrameRef.current = requestAnimationFrame(animateSpin);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpinning, animateSpin]);

  // Entry management
  const addEntry = useCallback(() => {
    if (!currentRoulette || !entryInput.trim()) return;
    const newEntries = [...entries, { id: `entry-${generateId()}`, label: entryInput.trim() }];
    setCurrentRoulette(prev => prev ? { ...prev, entries: newEntries, updatedAt: Date.now() } : null);
    setEntryInput('');
  }, [currentRoulette, entries, entryInput]);

  const removeEntryById = useCallback((id: string) => {
    if (!currentRoulette) return;
    const newEntries = removeEntry(entries, id);
    setCurrentRoulette(prev => prev ? { ...prev, entries: newEntries, updatedAt: Date.now() } : null);
  }, [currentRoulette, entries]);

  const updateEntry = useCallback((id: string, label: string) => {
    if (!currentRoulette || !label.trim()) return;
    const newEntries = updateEntryLabel(entries, id, label);
    setCurrentRoulette(prev => prev ? { ...prev, entries: newEntries, updatedAt: Date.now() } : null);
  }, [currentRoulette, entries]);

  const reorderEntry = useCallback((fromIndex: number, toIndex: number) => {
    if (!currentRoulette) return;
    const newEntries = reorderEntries(entries, fromIndex, toIndex);
    setCurrentRoulette(prev => prev ? { ...prev, entries: newEntries, updatedAt: Date.now() } : null);
  }, [currentRoulette, entries]);

  const pasteEntries = useCallback((text: string) => {
    if (!currentRoulette) return;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newEntries = lines.map((label, i) => ({ id: `entry-${generateId()}-${i}`, label }));
    setCurrentRoulette(prev => prev ? { ...prev, entries: newEntries, updatedAt: Date.now() } : null);
  }, [currentRoulette]);

  const shuffleEntriesFn = useCallback(() => {
    if (!currentRoulette || entries.length < 2) return;
    const newEntries = shuffleEntries(entries);
    setCurrentRoulette(prev => prev ? { ...prev, entries: newEntries, updatedAt: Date.now() } : null);
  }, [currentRoulette, entries]);

  const clearEntries = useCallback(() => {
    if (!currentRoulette) return;
    setCurrentRoulette(prev => prev ? { ...prev, entries: [], updatedAt: Date.now() } : null);
  }, [currentRoulette]);

  // Roulette management
  const createRoulette = useCallback((title: string, initialEntries: Pick<RouletteEntry, 'label'>[] = []): Roulette => {
    const newRoulette: Roulette = {
      id: `roulette-${generateId()}`,
      title: title.trim() || 'Untitled Roulette',
      entries: initialEntries.map((e, i) => ({ id: `entry-${generateId()}-${i}`, label: e.label.trim() })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: undefined,
      controlledMode: { enabled: false, targetEntryId: null, lastUsed: null },
    };
    setRoulettes(prev => [newRoulette, ...prev]);
    setCurrentRoulette(newRoulette);
    return newRoulette;
  }, []);

  const loadRoulette = useCallback(async (id: string) => {
    const roulette = roulettes.find(r => r.id === id);
    if (roulette) {
      setCurrentRoulette(roulette);
      // Reset controlled mode when switching roulettes
      setControlledModeState({ enabled: false, targetEntryId: null, lastUsed: null });
    }
  }, [roulettes]);

  const saveCurrentRoulette = useCallback(async () => {
    if (!currentRoulette) return;
    const toSave = { ...currentRoulette, updatedAt: Date.now() };
    await saveRoulette(toSave);
    setRoulettes(prev => {
      const exists = prev.some(r => r.id === toSave.id);
      if (exists) return prev.map(r => r.id === toSave.id ? toSave : r);
      return [toSave, ...prev];
    });
  }, [currentRoulette]);

  const deleteCurrentRoulette = useCallback(async () => {
    if (!currentRoulette || roulettes.length <= 1) return;
    await deleteRoulette(currentRoulette.id);
    setRoulettes(prev => prev.filter(r => r.id !== currentRoulette!.id));
    const next = roulettes.find(r => r.id !== currentRoulette.id);
    if (next) setCurrentRoulette(next);
  }, [currentRoulette, roulettes]);

  const duplicateCurrentRoulette = useCallback(async (newTitle: string) => {
    if (!currentRoulette) return;
    const duplicated = await duplicateRoulette(currentRoulette.id, newTitle);
    if (duplicated) {
      setRoulettes(prev => [duplicated, ...prev]);
      setCurrentRoulette(duplicated);
    }
  }, [currentRoulette]);

  const renameRoulette = useCallback(async (id: string, newTitle: string) => {
    const roulette = roulettes.find((item) => item.id === id);
    if (!roulette || !newTitle.trim()) return;
    const updated = { ...roulette, title: newTitle.trim(), updatedAt: Date.now() };
    await saveRoulette(updated);
    setRoulettes((prev) => prev.map((item) => item.id === id ? updated : item));
    setCurrentRoulette((prev) => prev?.id === id ? updated : prev);
  }, [roulettes]);

  const newRoulette = useCallback(() => {
    const fresh = INITIAL_ROULETTE;
    setCurrentRoulette(fresh);
    setControlledModeState({ enabled: false, targetEntryId: null, lastUsed: null });
  }, []);

  // Spin logic
  const spin = useCallback(async () => {
    if (!currentRoulette || entries.length === 0 || isSpinning) return;

    // Don't spin if only one entry and not allowing repeats
    if (entries.length === 1 && !settings.allowRepeatedResults && lastSelectedIndexRef.current === 0) {
      return;
    }

    setIsSpinning(true);
    setShowResult(false);
    spinOffsetRef.current = 0;
    setSpinOffset(0);
    setSpinVelocity(0);
    lastSelectedIndexRef.current = null;

    // Play startup sound
    AudioEngine.playStartup(settings.soundProfile);

    // Select result BEFORE animation
    const { index: targetIndex, wasControlled } = selectRandomEntry(
      entries,
      controlledMode.enabled ? controlledMode : undefined,
      lastSelectedIndexRef.current,
      settings
    );

    // Calculate animation
    const config = calculateSpinConfig(settings, entries.length);
    const visibleItems = Math.min(settings.reelDimensions.visibleItems, entries.length);
    const animationData = generateSpinAnimation(
      entries,
      targetIndex,
      config,
      itemHeightRef.current,
      visibleItems,
      wasControlled
    );

    animationDataRef.current = animationData;

    // Start spin audio loop
    spinStopRef.current = AudioEngine.startSpinLoop(settings.soundProfile);

    // Play deceleration sound after delay
    setTimeout(() => {
      AudioEngine.playDeceleration(settings.soundProfile, config.duration * 0.25);
    }, config.duration * 0.75);
  }, [currentRoulette, entries, isSpinning, settings, controlledMode]);

  const stopSpin = useCallback(() => {
    if (spinStopRef.current) {
      spinStopRef.current();
      spinStopRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsSpinning(false);
    animationDataRef.current = null;
  }, []);

  // Result handling
  const dismissResult = useCallback(() => {
    setShowResult(false);
    setLastResult(null);
  }, []);

  const copyResult = useCallback(() => {
    if (lastResult) {
      navigator.clipboard.writeText(lastResult.entry.label);
    }
  }, [lastResult]);

  const removeSelectedEntry = useCallback(() => {
    if (!currentRoulette || !lastResult) return;
    const newEntries = removeEntry(entries, lastResult.entry.id);
    setCurrentRoulette(prev => prev ? { ...prev, entries: newEntries, updatedAt: Date.now() } : null);
    setLastResult(null);
    setShowResult(false);
  }, [currentRoulette, entries, lastResult]);

  // Controlled mode
  const setControlledMode = useCallback((config: Partial<ControlledModeConfig>) => {
    setControlledModeState(prev => ({ ...prev, ...config }));
    if (currentRoulette) {
      setCurrentRoulette(prev => {
        if (!prev) return null;
        return {
          ...prev,
          controlledMode: { ...prev.controlledMode, ...config } as ControlledModeConfig,
          updatedAt: Date.now()
        };
      });
    }
  }, [currentRoulette]);

  const toggleControlledMode = useCallback(() => {
    setControlledModeState(prev => {
      const next = { ...prev, enabled: !prev.enabled };
      if (currentRoulette) {
        setCurrentRoulette(curr => {
          if (!curr) return null;
          return {
            ...curr,
            controlledMode: { ...curr.controlledMode, enabled: next.enabled },
            updatedAt: Date.now()
          };
        });
      }
      return next;
    });
  }, [currentRoulette]);

  const setControlledTarget = useCallback((entryId: string | null) => {
    setControlledModeState(prev => ({ ...prev, targetEntryId: entryId, lastUsed: entryId ? Date.now() : null }));
    if (currentRoulette) {
      setCurrentRoulette(prev => {
        if (!prev) return null;
        return {
          ...prev,
          controlledMode: { ...prev.controlledMode, targetEntryId: entryId, lastUsed: entryId ? Date.now() : null },
          updatedAt: Date.now()
        };
      });
    }
  }, [currentRoulette]);

  // Settings update
  const updateSettings = useCallback((newSettings: Partial<RouletteSettings>) => {
    if (!currentRoulette) return;
    setCurrentRoulette(prev => {
      if (!prev) return null;
      return {
        ...prev,
        settings: mergeSettings(prev.settings, newSettings),
        updatedAt: Date.now()
      };
    });
  }, [currentRoulette]);

  // Expose item height setter for the reel component
  const setItemHeight = useCallback((height: number) => {
    itemHeightRef.current = height;
  }, []);

  return {
    currentRoulette,
    roulettes,
    isLoading,
    isSpinning,
    spinOffset,
    spinVelocity,
    lastResult,
    showResult,
    entries,
    entryInput,
    setEntryInput,
    addEntry,
    removeEntry: removeEntryById,
    updateEntry,
    reorderEntry,
    pasteEntries,
    shuffleEntries: shuffleEntriesFn,
    clearEntries,
    createRoulette,
    loadRoulette,
    saveCurrentRoulette,
    deleteCurrentRoulette,
    duplicateCurrentRoulette,
    renameRoulette,
    newRoulette,
    spin,
    stopSpin,
    dismissResult,
    copyResult,
    removeSelectedEntry,
    controlledMode,
    setControlledMode,
    toggleControlledMode,
    setControlledTarget,
    settings,
    updateSettings,
    setItemHeight,
  };
}