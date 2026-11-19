// Roulette Selector Component - Manage saved roulettes

import { memo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Copy, Edit2, FolderOpen, Save, X, MoreVertical, Check
} from 'lucide-react';
import type { Roulette } from '../types';
import { formatRelativeTime } from '../lib/utils';

interface RouletteSelectorProps {
  roulettes: Roulette[];
  currentRouletteId: string | null;
  onSelect: (id: string) => void;
  onCreate: (title: string) => void;
  onDuplicate: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  isSpinning: boolean;
  className?: string;
}

export const RouletteSelector = memo(function RouletteSelector({
  roulettes,
  currentRouletteId,
  onSelect,
  onCreate,
  onDuplicate,
  onDelete,
  onRename,
  isSpinning,
  className = '',
}: RouletteSelectorProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRouletteTitle, setNewRouletteTitle] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus inputs
  useEffect(() => {
    if (showCreateModal) {
      setTimeout(() => createInputRef.current?.focus(), 100);
    }
    if (renamingId) {
      setTimeout(() => renameInputRef.current?.focus(), 0);
    }
  }, [showCreateModal, renamingId]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRouletteTitle.trim()) {
      onCreate(newRouletteTitle.trim());
      setShowCreateModal(false);
      setNewRouletteTitle('');
    }
  };

  const handleRenameSubmit = (id: string) => {
    if (renameValue.trim() && renameValue.trim() !== roulettes.find(r => r.id === id)?.title) {
      onRename(id, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleMenuAction = (action: 'duplicate' | 'rename' | 'delete', id: string) => {
    const roulette = roulettes.find(r => r.id === id);
    if (!roulette) return;

    switch (action) {
      case 'duplicate':
        onDuplicate(id, `${roulette.title} (Copy)`);
        break;
      case 'rename':
        setRenamingId(id);
        setRenameValue(roulette.title);
        break;
      case 'delete':
        if (confirm(`Delete "${roulette.title}"? This cannot be undone.`)) {
          onDelete(id);
        }
        break;
    }
    setOpenMenuId(null);
  };

  return (
    <div className={`glass-panel rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
        <h3 className="font-display font-semibold text-lg illuminated-text">
          Roulettes <span className="text-gray-500 font-normal text-sm">({roulettes.length})</span>
        </h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
          disabled={isSpinning}
          aria-label="Create new roulette"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>New</span>
        </button>
      </div>

      {/* Roulette list */}
      <div className="max-h-64 overflow-y-auto">
        <AnimatePresence>
          <motion.ul
            key={roulettes.length}
            className="divide-y divide-gray-800/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {roulettes.map((roulette, index) => (
              <RouletteListItem
                key={roulette.id}
                roulette={roulette}
                index={index}
                isActive={roulette.id === currentRouletteId}
                isRenaming={renamingId === roulette.id}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                onSelect={() => onSelect(roulette.id)}
                onRenameSubmit={handleRenameSubmit}
                onCancelRename={() => { setRenamingId(null); setRenameValue(''); }}
                onMenuToggle={() => setOpenMenuId(openMenuId === roulette.id ? null : roulette.id)}
                onMenuAction={handleMenuAction}
                isMenuOpen={openMenuId === roulette.id}
                disabled={isSpinning}
                menuRef={menuRef}
                renameInputRef={renameInputRef}
              />
            ))}
          </motion.ul>
        </AnimatePresence>

        {roulettes.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p>No roulettes yet</p>
            <p className="text-sm mt-1">Create your first roulette to get started</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-panel-strong rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display font-semibold illuminated-text">Create New Roulette</h4>
                <button
                  onClick={() => { setShowCreateModal(false); setNewRouletteTitle(''); }}
                  className="btn-ghost p-1"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <p className="text-gray-400 text-sm mb-4">
                  Give your roulette a name. You can add entries after creating it.
                </p>
                <input
                  ref={createInputRef}
                  type="text"
                  value={newRouletteTitle}
                  onChange={(e) => setNewRouletteTitle(e.target.value)}
                  placeholder="My Roulette"
                  className="input-field mb-4"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setNewRouletteTitle(''); }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!newRouletteTitle.trim()}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Individual roulette list item
interface RouletteListItemProps {
  roulette: Roulette;
  index: number;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  setRenameValue: (value: string) => void;
  onSelect: () => void;
  onRenameSubmit: (id: string) => void;
  onCancelRename: () => void;
  onMenuToggle: () => void;
  onMenuAction: (action: 'duplicate' | 'rename' | 'delete', id: string) => void;
  isMenuOpen: boolean;
  disabled: boolean;
  menuRef: React.RefObject<HTMLDivElement>;
  renameInputRef: React.RefObject<HTMLInputElement>;
}

const RouletteListItem = function RouletteListItem({
  roulette,
  index,
  isActive,
  isRenaming,
  renameValue,
  setRenameValue,
  onSelect,
  onRenameSubmit,
  onCancelRename,
  onMenuToggle,
  onMenuAction,
  isMenuOpen,
  disabled,
  menuRef,
  renameInputRef,
}: RouletteListItemProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onRenameSubmit(roulette.id);
    else if (e.key === 'Escape') onCancelRename();
  };

  return (
    <AnimatePresence mode="popLayout">
      <motion.li
        key={roulette.id}
        initial={{ opacity: 0, x: -20, height: 0 }}
        animate={{ opacity: 1, x: 0, height: 'auto' }}
        exit={{ opacity: 0, x: 20, height: 0 }}
        className={`relative group transition-colors ${
          isActive ? 'bg-gray-800/30' : 'hover:bg-gray-800/20'
        }`}
      >
        {isRenaming ? (
          <div className="flex items-center gap-2 px-4 py-3 w-full">
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => onRenameSubmit(roulette.id)}
              className="input-field flex-1 text-base"
              autoFocus
            />
            <button
              onClick={() => onRenameSubmit(roulette.id)}
              className="btn-ghost p-1.5 text-green-400 hover:text-green-300"
              aria-label="Save"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={onCancelRename}
              className="btn-ghost p-1.5 text-gray-400 hover:text-gray-300"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onSelect}
              disabled={disabled || isActive}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                isActive
                  ? 'bg-gray-800/30 text-pure-white'
                  : 'text-gray-300 hover:text-pure-white'
              } disabled:opacity-50`}
              aria-current={isActive ? 'true' : 'false'}
            >
              <span className="flex-1 min-w-0 truncate font-medium">{roulette.title}</span>
              <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                {roulette.entries.length} entries
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {formatRelativeTime(roulette.updatedAt)}
              </span>
              {isActive && (
                <span className="w-2 h-2 rounded-full" style={{ background: '#64ff64' }} />
              )}
            </button>

            {/* Menu button */}
            <button
              onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="More options"
              aria-expanded={isMenuOpen}
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-3 top-full mt-1 glass-panel-strong rounded-lg py-1 shadow-deep border border-gray-700/50 z-20 min-w-[160px]"
                  role="menu"
                >
                  <button
                    onClick={() => onMenuAction('duplicate', roulette.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-pure-white hover:bg-gray-800/50 transition-colors"
                    role="menuitem"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => onMenuAction('rename', roulette.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-pure-white hover:bg-gray-800/50 transition-colors"
                    role="menuitem"
                  >
                    <Edit2 className="w-4 h-4" />
                    Rename
                  </button>
                  <button
                    onClick={() => onMenuAction('delete', roulette.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                    role="menuitem"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.li>
    </AnimatePresence>
  );
};