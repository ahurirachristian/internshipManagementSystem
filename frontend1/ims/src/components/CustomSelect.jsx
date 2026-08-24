import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

export default function CustomSelect({ id, value, onChange, options, required, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const selectedOption = options.find(
    (opt) => (typeof opt === 'string' ? opt : opt.value) === value
  );
  const displayLabel = selectedOption
    ? (typeof selectedOption === 'string' ? selectedOption : selectedOption.label)
    : value;

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-required={required || undefined}
        className="w-full bg-white text-slate-900 text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all cursor-pointer shadow-xs font-medium text-left flex items-center justify-between gap-2"
      >
        <span className={`truncate ${!displayLabel ? 'text-slate-400' : ''}`}>
          {displayLabel || placeholder || 'Select...'}
        </span>
        <div className="pointer-events-none text-slate-500 shrink-0">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-labelledby={id}
          className="absolute inset-x-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150"
        >
          {options.map((opt) => {
            const optValue = typeof opt === 'string' ? opt : opt.value;
            const optLabel = typeof opt === 'string' ? opt : opt.label;
            const isSelected = value === optValue;
            return (
              <li
                key={optValue}
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(optValue); setIsOpen(false); }}
                className={`px-3.5 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-teal-50 text-teal-900 font-semibold'
                    : 'text-slate-700 hover:bg-teal-50 hover:text-teal-900'
                }`}
              >
                <span className="truncate">{optLabel}</span>
                {isSelected && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
