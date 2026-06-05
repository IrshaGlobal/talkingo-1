import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d0f14',
        'surface-1': '#12141c',
        'surface-2': '#181a24',
        'surface-3': '#1f2130',
        'surface-4': '#262940',
        'text-primary': '#f0ecff',
        'text-secondary': '#a8a0c0',
        'text-tertiary': '#6b6384',
        'border-subtle': 'rgba(107, 99, 132, 0.12)',
        'border-medium': 'rgba(107, 99, 132, 0.22)',
        'border-strong': 'rgba(107, 99, 132, 0.35)',
        primary: '#6c5ce7',
        'primary-dim': '#5a4bd1',
        accent: '#00d4aa',
        info: '#38bdf8',
        error: '#ff4d6a',
        warning: '#ffb347',
        success: '#00d4aa',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'glow-sm': '0 0 8px rgba(108, 92, 231, 0.25)',
        'glow-primary': '0 0 20px rgba(108, 92, 231, 0.4)',
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
