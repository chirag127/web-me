/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#030303',
        surface:  '#0a0a0c',
        elevated: '#0f0f12',
        overlay:  '#141418',
        primary:  '#6366f1',
        'primary-light': '#818cf8',
        cyan:     '#06b6d4',
        't-primary':   '#ffffff',
        't-secondary': '#a1a1aa',
        't-tertiary':  '#71717a',
        't-muted':     '#52525b',
        border:        'rgba(255,255,255,0.06)',
        'border-hover':'rgba(255,255,255,0.12)',
        'border-active':'rgba(99,102,241,0.4)',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
}
