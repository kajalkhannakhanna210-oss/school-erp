import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#222F57",
          50: "#F1F3F9",
          100: "#DCE2F0",
          600: "#2D3C6B",
          700: "#222F57",
          900: "#17213F",
        },
        gold: {
          DEFAULT: "#F7C200",
          100: "#FFF4C7",
          600: "#B58E00",
        },
        paper: "#FAF9F6",
        slate: {
          DEFAULT: "#2B2E33",
        },
        success: "#3E8E5B",
        danger: "#C4483C",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
