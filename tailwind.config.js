/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        primary: ['PrimaryFont', 'sans-serif'],
        secondary: ['BRHendrix', 'serif'],
      },
      colors: {
        primary: {
          50: '#f0f9f0',
          100: '#dcf2dc',
          200: '#bce5bc',
          300: '#8fd28f',
          400: '#5bb55b',
          500: '#388E3C',
          600: '#2E7D32',
          700: '#256b25',
          800: '#1B5E20',
          900: '#0d4e0d',
        },
        accent: {
          50: '#f9f9f9',
          100: '#f0f0f0',
          200: '#e0e0e0',
          300: '#c0c0c0',
          400: '#a0a0a0',
          500: '#666666',
          600: '#555555',
          700: '#444444',
          800: '#2c3e50',
          900: '#1a1a1a',
        }
      },
      borderRadius: {
        'xl': '15px',
        '2xl': '20px',
      },
      boxShadow: {
        'soft': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'medium': '0 8px 15px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
      })
    }
  ],
}
