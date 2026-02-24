/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.php",
    "./pages/**/*.{php,html,js}",
    "./includes/**/*.{php,html,js}",
    "./front/**/*.{php,html,js}"
  ],
  safelist: [
    "opacity-0",
    "opacity-100",
    "pointer-events-none",
    "pointer-events-auto",
    "modal-open",
    "bg-black/40",
    "animate-fadeInUp",
    "transition",
    "duration-300"
  ],
  theme: {
    extend: {
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{php,html,js}",
    "./includes/**/*.{php,html,js}",
    "./forms/**/*.{php,html,js}",
  ],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
    },
  },
  plugins: [],
}
