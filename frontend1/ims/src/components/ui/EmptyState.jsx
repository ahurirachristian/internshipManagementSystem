import { SearchX } from 'lucide-react';

export function EmptyState({
  icon: Icon = SearchX,
  title = 'No records found',
  description = 'Try adjusting your search criteria or filter tags.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`py-12 px-4 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-700 text-white hover:bg-teal-800 transition-colors shadow-xs"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
