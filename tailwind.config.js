/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm yellow/amber palette
        primary: {
          50: '#fefce8',   // Lightest yellow
          100: '#fef3c7',  // Very light yellow
          200: '#fde68a',  // Light yellow
          300: '#fcd34d',  // Medium yellow
          400: '#fbbf24',  // Warm yellow
          500: '#f59e0b',  // Primary yellow
          600: '#d97706',  // Dark yellow
          700: '#b45309',  // Darker yellow
          800: '#92400e',  // Very dark yellow
          900: '#78350f',  // Darkest yellow
        },
        // Light purple/lavender palette
        secondary: {
          50: '#faf5ff',   // Lightest purple
          100: '#f3e8ff',  // Very light purple
          200: '#e9d5ff',  // Light purple
          300: '#d8b4fe',  // Medium purple
          400: '#c084fc',  // Light lavender
          500: '#a855f7',  // Primary purple
          600: '#9333ea',  // Medium purple
          700: '#7c3aed',  // Dark purple
          800: '#6b21a8',  // Darker purple
          900: '#581c87',  // Darkest purple
        },
        // Neutral grays for text and backgrounds
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Status colors
        success: '#10b981',  // Green for completed
        warning: '#f59e0b',  // Amber for pending
        error: '#ef4444',    // Red for absent/errors
        info: '#3b82f6',     // Blue for information
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
      },
      keyframes: {
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
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      screens: {
        '720px': '720px',
        '480px': '480px',
      },
    },
  },
  plugins: [],
}
