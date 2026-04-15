import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0f',
          surface: '#111118',
          card: '#1a1a28',
          border: '#2a2a3a',
        },
        primary: {
          DEFAULT: '#7c3aed',
          glow: '#6d28d9',
          light: '#a78bfa',
        },
        accent: '#06b6d4',
        genre: {
          pop: '#ec4899',
          rock: '#ef4444',
          hiphop: '#f59e0b',
          electronic: '#8b5cf6',
          rnb: '#6366f1',
          indie: '#84cc16',
          french: '#3b82f6',
          latin: '#f97316',
          kpop: '#d946ef',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
        'waveform': 'waveform 1.2s ease-in-out infinite',
        'float-up': 'float-up 2s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'waveform': {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-120px) scale(1.5)', opacity: '0' },
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 58, 237, 0.4)',
        'glow-sm': '0 0 10px rgba(124, 58, 237, 0.3)',
        'glow-accent': '0 0 20px rgba(6, 182, 212, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config
