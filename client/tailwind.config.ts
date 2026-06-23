/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      colors: {
        /* Berry / Flexy design system */
        'berry':        '#7352C7',
        'berry-dark':   '#5E35B1',
        'berry-blue':   '#1A97F5',
        'berry-blue2':  '#0D7DD9',
        'berry-accent': '#39B0F5',
        'berry-green':  '#00C897',
        'berry-red':    '#FF4B4B',
        'berry-amber':  '#FFC107',
        'page-bg':      '#F4F6F8',
        'card-bg':      '#FFFFFF',
        'sidebar-bg':   '#FFFFFF',
        'sidebar-act':  '#F0EBFF',
        'txt-primary':  '#2A3547',
        'txt-secondary':'#7C8FAC',
        'border-col':   '#E8EDF2',
      },
      boxShadow: {
        'card':    '0 2px 12px rgba(0,0,0,0.08)',
        'sidebar': '2px 0 8px rgba(0,0,0,0.06)',
        'topbar':  '0 1px 6px rgba(0,0,0,0.06)',
        'btn':     '0 4px 12px rgba(115,82,199,0.35)',
      },
      borderRadius: {
        'card': '12px',
        'stat': '16px',
        'badge': '20px',
      },
      animation: {
        'fade-up':    'fadeUp 0.25s ease-out forwards',
        'pulse-dot':  'pulseDot 2s ease-in-out infinite',
        'count':      'none',
      },
      keyframes: {
        fadeUp:   { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.4)', opacity: '0.6' } },
      },
    },
  },
  plugins: [],
}
