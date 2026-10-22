import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#070709",
        crimson: "#E11D48",
        imperial: "#DC2626",
        volt: "#F59E0B",
        emerald: "#10B981",
        panel: "#121218",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
