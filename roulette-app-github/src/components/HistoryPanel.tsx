// History Panel Component - Display spin history

import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Copy, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import type { HistoryEntry } from '../types';
import { formatRelativeTime, formatTimestamp } from '../lib/utils';
import { loadHistory, clearHistory, clearHistoryForRoulette } from '../lib/storage';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentRouletteId: string | null;
  currentRouletteTitle: string;
  className?: string;
}

export const HistoryPanel = memo(function HistoryPanel({
  isOpen,
  onClose,
  currentRouletteId,
  currentRouletteTitle,
  className = '',
}: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'current'>('current');
  const [isLoading, setIsLoading] = useState(true);

  // Load history
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        if (filter === 'current' && currentRouletteId) {
          const data = await loadHistoryForRoulette(currentRouletteId);
          setHistory(data);
        } else {
          const data = await loadHistory();
          setHistory(data);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [filter, currentRouletteId]);

  // Load history for specific roulette
  async function loadHistoryForRoulette(rouletteId: string) {
    const { loadHistory } = await import('../lib/storage');
    return loadHistory(1000).then(h => h.filter(e => e.rouletteId === rouletteId));
  }

  const handleClearHistory = async () => {
    const confirmMsg = filter === 'current' && currentRouletteId
      ? `Clear history for "${currentRouletteTitle}"?`
      : 'Clear ALL history? This cannot be undone.';

    if (confirm(confirmMsg)) {
      if (filter === 'current' && currentRouletteId) {
        await clearHistoryForRoulette(currentRouletteId);
      } else {
        await clearHistory();
      }
      setHistory([]);
    }
  };

  const handleCopy = async (entry: HistoryEntry) => {
    await navigator.clipboard.writeText(entry.entry.label);
  };

  const handleReSpin = (entry: HistoryEntry) => {
    // This would need to be handled by parent - for now just close
    onClose();
    // The parent would need to load that roulette and spin
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`glass-panel-strong rounded-2xl overflow-hidden w-full max-w-md max-h-[80vh] flex flex-col ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
            <h2 id="history-title" className="font-display font-semibold text-lg illuminated-text">
              Spin History
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                disabled={history.length === 0 || isLoading}
                className="btn-ghost p-2 text-red-400 hover:text-red-300 disabled:opacity-30"
                aria-label="Clear history"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="btn-ghost p-2"
                aria-label="Close history"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-gray-800/50 px-4">
            {[
              { id: 'current', label: 'This Roulette', count: filter === 'current' ? history.length : 0 },
              { id: 'all', label: 'All Roulettes', count: filter === 'all' ? history.length : 0 },
            ].map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setFilter(id as 'all' | 'current')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  filter === id
                    ? 'text-pure-white border-b-2 border-gray-300'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                disabled={id === 'current' && !currentRouletteId}
              >
                {label}
                <span className="px-2 py-0.5 rounded-full text-xs font-mono tabular-nums bg-gray-800/50">
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-transparent rounded-full" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <Clock className="w-12 h-12 mb-3 text-gray-700" />
                <p>{filter === 'current' ? 'No spins yet for this roulette' : 'No spin history yet'}</p>
                <p className="text-sm mt-1">Spin the roulette to see history here</p>
              </div>
            ) : (
              <AnimatePresence>
                <motion.ul
                  key={filter}
                  className="divide-y divide-gray-800/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {history.map((entry, index) => (
                    <HistoryItem
                      key={entry.id}
                      entry={entry}
                      index={index}
                      onCopy={() => handleCopy(entry)}
                      onReSpin={() => handleReSpin(entry)}
                      showRoulette={filter === 'all'}
                    />
                  ))}
                </motion.ul>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

// Individual history item
interface HistoryItemProps {
  entry: HistoryEntry;
  index: number;
  onCopy: () => void;
  onReSpin: () => void;
  showRoulette: boolean;
}

const HistoryItem = function HistoryItem({
  entry,
  index,
  onCopy,
  onReSpin,
  showRoulette,
}: HistoryItemProps) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.03 }}
      className="group relative flex items-center gap-3 px-2 py-3 hover:bg-gray-800/30 rounded-lg transition-colors"
    >
      {/* Number */}
      <span className="w-6 text-right text-xs text-gray-500 font-mono tabular-nums">
        {index + 1}.
      </span>

      {/* Result indicator */}
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#64ff64' }} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium illuminated-text-subtle truncate">{entry.entry.label}</p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(entry.timestamp)}
          </span>
          {entry.wasControlled && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
              background: 'rgba(255,200,100,0.2)',
              color: '#ffc864',
              border: '1px solid rgba(255,200,100,0.3)',
            }}>
              Controlled
            </span>
          )}
          {showRoulette && (
            <span className="truncate max-w-[120px]">{entry.rouletteTitle}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onCopy}
          className="btn-ghost p-1.5 text-gray-400 hover:text-pure-white"
          aria-label="Copy result"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={onReSpin}
          className="btn-ghost p-1.5 text-gray-400 hover:text-green-400"
          aria-label="Spin again with this roulette"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </motion.li>
  );
};