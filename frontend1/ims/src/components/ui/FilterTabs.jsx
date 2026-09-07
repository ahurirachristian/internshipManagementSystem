export function FilterTabs({ tabs = [], activeTab, onChange, primaryColor = '#0a4d4c' }) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1 bg-gray-50/80 dark:bg-slate-800/60 rounded-xl border border-gray-200/60 dark:border-slate-800">
      {tabs.map((tab) => {
        const id = typeof tab === 'string' ? tab : tab.id;
        const label = typeof tab === 'string' ? tab : tab.label;
        const count = typeof tab === 'object' ? tab.count : undefined;
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            style={
              isActive
                ? { backgroundColor: primaryColor, color: '#ffffff' }
                : {}
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'shadow-xs text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-gray-200/60 dark:hover:bg-slate-700/50'
            }`}
          >
            <span>{label}</span>
            {count !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
