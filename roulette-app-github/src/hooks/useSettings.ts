// Settings management hook

import { useState, useEffect, useCallback } from 'react';
import type { AppSettings, RouletteSettings } from '../types';
import { loadSettings, saveSettings, updateSettings as updateSettingsStorage } from '../lib/storage';
import { DEFAULT_APP_SETTINGS, DEFAULT_ROULETTE_SETTINGS } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    async function load() {
      try {
        const loaded = await loadSettings();
        setSettings(loaded);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Update settings
  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await updateSettingsStorage(partial);
  }, [settings]);

  // Reset to defaults
  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_APP_SETTINGS);
    await saveSettings(DEFAULT_APP_SETTINGS);
  }, []);

  // Update default roulette settings
  const updateDefaultRouletteSettings = useCallback(async (partial: Partial<RouletteSettings>) => {
    const updatedDefaults = { ...settings.defaultRouletteSettings, ...partial };
    await updateSettings({ defaultRouletteSettings: updatedDefaults });
  }, [settings, updateSettings]);

  return {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
    updateDefaultRouletteSettings,
  };
}

// Hook for roulette-specific settings (merges with defaults)
export function useRouletteSettings(rouletteSettings?: Partial<RouletteSettings>) {
  const { settings } = useSettings();

  const mergedSettings = {
    ...DEFAULT_ROULETTE_SETTINGS,
    ...settings.defaultRouletteSettings,
    ...rouletteSettings,
  };

  return mergedSettings;
}