// Settings Panel Component - Comprehensive customization

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sliders, Volume2, VolumeX, Music, Zap, Palette, Settings as SettingsIcon,
  ChevronRight, ChevronDown, Copy, Download, Upload, Trash2, Info
} from 'lucide-react';
import type { RouletteSettings, AppSettings, SoundProfile, DisplaySize, AnimationDuration, RouletteEntry, ControlledModeConfig } from '../types';
import {
  DEFAULT_ROULETTE_SETTINGS,
  SOUND_PROFILES,
  DISPLAY_SIZES,
  ANIMATION_DURATION_PRESETS,
} from '../types';
import { AudioEngine } from '../lib/audio';
import { exportAllData, importData, getStorageEstimate } from '../lib/storage';
import { clamp } from '../lib/utils';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  rouletteSettings: RouletteSettings;
  onUpdateRouletteSettings: (settings: Partial<RouletteSettings>) => void;
  appSettings: AppSettings;
  onUpdateAppSettings: (settings: Partial<AppSettings>) => void;
  currentRouletteId: string | null;
  entries: RouletteEntry[];
  controlledMode: ControlledModeConfig;
  onToggleControlledMode: () => void;
  onSetControlledTarget: (entryId: string | null) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onClearAllData: () => void;
  className?: string;
}

const SETTING_CATEGORIES = [
  { id: 'behavior', label: 'Behavior', icon: Zap },
  { id: 'visual', label: 'Visual', icon: Palette },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'data', label: 'Data', icon: SettingsIcon },
] as const;

type CategoryId = typeof SETTING_CATEGORIES[number]['id'];

export const SettingsPanel = function SettingsPanel({
  isOpen,
  onClose,
  rouletteSettings,
  onUpdateRouletteSettings,
  appSettings,
  onUpdateAppSettings,
  currentRouletteId,
  entries,
  controlledMode,
  onToggleControlledMode,
  onSetControlledTarget,
  onExport,
  onImport,
  onClearAllData,
  className = '',
}: SettingsPanelProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryId>('behavior');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number } | null>(null);

  // Load storage info
  const loadStorageInfo = useCallback(async () => {
    const info = await getStorageEstimate();
    setStorageInfo(info);
  }, []);

  // Slider component
  const Slider = ({ label, value, min, max, step, onChange, format, disabled, children }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    format?: (v: number) => string;
    disabled?: boolean;
    children?: React.ReactNode;
  }) => (
    <div className="setting-row">
      <label className="flex items-center gap-3 min-w-[180px]">
        <span className="text-sm font-medium text-gray-300 w-32">{label}</span>
        <span className="text-xs text-gray-500 font-mono tabular-nums w-12 text-right">
          {format ? format(value) : value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </label>
      <div className="flex-1 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="slider-track flex-1"
          style={{
            background: `linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) ${(value - min) / (max - min) * 100}%, rgba(255,255,255,0.02) ${(value - min) / (max - min) * 100}%, rgba(255,255,255,0.02) 100%)`,
          }}
        />
        {children}
      </div>
    </div>
  );

  // Select component
  const Select = ({ label, value, options, onChange, disabled }: {
    label: string;
    value: string;
    options: { value: string; label: string; description?: string }[];
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div className="setting-row">
      <label className="flex items-center gap-3 min-w-[180px]">
        <span className="text-sm font-medium text-gray-300 w-32">{label}</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="select-field flex-1 max-w-xs"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  // Toggle component
  const Toggle = ({ label, value, onChange, description, disabled }: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    description?: string;
    disabled?: boolean;
  }) => (
    <div className="setting-row">
      <div className="flex-1 min-w-[180px]">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 flex items-center ${
          value ? 'bg-gray-300' : 'bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-glow-sm'}`}
        aria-pressed={value}
        aria-label={label}
      >
        <span
          className={`absolute w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );

  // Category content
  const renderCategory = (category: CategoryId) => {
    switch (category) {
      case 'behavior':
        return (
          <div className="settings-section space-y-4">
            <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider">
              Animation Behavior
            </h4>

            <Select
              label="Duration"
              value={rouletteSettings.animationDuration}
              options={[
                { value: 'quick', label: 'Quick (2s)' },
                { value: 'normal', label: 'Normal (4s)' },
                { value: 'long', label: 'Long (7s)' },
                { value: 'custom', label: 'Custom' },
              ]}
              onChange={(v) => onUpdateRouletteSettings({ animationDuration: v as AnimationDuration })}
            />

            {rouletteSettings.animationDuration === 'custom' && (
              <div className="setting-row">
                <div className="flex-1 min-w-[180px]">
                  <span className="text-sm font-medium text-gray-300">Custom Duration</span>
                  <p className="text-xs text-gray-500 mt-0.5">Type the exact spin time in seconds.</p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.5"
                    max="60"
                    step="0.1"
                    value={(rouletteSettings.customDuration / 1000).toFixed(1)}
                    onChange={(e) => {
                      const seconds = clamp(Number(e.target.value) || 0.5, 0.5, 60);
                      onUpdateRouletteSettings({ customDuration: Math.round(seconds * 1000) });
                    }}
                    className="input-field w-24 text-center font-mono"
                    aria-label="Custom duration in seconds"
                  />
                  <span className="text-sm text-gray-500">seconds</span>
                </label>
              </div>
            )}

            <Slider
              label="Animation Intensity"
              value={rouletteSettings.animationIntensity}
              min={0.1}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onUpdateRouletteSettings({ animationIntensity: v })}
            />

            <Slider
              label="Cycles Before Stop"
              value={rouletteSettings.cyclesBeforeStop}
              min={1}
              max={10}
              step={1}
              format={(v) => `${v}`}
              onChange={(v) => onUpdateRouletteSettings({ cyclesBeforeStop: Math.round(v) })}
            />

            <Slider
              label="Spin Speed"
              value={rouletteSettings.spinSpeed}
              min={0.1}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onUpdateRouletteSettings({ spinSpeed: v })}
            />

            <Slider
              label="Deceleration"
              value={rouletteSettings.decelerationIntensity}
              min={0.1}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onUpdateRouletteSettings({ decelerationIntensity: v })}
            />

            <Slider
              label="Result Highlight"
              value={rouletteSettings.resultHighlightDuration / 1000}
              min={1}
              max={10}
              step={0.5}
              format={(v) => `${v.toFixed(1)}s`}
              onChange={(v) => onUpdateRouletteSettings({ resultHighlightDuration: v * 1000 })}
            />

            <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider mt-6">
              Selection Rules
            </h4>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-200">Pick the winner</p>
                  <p className="text-xs text-gray-500 mt-0.5">Predetermine the result while keeping the normal reel animation.</p>
                </div>
                <button
                  type="button"
                  onClick={onToggleControlledMode}
                  className={`relative w-11 h-6 rounded-full transition-colors ${controlledMode.enabled ? 'bg-amber-400/70' : 'bg-gray-700'}`}
                  aria-pressed={controlledMode.enabled}
                  aria-label="Enable picked winner"
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${controlledMode.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {controlledMode.enabled && (
                <select
                  value={controlledMode.targetEntryId ?? ''}
                  onChange={(e) => onSetControlledTarget(e.target.value || null)}
                  className="select-field w-full"
                  disabled={entries.length === 0}
                  aria-label="Winner entry"
                >
                  <option value="">Choose the winner…</option>
                  {entries.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                </select>
              )}
            </div>

            <Toggle
              label="Auto Restart"
              value={rouletteSettings.autoRestart}
              onChange={(v) => onUpdateRouletteSettings({ autoRestart: v })}
              description="Automatically spin again after result"
            />

            <Toggle
              label="Remove After Select"
              value={rouletteSettings.removeAfterSelect}
              onChange={(v) => onUpdateRouletteSettings({ removeAfterSelect: v })}
              description="Remove winning entry from the roulette"
            />

            <Toggle
              label="Prevent Consecutive Duplicates"
              value={rouletteSettings.preventConsecutiveDuplicates}
              onChange={(v) => onUpdateRouletteSettings({ preventConsecutiveDuplicates: v })}
              description="Never pick the same entry twice in a row"
            />

            <Toggle
              label="Allow Repeated Results"
              value={rouletteSettings.allowRepeatedResults}
              onChange={(v) => onUpdateRouletteSettings({ allowRepeatedResults: v })}
              description="Allow the same entry to be selected multiple times"
            />
          </div>
        );

      case 'visual':
        return (
          <div className="settings-section space-y-4">
            <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider">
              Display
            </h4>

            <Select
              label="Display Size"
              value={rouletteSettings.displaySize}
              options={Object.entries(DISPLAY_SIZES).map(([key, val]) => ({
                value: key,
                label: `${val.name} (${Math.round(val.scale * 100)}%)`,
              }))}
              onChange={(v) => onUpdateRouletteSettings({ displaySize: v as DisplaySize })}
            />

            <Slider
              label="Reel Width"
              value={rouletteSettings.reelDimensions.width}
              min={280}
              max={600}
              step={10}
              format={(v) => `${v}px`}
              onChange={(v) => onUpdateRouletteSettings({ reelDimensions: { ...rouletteSettings.reelDimensions, width: Math.round(v) } })}
            />

            <Slider
              label="Reel Height"
              value={rouletteSettings.reelDimensions.height}
              min={200}
              max={500}
              step={10}
              format={(v) => `${v}px`}
              onChange={(v) => onUpdateRouletteSettings({ reelDimensions: { ...rouletteSettings.reelDimensions, height: Math.round(v) } })}
            />

            <Slider
              label="Visible Items"
              value={rouletteSettings.reelDimensions.visibleItems}
              min={3}
              max={9}
              step={1}
              format={(v) => `${v}`}
              onChange={(v) => onUpdateRouletteSettings({ reelDimensions: { ...rouletteSettings.reelDimensions, visibleItems: Math.round(v) } })}
            />

            <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider mt-6">
              Typography
            </h4>

            <Slider
              label="Font Size"
              value={rouletteSettings.entryTypography.fontSize}
              min={12}
              max={28}
              step={1}
              format={(v) => `${v}px`}
              onChange={(v) => onUpdateRouletteSettings({ entryTypography: { ...rouletteSettings.entryTypography, fontSize: Math.round(v) } })}
            />

            <Slider
              label="Font Weight"
              value={rouletteSettings.entryTypography.fontWeight}
              min={300}
              max={700}
              step={100}
              format={(v) => `${v}`}
              onChange={(v) => onUpdateRouletteSettings({ entryTypography: { ...rouletteSettings.entryTypography, fontWeight: Math.round(v) } })}
            />

            <Slider
              label="Line Height"
              value={rouletteSettings.entryTypography.lineHeight}
              min={1}
              max={2}
              step={0.1}
              format={(v) => `${v.toFixed(1)}`}
              onChange={(v) => onUpdateRouletteSettings({ entryTypography: { ...rouletteSettings.entryTypography, lineHeight: Math.round(v * 10) / 10 } })}
            />

            <Slider
              label="Letter Spacing"
              value={rouletteSettings.entryTypography.letterSpacing}
              min={-1}
              max={3}
              step={0.5}
              format={(v) => `${v.toFixed(1)}px`}
              onChange={(v) => onUpdateRouletteSettings({ entryTypography: { ...rouletteSettings.entryTypography, letterSpacing: Math.round(v * 2) / 2 } })}
            />

            <Slider
              label="Entry Spacing"
              value={rouletteSettings.entrySpacing}
              min={0}
              max={20}
              step={1}
              format={(v) => `${v}px`}
              onChange={(v) => onUpdateRouletteSettings({ entrySpacing: Math.round(v) })}
            />

            <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider mt-6">
              Effects
            </h4>

            <Slider
              label="Border Intensity"
              value={rouletteSettings.borderIntensity}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onUpdateRouletteSettings({ borderIntensity: v })}
            />

            <Slider
              label="Glow Intensity"
              value={rouletteSettings.glowIntensity}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onUpdateRouletteSettings({ glowIntensity: v })}
            />

            <Slider
              label="Background Intensity"
              value={rouletteSettings.backgroundIntensity}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onUpdateRouletteSettings({ backgroundIntensity: v })}
            />

            <Toggle
              label="Animation Effects"
              value={rouletteSettings.animationEffects}
              onChange={(v) => onUpdateRouletteSettings({ animationEffects: v })}
              description="Enable subtle visual effects during spin"
            />
          </div>
        );

      case 'audio':
        return (
          <div className="settings-section space-y-4">
            <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider">
              Volume
            </h4>

            <Toggle
              label="Mute All"
              value={rouletteSettings.mute}
              onChange={(v) => {
                onUpdateRouletteSettings({ mute: v });
                AudioEngine.setMute(v);
              }}
            />

            <Slider
              label="Master Volume"
              value={rouletteSettings.masterVolume}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => {
                onUpdateRouletteSettings({ masterVolume: v });
                AudioEngine.setMasterVolume(v);
              }}
              disabled={rouletteSettings.mute}
            >
              <button
                type="button"
                onClick={() => AudioEngine.previewSound('result', rouletteSettings.soundProfile)}
                className="btn-ghost p-1.5 text-gray-400 hover:text-pure-white"
                aria-label="Preview master volume"
                disabled={rouletteSettings.mute}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </Slider>

            <Slider
              label="Spin Volume"
              value={rouletteSettings.spinVolume}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onUpdateRouletteSettings({ spinVolume: v })}
              disabled={rouletteSettings.mute}
            >
              <button
                type="button"
                onClick={() => AudioEngine.previewSound('tick', rouletteSettings.soundProfile)}
                className="btn-ghost p-1.5 text-gray-400 hover:text-pure-white"
                aria-label="Preview spin sound"
                disabled={rouletteSettings.mute}
              >
                <Zap className="w-4 h-4" />
              </button>
            </Slider>

            <Slider
              label="Result Volume"
              value={rouletteSettings.resultVolume}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onUpdateRouletteSettings({ resultVolume: v })}
              disabled={rouletteSettings.mute}
            >
              <button
                type="button"
                onClick={() => AudioEngine.previewSound('result', rouletteSettings.soundProfile)}
                className="btn-ghost p-1.5 text-gray-400 hover:text-pure-white"
                aria-label="Preview result sound"
                disabled={rouletteSettings.mute}
              >
                <Music className="w-4 h-4" />
              </button>
            </Slider>

            <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider mt-6">
              Sound Profile
            </h4>

            <Select
              label="Profile"
              value={rouletteSettings.soundProfile}
              options={Object.entries(SOUND_PROFILES).map(([key, val]) => ({
                value: key,
                label: val.name,
                description: val.description,
              }))}
              onChange={(v) => {
                onUpdateRouletteSettings({ soundProfile: v as SoundProfile });
                AudioEngine.setProfile(v as SoundProfile);
              }}
            />

            <div className="flex flex-wrap gap-2">
              {Object.entries(SOUND_PROFILES).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => AudioEngine.previewSound('startup', key as SoundProfile)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    rouletteSettings.soundProfile === key
                      ? 'bg-gray-700 text-pure-white border border-gray-500/30'
                      : 'bg-gray-800/50 text-gray-400 hover:text-pure-white hover:bg-gray-800 border border-gray-700/50'
                  }`}
                  disabled={rouletteSettings.mute}
                >
                  {val.name}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-800/50">
              <button
                type="button"
                onClick={() => AudioEngine.previewSound('ambient', rouletteSettings.soundProfile)}
                className="btn-ghost w-full justify-start gap-2"
                disabled={rouletteSettings.mute}
              >
                <Music className="w-4 h-4" />
                <span>Preview Ambient Sound</span>
              </button>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="settings-section space-y-4">
            <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider">
              Data Management
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onExport}
                className="btn-secondary w-full justify-center gap-2 py-3"
              >
                <Download className="w-4 h-4" />
                <span>Export All Data</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImportDialog(true)}
                className="btn-secondary w-full justify-center gap-2 py-3"
              >
                <Upload className="w-4 h-4" />
                <span>Import Data</span>
              </button>
            </div>

            {storageInfo && (
              <div className="glass-panel rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Storage Used</span>
                  <span className="font-mono tabular-nums text-pure-white">
                    {(storageInfo.usage / 1024).toFixed(1)} KB / {(storageInfo.quota / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-500 transition-all duration-300"
                    style={{ width: `${(storageInfo.usage / storageInfo.quota) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-800/50">
              <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider mb-3">
                Danger Zone
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (confirm('This will delete ALL roulettes, history, and settings. This cannot be undone. Are you sure?')) {
                    onClearAllData();
                  }
                }}
                className="btn-secondary w-full justify-center gap-2 py-3 text-red-400 border-red-900/30 hover:bg-red-900/10 hover:border-red-800/50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All Data</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-800/50">
              <h4 className="font-display font-medium text-sm text-gray-400 uppercase tracking-wider mb-3">
                App Settings
              </h4>

              <Toggle
                label="Keyboard Shortcuts"
                value={appSettings.keyboardShortcuts}
                onChange={(v) => onUpdateAppSettings({ keyboardShortcuts: v })}
                description="Enable global keyboard shortcuts (Space to spin, etc.)"
              />

              <Toggle
                label="Reduced Motion"
                value={appSettings.reducedMotion}
                onChange={(v) => onUpdateAppSettings({ reducedMotion: v })}
                description="Disable animations for accessibility"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
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
        aria-labelledby="settings-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`glass-panel-strong rounded-2xl overflow-hidden w-full max-w-3xl max-h-[90vh] flex flex-col ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
            <h2 id="settings-title" className="font-display font-semibold text-lg illuminated-text">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="btn-ghost p-2"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex border-b border-gray-800/50 overflow-x-auto" role="tablist">
            {SETTING_CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeCategory === id}
                onClick={() => setActiveCategory(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeCategory === id
                    ? 'text-pure-white border-b-2 border-gray-300'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Category content */}
          <div className="flex-1 overflow-y-auto p-4 pb-6">
            {renderCategory(activeCategory)}
          </div>

          {/* Import dialog */}
          <AnimatePresence>
            {showImportDialog && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={() => { setShowImportDialog(false); setImportFile(null); }}
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
                    <h4 className="font-display font-semibold illuminated-text">Import Data</h4>
                    <button
                      onClick={() => { setShowImportDialog(false); setImportFile(null); }}
                      className="btn-ghost p-1"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">
                    Select a JSON file exported from this application to restore your roulettes, history, and settings.
                  </p>
                  <div
                    className={`border-2 rounded-lg p-6 text-center transition-colors ${
                      importFile
                        ? 'bg-gray-800/50 border-gray-500/50'
                        : 'border-dashed border-gray-700/50 hover:border-gray-500/50'
                    }`}
                    onClick={() => document.getElementById('import-file-input')?.click()}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files[0]) {
                        setImportFile(e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    <input
                      id="import-file-input"
                      type="file"
                      accept=".json"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) setImportFile(file); }}
                      className="hidden"
                    />
                    {importFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="font-mono text-sm text-pure-white">{importFile.name}</span>
                        <span className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</span>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => { setImportFile(null); }}
                            className="btn-ghost text-sm"
                          >
                            Change
                          </button>
                          <button
                            onClick={() => { onImport(importFile!); setShowImportDialog(false); setImportFile(null); }}
                            className="btn-primary text-sm"
                          >
                            Import
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Upload className="w-8 h-8" />
                        <span>Click or drag to select file</span>
                        <span className="text-xs">.json files only</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};