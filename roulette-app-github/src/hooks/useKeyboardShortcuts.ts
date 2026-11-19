// Keyboard shortcuts hook

import { useEffect, useCallback, useRef } from 'react';
import { matchesShortcut } from '../lib/utils';

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  enabled: boolean = true,
  target: EventTarget = window
) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow some shortcuts even in inputs (like Escape)
      if (event.key !== 'Escape') return;
    }

    for (const [shortcut, handler] of Object.entries(shortcutsRef.current)) {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        handler();
        break;
      }
    }
  }, [enabled]);

  useEffect(() => {
    target.addEventListener('keydown', handleKeyDown as EventListener);
    return () => target.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [handleKeyDown, target]);
}

// Default shortcuts for the app
export function createDefaultShortcuts(actions: {
  spin: () => void;
  newRoulette: () => void;
  toggleSettings: () => void;
  toggleControlledMode: () => void;
  dismissResult: () => void;
  copyResult: () => void;
  focusEntryInput: () => void;
}): Record<string, () => void> {
  return {
    'Space': actions.spin,
    'Enter': actions.spin,
    'meta+n': actions.newRoulette,
    'ctrl+n': actions.newRoulette,
    'meta+,': actions.toggleSettings,
    'ctrl+,': actions.toggleSettings,
    'meta+shift+c': actions.toggleControlledMode,
    'ctrl+shift+c': actions.toggleControlledMode,
    'Escape': actions.dismissResult,
    'meta+c': actions.copyResult,
    'ctrl+c': actions.copyResult,
    'meta+i': actions.focusEntryInput,
    'ctrl+i': actions.focusEntryInput,
  };
}