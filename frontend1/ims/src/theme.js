// Theme Presets and Dynamic CSS Variable injection

export const COLOR_PRESETS = [
  {
    id: 'teal',
    name: 'Teal (Default)',
    primary: '#0a4d4c',
    accent: '#10b981',
    sidebarBg: '#0a4d4c',
    sidebarActive: '#0e746b',
    sidebarHover: '#075951',
    sidebarBorder: '#085a52',
    sidebarTreeline: '#227970',
    sidebarTextMuted: '#9fcbc4',
    sidebarBadgeBg: '#09554e',
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    primary: '#065f46',
    accent: '#34d399',
    sidebarBg: '#065f46',
    sidebarActive: '#047857',
    sidebarHover: '#064e3b',
    sidebarBorder: '#064e3b',
    sidebarTreeline: '#059669',
    sidebarTextMuted: '#a7f3d0',
    sidebarBadgeBg: '#047857',
  },
  {
    id: 'indigo',
    name: 'Royal Indigo',
    primary: '#3730a3',
    accent: '#818cf8',
    sidebarBg: '#312e81',
    sidebarActive: '#4338ca',
    sidebarHover: '#3730a3',
    sidebarBorder: '#3730a3',
    sidebarTreeline: '#4f46e5',
    sidebarTextMuted: '#c7d2fe',
    sidebarBadgeBg: '#4338ca',
  },
  {
    id: 'navy',
    name: 'Deep Navy',
    primary: '#0f172a',
    accent: '#38bdf8',
    sidebarBg: '#0f172a',
    sidebarActive: '#1e293b',
    sidebarHover: '#1e293b',
    sidebarBorder: '#334155',
    sidebarTreeline: '#475569',
    sidebarTextMuted: '#94a3b8',
    sidebarBadgeBg: '#1e293b',
  },
  {
    id: 'burgundy',
    name: 'Velvet Burgundy',
    primary: '#831843',
    accent: '#f472b6',
    sidebarBg: '#701a35',
    sidebarActive: '#9d174d',
    sidebarHover: '#831843',
    sidebarBorder: '#831843',
    sidebarTreeline: '#be185d',
    sidebarTextMuted: '#fbcfe8',
    sidebarBadgeBg: '#9d174d',
  },
  {
    id: 'charcoal',
    name: 'Nordic Charcoal',
    primary: '#27272a',
    accent: '#fbbf24',
    sidebarBg: '#18181b',
    sidebarActive: '#27272a',
    sidebarHover: '#27272a',
    sidebarBorder: '#3f3f46',
    sidebarTreeline: '#52525b',
    sidebarTextMuted: '#a1a1aa',
    sidebarBadgeBg: '#27272a',
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    primary: '#9a3412',
    accent: '#fb923c',
    sidebarBg: '#7c2d12',
    sidebarActive: '#c2410c',
    sidebarHover: '#9a3412',
    sidebarBorder: '#9a3412',
    sidebarTreeline: '#ea580c',
    sidebarTextMuted: '#fed7aa',
    sidebarBadgeBg: '#c2410c',
  },
];

export const THEME_PRESETS = COLOR_PRESETS;
export const DEFAULT_THEME = COLOR_PRESETS[0];


export function getThemePalette(primaryColor = '#0a4d4c', isDark = false) {
  const match = COLOR_PRESETS.find(
    (p) => p.primary.toLowerCase() === primaryColor.toLowerCase() || p.id === primaryColor
  );

  if (match) {
    if (isDark) {
      return {
        ...match,
        sidebarBg: match.sidebarBg,
        contentBg: '#0b1120',
        cardBg: '#0f172a',
        cardBorder: '#1e293b',
      };
    }
    return {
      ...match,
      contentBg: '#f4f7f6',
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0',
    };
  }

  // Fallback calculations for custom hex colors
  return {
    id: 'custom',
    name: 'Custom',
    primary: primaryColor,
    accent: '#10b981',
    sidebarBg: primaryColor,
    sidebarActive: primaryColor,
    sidebarHover: primaryColor,
    sidebarBorder: primaryColor,
    sidebarTreeline: primaryColor,
    sidebarTextMuted: '#cbd5e1',
    sidebarBadgeBg: primaryColor,
    contentBg: isDark ? '#0b1120' : '#f4f7f6',
    cardBg: isDark ? '#0f172a' : '#ffffff',
    cardBorder: isDark ? '#1e293b' : '#e2e8f0',
  };
}

export function applyThemeVariables(primaryColor = '#0a4d4c', isDark = false) {
  if (typeof document === 'undefined') return;

  const palette = getThemePalette(primaryColor, isDark);
  const root = document.documentElement;

  root.style.setProperty('--primary-color', palette.primary);
  root.style.setProperty('--sidebar-bg', palette.sidebarBg);
  root.style.setProperty('--sidebar-active', palette.sidebarActive);
  root.style.setProperty('--sidebar-hover', palette.sidebarHover);
  root.style.setProperty('--sidebar-border', palette.sidebarBorder);
  root.style.setProperty('--sidebar-treeline', palette.sidebarTreeline);
  root.style.setProperty('--sidebar-text-muted', palette.sidebarTextMuted);
  root.style.setProperty('--sidebar-badge-bg', palette.sidebarBadgeBg);
  root.style.setProperty('--accent-color', palette.accent);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
