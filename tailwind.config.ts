import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1E2A4A",
          50: "#EEF1F7",
          100: "#D7DDEC",
          600: "#2A3B63",
          700: "#1E2A4A",
          900: "#141C33",
        },
        gold: {
          DEFAULT: "#C99A3B",
          100: "#F4E7C9",
          600: "#B3852E",
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
