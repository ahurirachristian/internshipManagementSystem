module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color, #0a4d4c)',
        accent: 'var(--accent-color, #10b981)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        '2xs': '0 0 0 1px rgb(0 0 0 / 0.03)',
      },
      backdropBlur: {
        xs: '4px',
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in-from-top-2': { '0%': { transform: 'translateY(-0.5rem)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'slide-in-from-right': { '0%': { transform: 'translateX(1rem)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        'zoom-in': { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'slide-in-from-top-2': 'slide-in-from-top-2 0.15s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.2s ease-out',
        'zoom-in-75': 'zoom-in 0.15s ease-out',
        'zoom-in-95': 'zoom-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
};
