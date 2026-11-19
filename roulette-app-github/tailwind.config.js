/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Monochromatic palette
        'deep-black': '#030303',
        'charcoal': '#0a0a0a',
        'graphite': '#141414',
        'graphite-light': '#1e1e1e',
        'gray-900': '#262626',
        'gray-800': '#333333',
        'gray-700': '#404040',
        'gray-600': '#525252',
        'gray-500': '#737373',
        'gray-400': '#a3a3a3',
        'gray-300': '#d4d4d4',
        'gray-200': '#e5e5e5',
        'gray-100': '#f5f5f5',
        'pure-white': '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,255,255,0.1), 0 0 40px rgba(255,255,255,0.05)' },
          '50%': { boxShadow: '0 0 40px rgba(255,255,255,0.2), 0 0 80px rgba(255,255,255,0.1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(255,255,255,0.1)',
        'glow-md': '0 0 20px rgba(255,255,255,0.15), 0 0 40px rgba(255,255,255,0.05)',
        'glow-lg': '0 0 40px rgba(255,255,255,0.2), 0 0 80px rgba(255,255,255,0.1)',
        'inner-glow': 'inset 0 0 20px rgba(255,255,255,0.05)',
        'deep': '0 25px 50px -12px rgba(0,0,0,0.8)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #141414 50%, #0a0a0a 100%)',
      },
    },
  },
  plugins: [],
}