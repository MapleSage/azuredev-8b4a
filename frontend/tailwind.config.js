/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#ffffff",
        foreground: "#1f2937",
        muted: {
          DEFAULT: "#f3f4f6",
          foreground: "#6b7280"
        },
        border: "#e5e7eb",
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff"
        },
        sidebar: {
          DEFAULT: "#f8fafc",
          accent: "#f1f5f9",
          foreground: "#1e293b"
        }
      }
    },
  },
  plugins: [],
}