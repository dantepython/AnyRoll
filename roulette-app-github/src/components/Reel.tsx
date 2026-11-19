// Main Reel Component - Slot machine style vertical scrolling

import { memo, useRef, useEffect, useMemo, useCallback } from 'react';
import type { RouletteEntry, RouletteSettings } from '../types';
import { clamp } from '../lib/utils';

interface ReelProps {
  entries: RouletteEntry[];
  spinOffset: number;
  spinVelocity: number;
  isSpinning: boolean;
  settings: RouletteSettings;
  selectedIndex: number | null;
  showResult: boolean;
  itemHeight: number;
  visibleItems: number;
  onItemHeightChange: (height: number) => void;
  className?: string;
}

// Individual entry item component
const ReelItem = memo(function ReelItem({
  entry,
  isSelected,
  isCentered,
  settings,
  itemHeight,
}: {
  entry: RouletteEntry;
  isSelected: boolean;
  isCentered: boolean;
  settings: RouletteSettings;
  itemHeight: number;
}) {
  const glowIntensity = settings.glowIntensity;
  const borderIntensity = settings.borderIntensity;

  return (
    <div
      className="reel-item flex items-center justify-center px-4 select-none"
      style={{
        height: itemHeight,
        fontSize: settings.entryTypography.fontSize * settings.reelDimensions.width / 400,
        fontWeight: settings.entryTypography.fontWeight,
        lineHeight: settings.entryTypography.lineHeight,
        letterSpacing: settings.entryTypography.letterSpacing,
        opacity: isCentered ? 1 : 0.82,
        transform: isCentered ? 'scale(1.04)' : 'scale(0.99)',
        filter: 'none',
        textShadow: isSelected && isCentered
          ? `0 0 ${30 * glowIntensity}px rgba(255,255,255,${0.4 * glowIntensity}), 0 0 ${60 * glowIntensity}px rgba(255,255,255,${0.2 * glowIntensity})`
          : 'none',
      }}
    >
      <span className="text-balance whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
        {entry.label}
      </span>
    </div>
  );
});

// Glow overlay for the center selection area
const CenterGlow = memo(function CenterGlow({
  intensity,
  height,
  width,
}: {
  intensity: number;
  height: number;
  width: number;
}) {
  if (intensity <= 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0"
      style={{
        top: '50%',
        transform: 'translateY(-50%)',
        height,
        width: width * 0.9,
        margin: '0 auto',
        borderRadius: '8px',
        boxShadow: `
          inset 0 0 ${40 * intensity}px rgba(255,255,255,${0.1 * intensity}),
          inset 0 0 ${80 * intensity}px rgba(255,255,255,${0.05 * intensity}),
          0 0 ${60 * intensity}px rgba(255,255,255,${0.08 * intensity}),
          0 0 ${120 * intensity}px rgba(255,255,255,${0.03 * intensity})
        `,
        background: `
          linear-gradient(
            180deg,
            transparent 0%,
            rgba(255,255,255,${0.02 * intensity}) 40%,
            rgba(255,255,255,${0.05 * intensity}) 50%,
            rgba(255,255,255,${0.02 * intensity}) 60%,
            transparent 100%
          )
        `,
      }}
    />
  );
});

// Edge fade masks
const EdgeFade = memo(function EdgeFade({
  position,
  height,
  width,
}: {
  position: 'top' | 'bottom';
  height: number;
  width: number;
}) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0"
      style={{
        [position]: 0,
        height,
        width: width * 0.95,
        margin: '0 auto',
        borderRadius: '8px',
        background: position === 'top'
          ? 'linear-gradient(180deg, rgba(3,3,3,1) 0%, rgba(3,3,3,0) 100%)'
          : 'linear-gradient(0deg, rgba(3,3,3,1) 0%, rgba(3,3,3,0) 100%)',
      }}
    />
  );
});

export const Reel = memo(function Reel({
  entries,
  spinOffset,
  spinVelocity,
  isSpinning,
  settings,
  selectedIndex,
  showResult,
  itemHeight: initialItemHeight,
  visibleItems,
  onItemHeightChange,
  className = '',
}: ReelProps) {
  const reelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Calculate item height based on container
  const itemHeight = useMemo(() => {
    if (reelRef.current) {
      const containerHeight = reelRef.current.clientHeight;
      const calculated = containerHeight / visibleItems;
      return clamp(calculated, 50, 100);
    }
    return initialItemHeight;
  }, [initialItemHeight, visibleItems]);

  // Notify parent of item height
  useEffect(() => {
    onItemHeightChange(itemHeight);
  }, [itemHeight, onItemHeightChange]);

  // Use a stable repeated track. The animation engine computes an exact final
  // offset for a target item; rendering the whole track makes that movement
  // visible instead of rebuilding a tiny modulo window on every frame.
  const centerIndex = Math.floor(visibleItems / 2);
  const trackCopies = Math.max(4, settings.cyclesBeforeStop + 3);
  const trackEntries = useMemo(() => {
    if (entries.length === 0) return [];
    return Array.from({ length: entries.length * trackCopies }, (_, trackIndex) => ({
      trackIndex,
      index: trackIndex % entries.length,
      entry: entries[trackIndex % entries.length],
    }));
  }, [entries, trackCopies]);

  // Determine which repeated item is in the center of the viewport.
  const getItemState = useCallback((trackIndex: number, entryIndex: number) => {
    const centerPosition = (-spinOffset / itemHeight) + centerIndex;
    const isCentered = Math.abs(centerPosition - trackIndex) < 0.6;
    const isSelected = showResult && selectedIndex !== null && entryIndex === selectedIndex && isCentered;
    return { isCentered, isSelected };
  }, [spinOffset, itemHeight, centerIndex, showResult, selectedIndex]);

  // Handle empty state
  if (entries.length === 0) {
    return (
      <div
        ref={reelRef}
        className={`reel-container relative rounded-xl border border-gray-800/50 bg-gray-900/30 ${className}`}
        style={{
          width: settings.reelDimensions.width,
          height: settings.reelDimensions.height,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <span className="text-sm font-medium">No entries — add some above</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={reelRef}
      className={`reel-container relative ${className}`}
      style={{
        width: settings.reelDimensions.width,
        height: settings.reelDimensions.height,
        maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
      }}
    >
      {/* Background layer */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at center, rgba(255,255,255,${0.02 * settings.backgroundIntensity}) 0%, transparent 70%),
            linear-gradient(180deg, #111111 0%, #242424 50%, #111111 100%)
          `,
          borderRadius: '12px',
        }}
      />

      {/* Subtle grid lines for mechanical feel */}
      {settings.animationEffects && (
        <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: '12px' }}>
          {Array.from({ length: visibleItems + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 h-px"
              style={{
                top: `${(i / visibleItems) * 100}%`,
                background: `linear-gradient(90deg, transparent, rgba(255,255,255,${0.03 * settings.borderIntensity}), transparent)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Scrolling entries: one stable track, translated every animation frame */}
      <div
        className="absolute left-0 right-0"
        style={{
          transform: `translate3d(0, ${spinOffset}px, 0)`,
          willChange: isSpinning ? 'transform' : 'auto',
        }}
      >
        {trackEntries.map(({ trackIndex, index, entry }) => {
          const { isCentered, isSelected } = getItemState(trackIndex, index);
          return (
            <ReelItem
              key={`${entry.id}-${trackIndex}`}
              entry={entry}
              isSelected={isSelected}
              isCentered={isCentered}
              settings={settings}
              itemHeight={itemHeight}
            />
          );
        })}
      </div>

      {/* Center glow overlay */}
      <CenterGlow
        intensity={settings.glowIntensity}
        height={itemHeight * 1.2}
        width={settings.reelDimensions.width}
      />

      {/* Edge fades */}
      <EdgeFade position="top" height={itemHeight * 2} width={settings.reelDimensions.width} />
      <EdgeFade position="bottom" height={itemHeight * 2} width={settings.reelDimensions.width} />

      {/* Center indicator line */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: settings.reelDimensions.width * 0.85,
          height: '1px',
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,${0.3 * settings.borderIntensity}), transparent)`,
          boxShadow: `0 0 ${10 * settings.glowIntensity}px rgba(255,255,255,${0.2 * settings.glowIntensity})`,
        }}
      />

      {/* Velocity indicator (subtle) */}
      {isSpinning && Math.abs(spinVelocity) > 50 && (
        <div
          className="absolute right-3 top-3 pointer-events-none"
          style={{
            width: '4px',
            height: clamp(Math.abs(spinVelocity) / 10, 20, 60),
            background: `linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0))`,
            borderRadius: '2px',
            opacity: 0.6,
          }}
        />
      )}

      {/* Border frame */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: '12px',
          border: `1px solid rgba(255,255,255,${0.1 * settings.borderIntensity})`,
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,${0.05 * settings.borderIntensity}),
            inset 0 -1px 0 rgba(0,0,0,${0.3 * settings.borderIntensity}),
            0 0 ${20 * settings.glowIntensity}px rgba(255,255,255,${0.05 * settings.glowIntensity})
          `,
        }}
      />
    </div>
  );
});

Reel.displayName = 'Reel';