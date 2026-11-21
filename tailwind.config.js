/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'gentle-bounce': 'gentle-bounce 2s infinite ease-in-out',
        'item-drop': 'item-drop 2s infinite ease-in-out',
        'loading-bar': 'loading-bar 1.5s infinite linear',
      },
      keyframes: {
        'gentle-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'item-drop': {
          '0%': { transform: 'translateY(-24px) scale(0.5)', opacity: '0' },
          '25%': { opacity: '1' },
          '75%': { transform: 'translateY(4px) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(8px) scale(0)', opacity: '0' },
        },
        'loading-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [
     require("tailwindcss-animate")
  ],
};
