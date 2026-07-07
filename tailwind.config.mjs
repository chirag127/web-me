/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#030303',
        surface:  '#0a0a0a',
        raised:   '#111111',
        overlay:  '#1a1a1a',
        primary:  '#2dd4bf',
        accent:   '#a78bfa',
        muted:    '#a3a3a3',
        faint:    '#525252',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
