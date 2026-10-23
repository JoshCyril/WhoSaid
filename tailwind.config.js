/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./static/**/*.{html,js}",
    "./static/components/**/*.{html,js}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          DEFAULT: '#38bdf8',
        },
        dark: {
          base: '#181b20',
          surface: '#20252b',
          raised: '#282f37',
          card: '#1e2329',
          border: 'rgba(255, 255, 255, 0.09)',
          muted: '#94a3b8',
          subtle: '#64748b',
          text: '#eaeaea',
          heading: '#f8fafc',
        },
        speaker: {
          coral: '#fb7185',
          teal: '#2dd4bf',
          amber: '#fbbf24',
          violet: '#c084fc',
          mint: '#4ade80',
          pink: '#f472b6',
          sky: '#38bdf8',
          orange: '#f97316',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'SF Mono', 'Consolas', 'monospace']
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      }
    },
  },
  plugins: [],
}
