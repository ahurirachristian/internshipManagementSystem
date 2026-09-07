export function TableCard({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  children,
  className = '',
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors ${className}`}
    >
      {(title || actions) && (
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
                  {title}
                </h3>
                {badge && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      )}
      <div className="w-full overflow-x-auto custom-scrollbar">{children}</div>
    </div>
  );
}
