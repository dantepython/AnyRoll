// Spin Button Component - The main action trigger

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Loader2, CheckCircle } from 'lucide-react';

interface SpinButtonProps {
  isSpinning: boolean;
  showResult: boolean;
  lastResult?: { entry: { label: string } } | null;
  onSpin: () => void;
  onReSpin: () => void;
  disabled?: boolean;
  className?: string;
}

export const SpinButton = memo(function SpinButton({
  isSpinning,
  showResult,
  lastResult,
  onSpin,
  onReSpin,
  disabled = false,
  className = '',
}: SpinButtonProps) {
  const [isHovered, setIsHovered] = useState(false);


  const handleSpin = useCallback(() => {
    if (!isSpinning && !showResult && !disabled) {
      onSpin();
    } else if (showResult && !disabled) {
      onReSpin();
    }
  }, [isSpinning, showResult, disabled, onSpin, onReSpin]);

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      {/* Main spin button */}
      <motion.button
        type="button"
        onClick={handleSpin}
        disabled={disabled || isSpinning}
        className={`
          relative w-full min-w-[200px] px-8 py-4 rounded-xl
          font-display font-semibold text-lg
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-gray-500/50 focus:ring-offset-2 focus:ring-offset-deep-black
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isSpinning ? 'cursor-wait' : 'cursor-pointer'}
        `}
        style={{
          background: isSpinning
            ? 'linear-gradient(135deg, #262626 0%, #1a1a1a 100%)'
            : showResult
            ? 'linear-gradient(135deg, #1a2e1a 0%, #142014 100%)'
            : 'linear-gradient(135deg, #1e1e1e 0%, #141414 100%)',
          borderColor: isSpinning
            ? 'rgba(255,255,255,0.2)'
            : showResult
            ? 'rgba(100,255,100,0.3)'
            : 'rgba(255,255,255,0.1)',
          boxShadow: isSpinning
            ? '0 0 40px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
            : showResult
            ? '0 0 30px rgba(100,255,100,0.15), inset 0 1px 0 rgba(100,255,100,0.1)'
            : isHovered
            ? '0 0 30px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
            : 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          {isSpinning ? (
            <motion.div
              key="spinning"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-3"
            >
              <motion.span
                className="flex items-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-6 h-6 text-gray-300" strokeWidth={2.5} />
              </motion.span>
              <span className="text-pure-white">Spinning…</span>
            </motion.div>
          ) : showResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3"
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex items-center justify-center w-8 h-8 rounded-full"
                style={{ background: 'rgba(100,255,100,0.15)', border: '1px solid rgba(100,255,100,0.3)' }}
              >
                <CheckCircle className="w-5 h-5" style={{ color: '#64ff64' }} />
              </motion.div>
              <span className="text-pure-white">Spin Again</span>
            </motion.div>
          ) : (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3"
            >
              <motion.div
                className="flex items-center justify-center w-8 h-8 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Play className="w-5 h-5 text-gray-300" style={{ marginLeft: 2 }} />
              </motion.div>
              <span className="text-pure-white">Spin</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle glow ring when ready */}
        {!isSpinning && !showResult && !disabled && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 0 0 0 rgba(255,255,255,0.1)',
            }}
            animate={{ boxShadow: ['0 0 0 0 rgba(255,255,255,0.1)', '0 0 0 8px rgba(255,255,255,0)', '0 0 0 0 rgba(255,255,255,0.1)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Result text when just finished */}
        {showResult && lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
            style={{
              background: 'rgba(20, 32, 20, 0.95)',
              border: '1px solid rgba(100,255,100,0.3)',
              color: '#64ff64',
              backdropFilter: 'blur(20px)',
            }}
          >
            Selected: {lastResult.entry.label}
          </motion.div>
        )}
      </motion.button>

      {/* Keyboard hint */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <kbd className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 font-mono">Space</kbd>
        <span>or</span>
        <kbd className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 font-mono">Enter</kbd>
        <span>to spin</span>
      </div>
    </div>
  );
});

SpinButton.displayName = 'SpinButton';