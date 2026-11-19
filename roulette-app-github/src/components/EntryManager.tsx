// Entry Manager Component - Add, edit, remove, reorder entries

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, GripVertical, Edit2, Clipboard, Shuffle, X, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import type { RouletteEntry } from '../types';
import { parseEntries } from '../lib/utils';

interface EntryManagerProps {
  entries: RouletteEntry[];
  entryInput: string;
  setEntryInput: (value: string) => void;
  onAddEntry: () => void;
  onRemoveEntry: (id: string) => void;
  onUpdateEntry: (id: string, label: string) => void;
  onReorderEntry: (fromIndex: number, toIndex: number) => void;
  onPasteEntries: (text: string) => void;
  onShuffleEntries: () => void;
  onClearEntries: () => void;
  isSpinning: boolean;
  className?: string;
}

export const EntryManager = function EntryManager({
  entries,
  entryInput,
  setEntryInput,
  onAddEntry,
  onRemoveEntry,
  onUpdateEntry,
  onReorderEntry,
  onPasteEntries,
  onShuffleEntries,
  onClearEntries,
  isSpinning,
  className = '',
}: EntryManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId) {
      setTimeout(() => editRef.current?.focus(), 0);
    }
  }, [editingId]);

  const handleAddEntry = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (entryInput.trim()) onAddEntry();
  }, [entryInput, onAddEntry]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const parsed = parseEntries(text);
    if (parsed.length > 1) {
      onPasteEntries(text);
    } else if (parsed.length === 1) {
      setEntryInput(parsed[0]);
    }
  }, [onPasteEntries]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleAddEntry(e);
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
    }
  }, [handleAddEntry]);

  const startEditing = useCallback((entry: RouletteEntry) => {
    setEditingId(entry.id);
    setEditValue(entry.label);
  }, []);

  const saveEditing = useCallback(() => {
    if (editingId && editValue.trim() && editValue.trim() !== entries.find(e => e.id === editingId)?.label) {
      onUpdateEntry(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue, entries, onUpdateEntry]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveEditing();
    else if (e.key === 'Escape') cancelEditing();
  }, [saveEditing, cancelEditing]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (isSpinning) { e.preventDefault(); return; }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, [isSpinning]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorderEntry(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, onReorderEntry]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handlePasteModalSubmit = useCallback(() => {
    if (pasteText.trim()) {
      onPasteEntries(pasteText);
      setShowPasteModal(false);
      setPasteText('');
    }
  }, [pasteText, onPasteEntries]);

  if (entries.length === 0) {
    return (
      <div className={`glass-panel rounded-2xl p-6 ${className}`}>
        <div className="space-y-4">
          {/* Input area */}
          <form onSubmit={handleAddEntry} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={entryInput}
              onChange={(e) => setEntryInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Add an entry… (paste multiple lines for bulk)"
              className="input-field flex-1"
              disabled={isSpinning}
              aria-label="Add entry"
            />
            <button
              type="submit"
              className="btn-primary whitespace-nowrap"
              disabled={isSpinning || !entryInput.trim()}
              aria-label="Add entry"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          {/* Paste button */}
          <button
            type="button"
            onClick={() => setShowPasteModal(true)}
            className="btn-ghost w-full justify-start gap-2"
            disabled={isSpinning}
          >
            <Clipboard className="w-4 h-4" />
            <span>Paste multiple entries</span>
          </button>
        </div>

        {/* Empty state hint */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Start by adding entries above, or paste a list.</p>
          <p className="mt-1 font-mono text-xs text-gray-600">
            One entry per line. No limit on entries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-panel rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
        <h3 className="font-display font-semibold text-lg illuminated-text">
          Entries <span className="text-gray-500 font-normal text-sm">({entries.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPasteModal(true)}
            className="btn-ghost p-2"
            disabled={isSpinning}
            aria-label="Paste entries"
          >
            <Clipboard className="w-4 h-4" />
          </button>
          <button
            onClick={onShuffleEntries}
            className="btn-ghost p-2"
            disabled={isSpinning || entries.length < 2}
            aria-label="Shuffle entries"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          {entries.length > 0 && (
            <button
              onClick={onClearEntries}
              className="btn-ghost p-2 text-red-400 hover:text-red-300"
              disabled={isSpinning}
              aria-label="Clear all entries"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="p-4 border-b border-gray-800/50">
        <form onSubmit={handleAddEntry} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={entryInput}
            onChange={(e) => setEntryInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Add another entry…"
            className="input-field flex-1"
            disabled={isSpinning}
            aria-label="Add entry"
          />
          <button
            type="submit"
            className="btn-primary whitespace-nowrap"
            disabled={isSpinning || !entryInput.trim()}
            aria-label="Add entry"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Entries list */}
      <div
        ref={listRef}
        className="max-h-96 overflow-y-auto"
        role="list"
        aria-label="Roulette entries"
      >
        <AnimatePresence>
          <motion.ul
            key={entries.length}
            className="divide-y divide-gray-800/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {entries.map((entry, index) => (
              <EntryItem
                key={entry.id}
                entry={entry}
                index={index}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                isEditing={editingId === entry.id}
                editValue={editValue}
                setEditValue={setEditValue}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                onStartEdit={startEditing}
                onSaveEdit={saveEditing}
                onCancelEdit={cancelEditing}
                onEditKeyDown={handleEditKeyDown}
                onRemove={() => onRemoveEntry(entry.id)}
                moveUpDisabled={index === 0}
                moveDownDisabled={index === entries.length - 1}
                onMoveUp={() => onReorderEntry(index, index - 1)}
                onMoveDown={() => onReorderEntry(index, index + 1)}
                disabled={isSpinning}
              />
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>

      {/* Paste Modal */}
      <AnimatePresence>
        {showPasteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => { setShowPasteModal(false); setPasteText(''); }}
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
                <h4 className="font-display font-semibold illuminated-text">Paste Multiple Entries</h4>
                <button
                  onClick={() => { setShowPasteModal(false); setPasteText(''); }}
                  className="btn-ghost p-1"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                Paste a list with one entry per line. Empty lines will be ignored.
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Entry 1&#10;Entry 2&#10;Entry 3&#10;…"
                className="input-field min-h-[150px] resize-y font-mono text-sm mb-4"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowPasteModal(false); setPasteText(''); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteModalSubmit}
                  className="btn-primary"
                  disabled={!pasteText.trim()}
                >
                  <Check className="w-4 h-4 mr-1" />
                  Add {parseEntries(pasteText).length} {parseEntries(pasteText).length === 1 ? 'Entry' : 'Entries'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Individual entry item component
interface EntryItemProps {
  entry: RouletteEntry;
  index: number;
  isDragging: boolean;
  isDragOver: boolean;
  isEditing: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onStartEdit: (entry: RouletteEntry) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  moveUpDisabled: boolean;
  moveDownDisabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled: boolean;
}

const EntryItem = function EntryItem({
  entry,
  index,
  isDragging,
  isDragOver,
  isEditing,
  editValue,
  setEditValue,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditKeyDown,
  onRemove,
  moveUpDisabled,
  moveDownDisabled,
  onMoveUp,
  onMoveDown,
  disabled,
}: EntryItemProps) {
  return (
    <AnimatePresence mode="popLayout">
      <li
        key={entry.id}
        className={`group relative flex items-center gap-3 px-4 py-3 transition-colors ${
          isDragging ? 'opacity-40' : ''
        } ${isDragOver ? 'bg-gray-800/50' : 'hover:bg-gray-800/30'}`}
        draggable={!disabled}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="btn-ghost p-1.5 text-gray-400 hover:text-pure-white opacity-60 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.preventDefault(); onStartEdit(entry); }}
          disabled={disabled}
          aria-label="Drag to reorder"
          draggable={!disabled}
        >
          <GripVertical className="w-5 h-5" />
        </button>

        {/* Move up/down buttons */}
        <div className="flex flex-col gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onMoveUp(); }}
            disabled={moveUpDisabled || disabled}
            className="btn-ghost p-1 text-gray-500 hover:text-pure-white disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onMoveDown(); }}
            disabled={moveDownDisabled || disabled}
            className="btn-ghost p-1 text-gray-500 hover:text-pure-white disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Entry content - view or edit mode */}
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="flex-1 flex items-center gap-2"
            >
              <input
                ref={(el) => { if (el) (el as HTMLInputElement).focus(); }}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={onEditKeyDown}
                onBlur={onSaveEdit}
                className="input-field flex-1 text-base"
                autoFocus
              />
              <button
                type="button"
                onClick={onSaveEdit}
                className="btn-ghost p-1.5 text-green-400 hover:text-green-300"
                aria-label="Save"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                className="btn-ghost p-1.5 text-gray-400 hover:text-gray-300"
                aria-label="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center gap-3 min-w-0"
              onDoubleClick={() => onStartEdit(entry)}
            >
              <span className="text-sm text-gray-400 font-mono tabular-nums w-6 text-right">
                {index + 1}.
              </span>
              <span className="flex-1 truncate text-base break-words illuminated-text-subtle">
                {entry.label}
              </span>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onStartEdit(entry); }}
                className="btn-ghost p-1.5 opacity-60 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-pure-white"
                disabled={disabled}
                aria-label="Edit entry"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Remove button */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onRemove(); }}
          className="btn-ghost p-1.5 opacity-60 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
          disabled={disabled}
          aria-label="Remove entry"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Drag over indicator */}
        {isDragOver && !isDragging && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '2px', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute bottom-0 left-4 right-4"
            style={{ background: 'linear-gradient(90deg, transparent, #64ff64, transparent)' }}
          />
        )}
      </li>
    </AnimatePresence>
  );
};