export function StatusPill({ status, size = 'sm', onClick, clickable = false }) {
  const norm = String(status || '').toLowerCase().trim();

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let dotColor = 'bg-slate-400';

  if (['hired', 'active', 'paid', 'completed', 'public'].includes(norm)) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
    dotColor = 'bg-emerald-500';
  } else if (['pending', 'processing', 'in review', 'medium', 'team'].includes(norm)) {
    colorClasses = 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
    dotColor = 'bg-amber-500';
  } else if (['in process', 'in progress', 'high'].includes(norm)) {
    colorClasses = 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60';
    dotColor = 'bg-orange-500';
  } else if (['urgent', 'refunded', 'inactive', 'private'].includes(norm)) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
    dotColor = 'bg-rose-500';
  } else if (['backlog', 'low'].includes(norm)) {
    colorClasses = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    dotColor = 'bg-slate-400';
  }

  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      onClick={clickable ? onClick : undefined}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colorClasses} ${sizeClasses} ${
        clickable
          ? 'cursor-pointer hover:scale-105 active:scale-95 transition-all select-none'
          : ''
      }`}
      title={clickable ? 'Click to cycle status' : undefined}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0 animate-pulse`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}
