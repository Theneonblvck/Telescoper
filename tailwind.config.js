/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './store/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"JetBrains Mono"', 'monospace'],
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['"Major Mono Display"', 'monospace'],
      },
      colors: {
        telegram: {
          DEFAULT: '#229ED9',
          dark: '#1b7fb0',
          light: '#5ebbde',
        },
        tech: {
          bg: '#050505',
          panel: '#0A0A0A',
          border: '#27272a',
          accent: '#FACC15',
          text: '#E4E4E7',
        },
      },
      boxShadow: {
        severe: '4px 4px 0px 0px rgba(34, 158, 217, 0.2)',
        'severe-hover': '4px 4px 0px 0px rgba(250, 204, 21, 0.5)',
      },
    },
  },
  plugins: [],
};
