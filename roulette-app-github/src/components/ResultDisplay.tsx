// Result Display Component - Beautiful result reveal

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RotateCcw, X } from 'lucide-react';
import type { SpinResult } from '../types';
import { formatTimestamp } from '../lib/utils';

interface ResultDisplayProps {
  result: SpinResult | null;
  isVisible: boolean;
  onDismiss: () => void;
  onCopy: () => void;
  onReSpin: () => void;
  rouletteTitle: string;
  wasControlled: boolean;
  className?: string;
}

export const ResultDisplay = memo(function ResultDisplay({
  result,
  isVisible,
  onDismiss,
  onCopy,
  onReSpin,
  rouletteTitle,
  wasControlled,
  className = '',
}: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
  };

  if (!isVisible || !result) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
        onClick={onDismiss}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0)' }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 180,
            duration: 0.6,
          }}
          className="glass-panel-strong rounded-2xl overflow-hidden w-full max-w-md relative"
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: `
              0 25px 50px -12px rgba(0,0,0,0.8),
              0 0 60px rgba(255,255,255,0.08),
              inset 0 1px 0 rgba(255,255,255,0.05)
            `,
          }}
        >
          {/* Top accent bar */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
            className="absolute top-0 left-0 h-1"
            style={{
              background: 'linear-gradient(90deg, transparent, #64ff64, transparent)',
            }}
          />

          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 btn-ghost p-1.5 z-10"
            aria-label="Dismiss result"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 pt-10 space-y-6">
            {/* Header */}
            <div className="text-center">
              <motion.span
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: 'rgba(100,255,100,0.15)',
                  border: '1px solid rgba(100,255,100,0.3)',
                  color: '#64ff64',
                }}
              >
                <Check className="w-3 h-3" />
                Selected
              </motion.span>

              {wasControlled && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-2"
                  style={{
                    background: 'rgba(255,200,100,0.15)',
                    border: '1px solid rgba(255,200,100,0.3)',
                    color: '#ffc864',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ffc864' }} />
                  Controlled Mode
                </motion.span>
              )}

              <p className="mt-2 text-xs text-gray-500 font-mono">{rouletteTitle}</p>
            </div>

            {/* Result card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.25, type: 'spring', damping: 20, stiffness: 200 }}
              className="relative"
            >
              <div
                className="relative px-6 py-8 rounded-xl text-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,32,20,0.8) 0%, rgba(10,20,10,0.9) 100%)',
                  border: '1px solid rgba(100,255,100,0.2)',
                  boxShadow: `
                    0 0 40px rgba(100,255,100,0.1),
                    inset 0 1px 0 rgba(100,255,100,0.05)
                  `,
                }}
              >
                {/* Subtle glow behind text */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: '12px',
                    background: 'radial-gradient(ellipse at center, rgba(100,255,100,0.1) 0%, transparent 70%)',
                  }}
                />

                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="relative block text-3xl sm:text-4xl font-display font-semibold illuminated-text leading-tight break-words"
                  style={{
                    textShadow: `
                      0 0 30px rgba(100,255,100,0.4),
                      0 0 60px rgba(100,255,100,0.2),
                      0 2px 10px rgba(0,0,0,0.5)
                    `,
                  }}
                >
                  {result.entry.label}
                </motion.span>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="relative mt-3 text-sm text-gray-400"
                >
                  Selected at {formatTimestamp(result.timestamp)}
                  {result.wasControlled && ' • Controlled result'}
                </motion.p>
              </div>

              {/* Corner accents */}
              {['tl', 'tr', 'bl', 'br'].map((corner) => (
                <motion.div
                  key={corner}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + Math.random() * 0.2, type: 'spring', damping: 15 }}
                  className="absolute w-2 h-2"
                  style={{
                    [corner.includes('t') ? 'top' : 'bottom']: 8,
                    [corner.includes('l') ? 'left' : 'right']: 8,
                    borderTop: corner.includes('t') ? '2px solid rgba(100,255,100,0.5)' : 'none',
                    borderBottom: corner.includes('b') ? '2px solid rgba(100,255,100,0.5)' : 'none',
                    borderLeft: corner.includes('l') ? '2px solid rgba(100,255,100,0.5)' : 'none',
                    borderRight: corner.includes('r') ? '2px solid rgba(100,255,100,0.5)' : 'none',
                    borderRadius: corner === 'tl' ? '4px 0 0 0' : corner === 'tr' ? '0 4px 0 0' : corner === 'bl' ? '0 0 0 4px' : '0 0 4px 0',
                  }}
                />
              ))}
            </motion.div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleCopy}
                className={`btn-secondary flex items-center gap-2 ${copied ? 'bg-green-900/30 border-green-700/50 text-green-300' : ''}`}
                aria-label={copied ? 'Copied!' : 'Copy result'}
              >
                <Copy className="w-4 h-4" />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={onReSpin}
                className="btn-primary flex items-center gap-2"
                aria-label="Spin again"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Spin Again</span>
              </button>
            </div>

            {/* Dismiss hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center text-xs text-gray-500"
            >
              Click outside or press <kbd className="px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 font-mono">Esc</kbd> to dismiss
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

ResultDisplay.displayName = 'ResultDisplay';