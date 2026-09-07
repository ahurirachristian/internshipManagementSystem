import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  footer,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden z-10 my-8 transition-all zoom-in-95`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[calc(85vh-130px)] overflow-y-auto custom-scrollbar">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-900/60 flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
