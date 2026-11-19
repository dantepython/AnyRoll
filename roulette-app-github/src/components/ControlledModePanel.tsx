// Controlled Mode Panel - Hidden advanced mode for content creators

import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Unlock, Target, Zap, Copy, Check, X, AlertTriangle, Info
} from 'lucide-react';
import type { Roulette, ControlledModeConfig } from '../types';

interface ControlledModePanelProps {
  isOpen: boolean;
  onClose: () => void;
  roulette: Roulette | null;
  controlledMode: ControlledModeConfig;
  onToggle: () => void;
  onSetTarget: (entryId: string | null) => void;
  onClearTarget: () => void;
  className?: string;
}

export const ControlledModePanel = memo(function ControlledModePanel({
  isOpen,
  onClose,
  roulette,
  controlledMode,
  onToggle,
  onSetTarget,
  onClearTarget,
  className = '',
}: ControlledModePanelProps) {
  const [showWarning, setShowWarning] = useState(true);
  const [copiedTarget, setCopiedTarget] = useState(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      setShowWarning(false);
      onToggle();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  if (!isOpen && !showWarning) return null;

  const entries = roulette?.entries ?? [];
  const targetEntry = entries.find(e => e.id === controlledMode.targetEntryId);
  const isEnabled = controlledMode.enabled;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="controlled-mode-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`glass-panel-strong rounded-2xl overflow-hidden w-full max-w-lg ${className}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              border: '1px solid rgba(255,200,100,0.3)',
              boxShadow: `
                0 25px 50px -12px rgba(0,0,0,0.8),
                0 0 60px rgba(255,200,100,0.1),
                inset 0 1px 0 rgba(255,255,255,0.05)
              `,
            }}
          >
            {/* Header with amber accent */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800/50 relative">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, rgba(255,200,100,0.2) 0%, rgba(255,150,50,0.1) 100%)',
                  border: '1px solid rgba(255,200,100,0.3)',
                }}>
                  {isEnabled ? <Unlock className="w-5 h-5" style={{ color: '#ffc864' }} /> : <Lock className="w-5 h-5" style={{ color: '#ffc864' }} />}
                </div>
                <div>
                  <h2 id="controlled-mode-title" className="font-display font-semibold text-lg illuminated-text">
                    Controlled Mode
                  </h2>
                  <p className="text-xs text-gray-500">Content creator tools</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="btn-ghost p-2"
                aria-label="Close controlled mode"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning banner */}
            <AnimatePresence>
              {showWarning && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="mx-4 mt-4 mb-2 p-3 rounded-lg"
                  style={{
                    background: 'rgba(255,200,100,0.1)',
                    border: '1px solid rgba(255,200,100,0.3)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ffc864' }} />
                    <div className="flex-1 text-sm text-gray-300">
                      <p className="font-medium text-amber-300 mb-1">⚠️ Controlled Mode Active</p>
                      <p>
                        This mode allows you to predetermine roulette results. The animation will look
                        completely random to viewers, but will always land on your selected entry.
                        Use responsibly for content creation, demonstrations, and scripted videos only.
                      </p>
                      <button
                        onClick={() => setShowWarning(false)}
                        className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline"
                      >
                        I understand, don't show again
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Master toggle */}
              <div className="glass-panel rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-300">Controlled Results</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Enable to force a specific outcome on every spin
                    </p>
                  </div>
                  <button
                    onClick={onToggle}
                    className={`relative w-14 h-7 rounded-full transition-all duration-200 flex items-center ${
                      isEnabled ? 'bg-amber-500/30 border border-amber-500/50' : 'bg-gray-700 border border-gray-600'
                    }`}
                    aria-pressed={isEnabled}
                  >
                    <span
                      className={`absolute w-5 h-5 rounded-full bg-white shadow-lg transition-transform duration-200 ${
                        isEnabled ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                {isEnabled && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-3 rounded-lg text-xs"
                    style={{
                      background: 'rgba(255,200,100,0.1)',
                      border: '1px solid rgba(255,200,100,0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 text-amber-300 mb-1">
                      <Zap className="w-3 h-3" />
                      <span className="font-medium">ACTIVE</span>
                    </div>
                    <p className="text-gray-400">
                      Next spin will land on: <strong className="text-pure-white">{targetEntry?.label || 'Not set'}</strong>
                    </p>
                  </motion.div>
                )}
              </div>

              {isEnabled && (
                <>
                  {/* Target selection */}
                  <div>
                    <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider mb-3">
                      Target Entry
                    </h4>

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {entries.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => onSetTarget(entry.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            controlledMode.targetEntryId === entry.id
                              ? 'bg-amber-500/20 border border-amber-500/50'
                              : 'bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 hover:bg-gray-800'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              controlledMode.targetEntryId === entry.id
                                ? 'bg-amber-500/30 border border-amber-500/50'
                                : 'bg-gray-700/50 border border-gray-600/50'
                            }`}
                          >
                            {controlledMode.targetEntryId === entry.id ? (
                              <Target className="w-4 h-4" style={{ color: '#ffc864' }} />
                            ) : (
                              <span className="text-xs font-mono text-gray-500">
                                {entries.findIndex(e => e.id === entry.id) + 1}
                              </span>
                            )}
                          </div>
                          <span className="flex-1 truncate font-medium illuminated-text-subtle">{entry.label}</span>
                          {controlledMode.targetEntryId === entry.id && (
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                                background: 'rgba(255,200,100,0.2)',
                                color: '#ffc864',
                                border: '1px solid rgba(255,200,100,0.3)',
                              }}>
                                TARGET
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); onClearTarget(); }}
                                className="btn-ghost p-1.5 text-gray-400 hover:text-red-400"
                                aria-label="Clear target"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </button>
                      ))}

                      {entries.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Info className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                          <p>No entries in this roulette</p>
                          <p className="text-sm mt-1">Add entries first to set a target</p>
                        </div>
                      )}
                    </div>

                    {controlledMode.targetEntryId && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            const entry = entries.find(e => e.id === controlledMode.targetEntryId);
                            if (entry) {
                              navigator.clipboard.writeText(entry.label);
                              setCopiedTarget(true);
                              setTimeout(() => setCopiedTarget(false), 2000);
                            }
                          }}
                          className="btn-secondary flex-1 justify-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          <span>{copiedTarget ? 'Copied!' : 'Copy Target Name'}</span>
                        </button>
                        <button
                          onClick={onClearTarget}
                          className="btn-secondary flex-1 justify-center gap-2 text-red-400 border-red-900/30 hover:bg-red-900/10"
                        >
                          <X className="w-4 h-4" />
                          <span>Clear</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Usage tips */}
                  <div className="glass-panel rounded-xl p-4 border border-gray-700/50">
                    <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Tips for Content Creators
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400">•</span>
                        <span>Set the target <strong>before</strong> starting your recording</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400">•</span>
                        <span>The animation looks <strong>identical</strong> to random mode</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400">•</span>
                        <span>Change targets between takes without viewers noticing</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400">•</span>
                        <span>Use <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 font-mono text-xs">Ctrl+Shift+C</kbd> to toggle quickly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400">•</span>
                        <span>Disable when done to return to normal random behavior</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}

              {!isEnabled && (
                <div className="text-center py-8">
                  <Lock className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                  <p className="text-gray-500">Enable Controlled Mode to set a target entry</p>
                  <p className="text-xs text-gray-600 mt-1">The animation will always land on your chosen entry</p>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-3 border-t border-gray-800/50">
              <p className="text-center text-xs text-gray-500">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 font-mono">Esc</kbd> or click outside to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ControlledModePanel.displayName = 'ControlledModePanel';