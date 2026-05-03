import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      colors: {
        brand: {
          50:  "#fff7ed",
          100: "#ffedd5",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea6c0a",
          700: "#c2570c",
        },
        cream: {
          50:  "#FDFCF8",
          100: "#F8F4EC",
        },
      },
      boxShadow: {
        "card":       "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.10)",
        "float":      "0 4px 16px rgba(249,115,22,0.30), 0 20px 48px rgba(0,0,0,0.28)",
        "gold":       "0 2px 12px rgba(212,168,83,0.30)",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      letterSpacing: {
        "display": "-0.02em",
        "caps": "0.08em",
      },
    },
  },
  plugins: [],
};
export default config;
