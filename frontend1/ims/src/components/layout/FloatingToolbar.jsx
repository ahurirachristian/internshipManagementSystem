import React, { useState } from 'react';
import { Settings, X, Sun, Moon, Check, RotateCcw, Palette } from 'lucide-react';
import { THEME_PRESETS } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export function FloatingToolbar() {
  const { primaryColor, setPrimaryColor, isDark, toggleDark, resetTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{ backgroundColor: primaryColor }}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 p-3 rounded-l-2xl text-white shadow-2xl hover:translate-x-[-4px] transition-transform flex items-center justify-center group"
        title="Theme Customizer"
      >
        <Settings className="w-5 h-5 animate-[spin_6s_linear_infinite]" />
      </button>

      {/* Slide-over Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 z-50 transition-opacity"
        />
      )}

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 shadow-2xl z-50 transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: primaryColor }}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-xs"
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Theme Customizer
              </h3>
              <p className="text-[10px] text-slate-400">Realtime CSS Variable Engine</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Controls */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6 text-xs">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
              Interface Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => isDark && toggleDark()}
                className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  !isDark
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => !isDark && toggleDark()}
                className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  isDark
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Color Palettes Swatches */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Primary Brand Color
              </label>
              <span className="text-[10px] font-mono text-slate-400">{primaryColor}</span>
            </div>

            <div className="space-y-2">
              {THEME_PRESETS.map((preset) => {
                const isSelected =
                  primaryColor.toLowerCase() === preset.primary.toLowerCase();

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPrimaryColor(preset.primary)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-slate-800 dark:border-slate-200 bg-gray-50 dark:bg-slate-800 ring-2 ring-slate-400/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: preset.primary }}
                        className="w-6 h-6 rounded-lg shadow-2xs border border-white/20 shrink-0 flex items-center justify-center text-white"
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="text-left">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 block text-xs">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {preset.primary}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{ backgroundColor: preset.accent }}
                      className="w-3 h-3 rounded-full border border-white/40"
                      title={`Accent: ${preset.accent}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Reset */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={resetTheme}
            className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Classic IMS Teal</span>
          </button>
        </div>
      </div>
    </>
  );
}
