// IndexedDB storage layer for the Roulette application

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Roulette, HistoryEntry, AppSettings, ExportData, RouletteSettings } from '../types';
import { DEFAULT_APP_SETTINGS, DEFAULT_ROULETTE_SETTINGS } from '../types';

interface StoredSettings extends AppSettings {
  id: string;
}

interface RouletteDB extends DBSchema {
  roulettes: {
    key: string;
    value: Roulette;
    indexes: { 'by-updated': number };
  };
  history: {
    key: string;
    value: HistoryEntry;
    indexes: { 'by-timestamp': number; 'by-roulette': string };
  };
  settings: {
    key: string;
    value: StoredSettings;
  };
  metadata: {
    key: string;
    value: { key: string; version: number; lastMigration: number };
  };
}

const DB_NAME = 'roulette-app-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<RouletteDB> | null = null;

async function getDB(): Promise<IDBPDatabase<RouletteDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<RouletteDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Roulettes store
      const rouletteStore = db.createObjectStore('roulettes', { keyPath: 'id' });
      rouletteStore.createIndex('by-updated', 'updatedAt');

      // History store
      const historyStore = db.createObjectStore('history', { keyPath: 'id' });
      historyStore.createIndex('by-timestamp', 'timestamp');
      historyStore.createIndex('by-roulette', 'rouletteId');

      // Settings store
      db.createObjectStore('settings', { keyPath: 'id' });

      // Metadata store
      db.createObjectStore('metadata', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

// Roulette operations
export async function saveRoulette(roulette: Roulette): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  const toSave = {
    ...roulette,
    updatedAt: now,
    settings: { ...DEFAULT_ROULETTE_SETTINGS, ...roulette.settings },
  };
  await db.put('roulettes', toSave);
}

export async function loadRoulette(id: string): Promise<Roulette | undefined> {
  const db = await getDB();
  return db.get('roulettes', id);
}

export async function loadAllRoulettes(): Promise<Roulette[]> {
  const db = await getDB();
  return db.getAllFromIndex('roulettes', 'by-updated');
}

export async function deleteRoulette(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('roulettes', id);
  // Also delete associated history
  const historyEntries = await db.getAllFromIndex('history', 'by-roulette', id);
  const tx = db.transaction('history', 'readwrite');
  await Promise.all(historyEntries.map(entry => tx.store.delete(entry.id)));
  await tx.done;
}

export async function duplicateRoulette(id: string, newTitle: string): Promise<Roulette | null> {
  const db = await getDB();
  const original = await db.get('roulettes', id);
  if (!original) return null;

  const newId = `roulette-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();
  const duplicate: Roulette = {
    ...original,
    id: newId,
    title: newTitle,
    createdAt: now,
    updatedAt: now,
    controlledMode: { enabled: false, targetEntryId: null, lastUsed: null },
  };
  await db.put('roulettes', duplicate);
  return duplicate;
}

// History operations
export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  const db = await getDB();
  await db.put('history', entry);
}

export async function loadHistory(limit = 100): Promise<HistoryEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('history', 'by-timestamp');
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function loadHistoryForRoulette(rouletteId: string, limit = 50): Promise<HistoryEntry[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('history', 'by-roulette', rouletteId);
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function clearHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('history');
}

export async function clearHistoryForRoulette(rouletteId: string): Promise<void> {
  const db = await getDB();
  const entries = await db.getAllFromIndex('history', 'by-roulette', rouletteId);
  const tx = db.transaction('history', 'readwrite');
  await Promise.all(entries.map(entry => tx.store.delete(entry.id)));
  await tx.done;
}

// Settings operations
const SETTINGS_KEY = 'global';

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { id: SETTINGS_KEY, ...settings } as StoredSettings);
}

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDB();
  const stored = await db.get('settings', SETTINGS_KEY);
  if (!stored) return DEFAULT_APP_SETTINGS;
  const { id, ...settings } = stored;
  return { ...DEFAULT_APP_SETTINGS, ...settings };
}

export async function updateSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const updated = { ...current, ...partial };
  await saveSettings(updated);
  return updated;
}

// Roulette-specific settings
export async function saveRouletteSettings(rouletteId: string, settings: Partial<RouletteSettings>): Promise<void> {
  const db = await getDB();
  const roulette = await db.get('roulettes', rouletteId);
  if (roulette) {
    roulette.settings = { ...DEFAULT_ROULETTE_SETTINGS, ...roulette.settings, ...settings };
    roulette.updatedAt = Date.now();
    await db.put('roulettes', roulette);
  }
}

// Export/Import
export async function exportAllData(): Promise<ExportData> {
  const [roulettes, history, settings] = await Promise.all([
    loadAllRoulettes(),
    loadHistory(10000),
    loadSettings(),
  ]);

  return {
    version: 1,
    roulettes,
    history,
    settings,
    exportedAt: Date.now(),
  };
}

export async function importData(data: ExportData, merge = false): Promise<{ roulettes: number; history: number }> {
  const db = await getDB();

  if (!merge) {
    // Clear existing data
    await Promise.all([
      db.clear('roulettes'),
      db.clear('history'),
    ]);
  }

  let rouletteCount = 0;
  let historyCount = 0;

  const tx = db.transaction(['roulettes', 'history'], 'readwrite');

  for (const roulette of data.roulettes) {
    await tx.objectStore('roulettes').put(roulette);
    rouletteCount++;
  }

  for (const entry of data.history) {
    await tx.objectStore('history').put(entry);
    historyCount++;
  }

  await tx.done;

  if (data.settings) {
    await saveSettings(data.settings);
  }

  return { roulettes: rouletteCount, history: historyCount };
}

// Migration utilities
export async function getDBVersion(): Promise<number> {
  const db = await getDB();
  const meta = await db.get('metadata', 'version');
  return meta?.version ?? 0;
}

export async function setDBVersion(version: number): Promise<void> {
  const db = await getDB();
  await db.put('metadata', { key: 'version', version, lastMigration: Date.now() } as { key: string; version: number; lastMigration: number });
}

// Cleanup
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Clear all data
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('roulettes'),
    db.clear('history'),
    db.clear('settings'),
  ]);
  // Re-initialize with defaults
  await saveSettings(DEFAULT_APP_SETTINGS);
}

// Storage quota info
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  }
  return null;
}