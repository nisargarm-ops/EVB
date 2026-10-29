/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eco: {
          bg: '#F8FAF7',
          surface: '#FFFFFF',
          forest: '#14532D',
          'forest-hover': '#166534',
          'forest-dark': '#0F3E22',
          emerald: '#059669',
          'emerald-light': '#10B981',
          soft: '#ECFDF3',
          'soft-border': '#D1FAE5',
          charcoal: '#1F2937',
          muted: '#64748B',
          border: '#E5E7EB',
          'border-subtle': '#F1F5F9',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'eco-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'eco-card': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'eco-hover': '0 10px 25px -3px rgba(20, 83, 45, 0.08), 0 4px 6px -4px rgba(20, 83, 45, 0.04)',
        'eco-modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
