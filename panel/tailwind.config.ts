// tailwind.config.js
module.exports = {
    content: [
      './app/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
      './pages/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#F97316', // Orange 500
            hover: '#EA580C',   // Orange 600
          },
          secondary: {
            DEFAULT: '#FDBA74', // Orange 300
          },
          background: '#F9FAFB', // Gray 50
          card: '#FFFFFF',
          border: '#E5E7EB', // Gray 200
          text: {
            primary: '#1F2937', // Gray 800
            muted: '#6B7280',   // Gray 500
          },
          contrast: '#14B8A6', // Teal 500
          alert: {
            DEFAULT: '#DC2626', // Red 600
            bg: '#FEE2E2',      // Red 100
          },
        },
      },
    },
    plugins: [],
  }; 