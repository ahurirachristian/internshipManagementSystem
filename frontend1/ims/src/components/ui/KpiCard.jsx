import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FolderKanban,
  Users,
  CheckCircle2,
  HardDrive,
  FileText,
  Video,
  Layers,
  Receipt,
  CreditCard,
} from 'lucide-react';

const ICON_MAP = {
  DollarSign,
  FolderKanban,
  Users,
  CheckCircle2,
  HardDrive,
  FileText,
  Video,
  Layers,
  Receipt,
  CreditCard,
};

export function KpiCard({
  title,
  value,
  change,
  isPositive = true,
  period,
  icon = 'DollarSign',
  badgeColor = 'teal',
  progress,
  subtitle,
  className = '',
}) {
  const IconComponent = typeof icon === 'string' ? ICON_MAP[icon] || DollarSign : icon;

  const colorVariants = {
    teal: {
      iconBg: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400',
      badgeBg: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
      progress: 'bg-teal-600',
    },
    emerald: {
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
      badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      progress: 'bg-emerald-500',
    },
    blue: {
      iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
      badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      progress: 'bg-blue-500',
    },
    purple: {
      iconBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
      badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
      progress: 'bg-purple-500',
    },
    indigo: {
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400',
      badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
      progress: 'bg-indigo-500',
    },
    rose: {
      iconBg: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400',
      badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
      progress: 'bg-rose-500',
    },
  };

  const scheme = colorVariants[badgeColor] || colorVariants.teal;

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-slate-800 p-5 shadow-xs transition-all hover:shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mt-1">
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-2xl ${scheme.iconBg} flex items-center justify-center shrink-0`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>

      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Capacity</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${scheme.progress} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {(change || period) && (
        <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-gray-100 dark:border-slate-800 text-xs">
          {change && (
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
              }`}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {change}
            </span>
          )}
          {period && (
            <span className="text-slate-500 dark:text-slate-400 truncate">
              {period}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
