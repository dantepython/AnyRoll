// Main App Component

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Settings, History, Zap, Minimize2, Maximize2, Unlock, Check
} from 'lucide-react';
import { useRoulette } from './hooks/useRoulette';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts, createDefaultShortcuts } from './hooks/useKeyboardShortcuts';
import {
  Reel,
  SpinButton,
  EntryManager,
  SettingsPanel,
  ResultDisplay,
  RouletteSelector,
  ControlledModePanel,
  HistoryPanel,
} from './components';
import type { ExportData } from './types';
import { exportAllData, importData, clearAllData } from './lib/storage';

function App() {
  const {
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
    removeEntry,
    updateEntry,
    reorderEntry,
    pasteEntries,
    shuffleEntries,
    clearEntries,
    createRoulette,
    loadRoulette,
    saveCurrentRoulette,
    deleteCurrentRoulette,
    duplicateCurrentRoulette,
    renameRoulette,
    newRoulette,
    spin,
    dismissResult,
    copyResult,
    controlledMode,
    toggleControlledMode,
    setControlledTarget,
    settings,
    updateSettings,
    setItemHeight,
  } = useRoulette();

  const { settings: appSettings, updateSettings: updateAppSettings } = useSettings();

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRouletteSelector, setShowRouletteSelector] = useState(false);
  const [showControlledMode, setShowControlledMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // Refs
  const entryInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  const shortcuts = createDefaultShortcuts({
    spin: () => { if (!isSpinning && !showResult) spin(); },
    newRoulette: () => { newRoulette(); setShowRouletteSelector(false); },
    toggleSettings: () => setShowSettings(!showSettings),
    toggleControlledMode: () => setShowControlledMode(!showControlledMode),
    dismissResult: () => dismissResult(),
    copyResult: () => { if (lastResult) copyResult(); },
    focusEntryInput: () => entryInputRef.current?.focus(),
  });

  useKeyboardShortcuts(shortcuts, appSettings.keyboardShortcuts);

  // Handle copy toast
  const showCopiedToast = useCallback((text: string) => {
    setCopiedToast(text);
    setTimeout(() => setCopiedToast(null), 2000);
  }, []);

  // Override copyResult to show toast
  const handleCopyResult = useCallback(() => {
    if (lastResult) {
      copyResult();
      showCopiedToast(`Copied: "${lastResult.entry.label}"`);
    }
  }, [lastResult, copyResult, showCopiedToast]);

  // Handle export
  const handleExport = useCallback(async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roulette-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showCopiedToast('Data exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      showCopiedToast('Export failed');
    }
  }, [showCopiedToast]);

  // Handle import
  const handleImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExportData;
      const result = await importData(data);
      if (result) {
        showCopiedToast(`Imported: ${result.roulettes} roulettes, ${result.history} history entries`);
        // Reload would happen automatically via storage events
        window.location.reload();
      } else {
        showCopiedToast('Import failed - invalid file format');
      }
    } catch (error) {
      console.error('Import failed:', error);
      showCopiedToast('Import failed');
    }
  }, [showCopiedToast]);

  // Handle clear all data
  const handleClearAllData = useCallback(async () => {
    await clearAllData();
    showCopiedToast('All data cleared');
    window.location.reload();
  }, [showCopiedToast]);

  // Handle result dismiss with keyboard
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && showResult) {
        dismissResult();
      }
    }
    if (showResult) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showResult, dismissResult]);

  // Fullscreen handling
  const toggleFullscreen = useCallback(async () => {
    if (!isFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (error) {
        console.error('Fullscreen failed:', error);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (error) {
        console.error('Exit fullscreen failed:', error);
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Compute visible items for reel
  const visibleItems = Math.min(settings.reelDimensions.visibleItems, Math.max(3, entries.length));
  const selectedIndex = lastResult ? entries.findIndex(e => e.id === lastResult.entry.id) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-black">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-3 border-gray-700 border-t-pure-white rounded-full animate-spin" />
          <p className="text-gray-400 font-medium">Loading Roulette…</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-black text-pure-white">
      {/* Background atmosphere */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[200px] opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[200px] opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(100,255,100,0.03) 0%, transparent 70%)' }}
        />
      </div>

      {/* Main layout */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top navigation */}
        {!isSpinning && <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800/50 bg-charcoal/50 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowRouletteSelector(!showRouletteSelector)}
              className="btn-ghost p-2"
              aria-label="Roulettes"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <Zap className="w-5 h-5 illuminated-text" />
              </div>
              <div>
                <h1 className="font-display font-semibold text-xl illuminated-text">
                  {currentRoulette?.title || 'Roulette'}
                </h1>
                <p className="text-xs text-gray-500 font-mono">
                  {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Controlled mode indicator */}
            <AnimatePresence>
              {controlledMode.enabled && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: 'rgba(255,200,100,0.15)',
                    border: '1px solid rgba(255,200,100,0.3)',
                    color: '#ffc864',
                  }}
                >
                  <Unlock className="w-3 h-3" />
                  <span>CONTROLLED</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History button */}
            <button
              onClick={() => setShowHistory(true)}
              className="btn-ghost p-2"
              aria-label="History"
            >
              <History className="w-5 h-5" />
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(true)}
              className="btn-ghost p-2"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="btn-ghost p-2"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </header>}

        {/* Main content */}
        <main className={`flex-1 flex flex-col items-center justify-center overflow-hidden transition-all duration-300 ${isSpinning ? 'min-h-screen p-2 md:p-8 bg-white/[0.03]' : 'p-4 md:p-8'}`}>
          {isSpinning && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 md:mb-8 text-center"
            >
              <p className="text-xs md:text-sm uppercase tracking-[0.35em] text-white/70 font-mono">Rolling</p>
              <p className="mt-2 text-2xl md:text-4xl font-display font-semibold text-white illuminated-text">Finding the next result</p>
            </motion.div>
          )}
          <div className={`w-full flex flex-col items-center gap-6 ${isSpinning ? 'max-w-6xl gap-10 md:gap-14' : 'max-w-4xl'}`}>
            {/* Reel */}
            <div className="w-full flex justify-center">
              <Reel
                entries={entries}
                spinOffset={spinOffset}
                spinVelocity={spinVelocity}
                isSpinning={isSpinning}
                settings={settings}
                selectedIndex={selectedIndex}
                showResult={showResult}
                itemHeight={60}
                visibleItems={visibleItems}
                onItemHeightChange={setItemHeight}
                className={isSpinning ? 'scale-[1.12] md:scale-[1.55] brightness-150 transition-transform duration-300' : ''}
              />
            </div>

            {/* Spin button */}
            <SpinButton
              isSpinning={isSpinning}
              showResult={showResult}
              lastResult={lastResult}
              onSpin={spin}
              onReSpin={() => { dismissResult(); spin(); }}
              disabled={entries.length === 0}
              className={isSpinning ? 'scale-125 md:scale-150 brightness-150 transition-transform duration-300' : ''}
            />

            {/* Result display */}
            <ResultDisplay
              result={lastResult}
              isVisible={showResult}
              onDismiss={dismissResult}
              onCopy={handleCopyResult}
              onReSpin={() => { dismissResult(); spin(); }}
              rouletteTitle={currentRoulette?.title || ''}
              wasControlled={lastResult?.wasControlled || false}
            />

            {/* Copy toast */}
            <AnimatePresence>
              {copiedToast && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 glass-panel-strong px-6 py-3 rounded-xl shadow-deep flex items-center gap-2"
                >
                  <Check className="w-5 h-5" style={{ color: '#64ff64' }} />
                  <span className="text-sm font-medium">{copiedToast}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Bottom panel - Entry management */}
        {!isSpinning && <div className="w-full max-w-4xl mx-auto px-4 md:px-8 pb-8">
          <EntryManager
            entries={entries}
            entryInput={entryInput}
            setEntryInput={setEntryInput}
            onAddEntry={addEntry}
            onRemoveEntry={removeEntry}
            onUpdateEntry={updateEntry}
            onReorderEntry={reorderEntry}
            onPasteEntries={pasteEntries}
            onShuffleEntries={shuffleEntries}
            onClearEntries={clearEntries}
            isSpinning={isSpinning}
          />
        </div>}
      </div>

      {/* Panels */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        rouletteSettings={settings}
        onUpdateRouletteSettings={updateSettings}
        appSettings={appSettings}
        onUpdateAppSettings={updateAppSettings}
        currentRouletteId={currentRoulette?.id || null}
        entries={entries}
        controlledMode={controlledMode}
        onToggleControlledMode={toggleControlledMode}
        onSetControlledTarget={setControlledTarget}
        onExport={handleExport}
        onImport={handleImport}
        onClearAllData={handleClearAllData}
      />

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        currentRouletteId={currentRoulette?.id || null}
        currentRouletteTitle={currentRoulette?.title || ''}
      />

      <AnimatePresence>
        {showRouletteSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm p-4 md:p-8"
            onClick={() => setShowRouletteSelector(false)}
          >
            <motion.div
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <RouletteSelector
        roulettes={roulettes}
        currentRouletteId={currentRoulette?.id || null}
        onSelect={loadRoulette}
        onCreate={createRoulette}
        onDuplicate={(id, title) => { void loadRoulette(id).then(() => duplicateCurrentRoulette(title)); }}
        onDelete={(id) => { void loadRoulette(id).then(() => deleteCurrentRoulette()); }}
        onRename={(id, title) => { void renameRoulette(id, title); }}
        isSpinning={isSpinning}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ControlledModePanel
        isOpen={showControlledMode}
        onClose={() => setShowControlledMode(false)}
        roulette={currentRoulette}
        controlledMode={controlledMode}
        onToggle={toggleControlledMode}
        onSetTarget={setControlledTarget}
        onClearTarget={() => setControlledTarget(null)}
      />
    </div>
  );
}

export default App;